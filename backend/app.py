from flask import Flask, request, jsonify
from flask_cors import CORS

import ssl
import ee
import geemap
import requests  # For making HTTP calls to Nominatim
from collections import defaultdict

ssl._create_default_https_context = ssl._create_unverified_context

app = Flask(__name__)
CORS(app)

# Initialize Earth Engine
try:
    ee.Authenticate()
    ee.Initialize(project='tp-satelites')
    print("Earth Engine initialized successfully")
except Exception as e:
    print(f"Error initializing Earth Engine: {e}")
    print("Snow data functionality will not be available")


def calculate_snow_area(image, roi):
    """
    Calculates snow area (in m²) and total area (in m²) within the given geometry.
    Uses NDSI (normalized with B3 and B11) with a threshold of 0.4 to determine snow presence.
    """
    ndsi = image.normalizedDifference(['B3', 'B11']).rename('NDSI')
    snow = ndsi.gt(0.4)  # typical threshold for snow

    snow_pixel_count = snow.reduceRegion(
        reducer=ee.Reducer.sum(),
        geometry=roi,
        scale=10,
        bestEffort=False,
        maxPixels=1e13
    ).get('NDSI')

    total_pixel_count = image.select(['B3']).reduceRegion(
        reducer=ee.Reducer.count(),
        geometry=roi,
        scale=10,
        bestEffort=False,
        maxPixels=1e13
    ).get('B3')

    if snow_pixel_count and total_pixel_count:
        # Each pixel is 10m x 10m = 100m²
        snow_area = snow_pixel_count.getInfo() * 100
        total_area = total_pixel_count.getInfo() * 100
    else:
        snow_area = 0.0
        total_area = 0.0

    return snow_area, total_area


def calculate_permanent_snow(image, roi):
    """
    Calculates the permanent snow area (in m²) and minimum snow-covered height for the given geometry.
    Uses NDSI (normalized with B3 and B11) with a threshold of 0.4 to determine snow presence.
    """
    ndsi = image.normalizedDifference(['B3', 'B11']).rename('NDSI')
    snow = ndsi.gt(0.4)

    snow_pixel_count = snow.reduceRegion(
        reducer=ee.Reducer.sum(),
        geometry=roi,
        scale=10,
        bestEffort=False,
        maxPixels=1e13
    ).get('NDSI')

    # Elevation data
    elevation = ee.Image('USGS/SRTMGL1_003')
    snow_elevation = elevation.updateMask(snow)
    min_elevation = snow_elevation.reduceRegion(
        reducer=ee.Reducer.min(),
        geometry=roi,
        scale=10,
        bestEffort=False,
        maxPixels=1e13
    ).get('elevation')

    snow_pixel_count_info = snow_pixel_count.getInfo()
    min_elevation_info = min_elevation.getInfo()

    if snow_pixel_count_info is None or min_elevation_info is None:
        return 0.0, 0.0

    # Each pixel = 10m x 10m = 100m²
    snow_area = snow_pixel_count_info * 100
    min_height = min_elevation_info

    return snow_area, min_height


def reverse_geocode(lat, lon):
    """
    Calls Nominatim's reverse geocoding to obtain a region name or address.
    This is a free service, but must be used responsibly (rate limits).
    """
    try:
        url = "https://nominatim.openstreetmap.org/reverse"
        params = {
            'lat': lat,
            'lon': lon,
            'format': 'json',
            'zoom': 10,  # zoom controls the detail level; 10 => region/city level
            'addressdetails': 1
        }
        headers = {
            'User-Agent': 'MySnowApp/1.0 (your_email@example.com)'  # Put your contact email
        }
        response = requests.get(url, params=params, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            # Could use 'display_name' or parse 'address' fields
            return data.get('display_name', 'Unknown region')
        else:
            print(f"Error from Nominatim: status code {response.status_code}")
            return "Unknown region"
    except Exception as e:
        print(f"Exception in reverse_geocode: {e}")
        return "Unknown region"


@app.route('/snow-data', methods=['POST'])
def get_snow_data():
    """
    Endpoint: POST /snow-data
    Expects:
        {
            "geometry": {
                "type": "Polygon",
                "coordinates": [ [ [lat, lon], [lat, lon], ... ] ]
            },
            "start_date": "YYYY-MM-DD",
            "end_date": "YYYY-MM-DD"
        }
    Returns:
        {
            "results": [...],
            "permanent_snow": {
                "area_m2": ...,
                "min_height_m": ...,
                "total_area_m2": ...,
                "region_name": ...
            }
        }
    """
    try:
        data = request.get_json()
        print(f"Received request data: {data}")

        geometry = data.get('geometry')
        start_date = data.get('start_date')
        end_date = data.get('end_date')

        if not geometry or not start_date or not end_date:
            return jsonify({'error': 'Missing parameters'}), 400

        # Switch [lat, lon] => [lon, lat] for Earth Engine
        coordinates = geometry.get('coordinates', [])
        formatted_coords = []
        for poly in coordinates:
            processed_poly = []
            for point in poly:
                processed_poly.append([point[1], point[0]])
            formatted_coords.append(processed_poly)

        roi = ee.Geometry.Polygon(formatted_coords)

        # Calculate centroid to do a simple reverse geocoding
        centroid = roi.centroid()
        centroid_coords = centroid.coordinates().getInfo()  # [lon, lat]
        lon_center, lat_center = centroid_coords[0], centroid_coords[1]
        region_name = reverse_geocode(lat_center, lon_center)

        # Filter Sentinel-2 images
        collection = (
            ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
            .filterBounds(roi)
            .filterDate(start_date, end_date)
            .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
            .filter(ee.Filter.contains('.geo', roi))
            .sort('CLOUDY_PIXEL_PERCENTAGE', True)
        )

        collection_size = collection.size().getInfo()
        print(f"Total images in period: {collection_size}")

        if collection_size == 0:
            return jsonify({'error': 'No images found for the region and date range'}), 404

        # Add 'month' property to each image
        collection_with_month = collection.map(
            lambda img: img.set('month', img.date().format('YYYY-MM'))
        )

        distinct_months = collection_with_month.aggregate_array('month').distinct().sort().getInfo()
        print(f"Distinct months found: {distinct_months}")

        results = []
        permanent_snow_area = 0
        min_snow_height = float('inf')
        max_snow_area = 0

        for month in distinct_months:
            monthly_col = collection_with_month.filterMetadata('month', 'equals', month)
            if monthly_col.size().getInfo() == 0:
                continue

            # Take first image with the lowest cloud coverage
            best_img = ee.Image(monthly_col.first())

            # Calculate snow area
            snow_area, total_area = calculate_snow_area(best_img, roi)

            # Track maximum snow area
            max_snow_area = max(max_snow_area, snow_area)

            # Permanent snow
            perm_snow_area, min_height = calculate_permanent_snow(best_img, roi)
            permanent_snow_area = max(permanent_snow_area, perm_snow_area)
            if min_height > 0:
                min_snow_height = min(min_snow_height, min_height)

            # Get actual date from the "best image"
            image_date = best_img.date().format('YYYY-MM-dd').getInfo()
            image_id = best_img.id().getInfo()

            # Generate thumbnail URLs
            try:
                roi_bounds = roi.bounds()
                clipped_rgb = best_img.clip(roi)
                rgb_url = clipped_rgb.getThumbURL({
                    'region': roi_bounds,
                    'dimensions': '500',
                    'format': 'png',
                    'min': 0,
                    'max': 3000,
                    'bands': 'B4,B3,B2'
                })

                ndsi = best_img.normalizedDifference(['B3', 'B11']).rename('NDSI')
                snow_mask = ndsi.gt(0.4)
                clipped_snow = snow_mask.clip(roi)
                snow_vis = ee.Image.cat([
                    clipped_snow.rename('snow'),
                    clipped_snow.rename('alpha')
                ])

                snow_url = snow_vis.getThumbURL({
                    'region': roi_bounds,
                    'dimensions': '500',
                    'format': 'png',
                    'bands': 'snow,alpha,alpha'
                })
            except Exception as e:
                print(f"Error generating thumbnails for {image_date}: {e}")
                rgb_url = None
                snow_url = None

            results.append({
                'month': month,
                'image_date': image_date,
                'image_id': image_id,
                'snow_area_m2': snow_area,
                'total_area_m2': total_area,
                'rgb_url': rgb_url,
                'snow_url': snow_url
            })

        if min_snow_height == float('inf'):
            min_snow_height = 0

        return jsonify({
            'results': results,
            'permanent_snow': {
                'area_m2': permanent_snow_area,
                'min_height_m': min_snow_height,
                'total_area_m2': max_snow_area,  # or total polygon area if you prefer
                'region_name': region_name
            }
        })

    except Exception as e:
        print(f"Unexpected error: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@app.route('/dummy', methods=['GET'])
def dummy():
    return jsonify({"message": "Hello, World!"})


if __name__ == '__main__':
    # Adjust host/port for your environment
    app.run(host="0.0.0.0", port=5000, debug=True)
