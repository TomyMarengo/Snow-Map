from flask import Flask, request, jsonify
from flask_cors import CORS

import numpy as np
import ssl
import ee
import geemap
from collections import defaultdict

ssl._create_default_https_context = ssl._create_unverified_context

app = Flask(__name__)
CORS(app)

# Inicializar Earth Engine
try:
    ee.Initialize(project='tp-satelites')  # Use the project ID from the original back.py
    print("Earth Engine initialized successfully")
except Exception as e:
    print(f"Error initializing Earth Engine: {e}")
    print("Snow data functionality will not be available")

def calculate_snow_area(image, roi):
    """
    Calculate the snow area and total area within a region of interest.
    
    Args:
        image: Earth Engine Image object
        roi: Earth Engine Geometry object defining the region of interest
        
    Returns:
        Tuple of (snow_area_m2, total_area_m2)
    """
    # Clasificación de nieve usando el índice NDSI
    ndsi = image.normalizedDifference(['B3', 'B11']).rename('NDSI')
    snow = ndsi.gt(0.4)  # Umbral típico para nieve

    # Contar píxeles de nieve
    snow_pixel_count = snow.reduceRegion(
        reducer=ee.Reducer.sum(),
        geometry=roi,
        scale=10
    ).get('NDSI')

    # Contar píxeles totales en el ROI
    total_pixel_count = image.reduceRegion(
        reducer=ee.Reducer.count(),
        geometry=roi,
        scale=10
    ).get('B3')

    if snow_pixel_count and total_pixel_count:
        # Cada píxel mide 10 m x 10 m = 100 m²
        snow_area = snow_pixel_count.getInfo() * 100
        total_area = total_pixel_count.getInfo() * 100
    else:
        snow_area = 0
        total_area = 0

    return snow_area, total_area

@app.route('/snow-data', methods=['POST'])
def get_snow_data():
    try:
        data = request.get_json()
        print(f"Received request data: {data}")

        # Recibir geometría y fechas
        geometry = data.get('geometry')
        start_date = data.get('start_date')
        end_date = data.get('end_date')

        if not geometry or not start_date or not end_date:
            return jsonify({'error': 'Faltan parámetros'}), 400

        # Important: Earth Engine expects coordinates in the format [lon, lat], but frontend sends [lat, lon]
        try:
            # Extract coordinates and swap lat/lon 
            coordinates = geometry.get('coordinates', [])
            
            # Create a properly formatted array for Earth Engine [[[lon, lat], [lon, lat], ...]]
            formatted_coords = []
            for poly in coordinates:
                processed_poly = []
                for point in poly:
                    # Swap the order from [lat, lon] to [lon, lat]
                    processed_poly.append([point[1], point[0]])
                formatted_coords.append(processed_poly)
            
            print(f"Swapped coordinates: {formatted_coords}")
            
            # Create EE Geometry
            roi = ee.Geometry.Polygon(formatted_coords)
            
            # Filtrar colección de imágenes Sentinel-2
            collection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED') \
                .filterBounds(roi) \
                .filterDate(start_date, end_date) \
                .sort('CLOUDY_PIXEL_PERCENTAGE', True)
            
            # Get collection size
            collection_size = collection.size().getInfo()
            print(f"Collection size: {collection_size}")
            
            if collection_size == 0:
                print("No images found for the region and time period")
                return create_mock_snow_data(start_date, end_date)
            
            # Agrupar resultados por fecha (sin la hora)
            images = collection.toList(collection_size)
            grouped_results = defaultdict(lambda: {
                'snow_area_m2': 0, 
                'total_area_m2': 0,
                'image_id': None,
                'image_url': None
            })
            
            # Process each image
            for i in range(collection_size):
                image = ee.Image(images.get(i))
                date = image.date().format().getInfo().split('T')[0]  # Ignorar hora
                
                # Calculate snow area
                snow_area, total_area = calculate_snow_area(image, roi)
                
                # Generate thumbnail URL for the image
                # Using false color composite to highlight snow (B8,B3,B2)
                false_color = image.select(['B8', 'B3', 'B2'])
                
                # Get the image ID
                image_id = image.id().getInfo()
                
                # Create a visualization URL
                visualization_params = {
                    'min': 0,
                    'max': 3000,
                    'bands': 'B8,B3,B2'
                }
                
                try:
                    # Generate thumbnail URL
                    thumbnail_url = image.getThumbURL({
                        'region': roi,
                        'dimensions': '500',
                        'format': 'png',
                        'min': 0,
                        'max': 3000,
                        'bands': 'B8,B3,B2'
                    })
                except Exception as e:
                    print(f"Error generating thumbnail for {date}: {e}")
                    thumbnail_url = None
                
                # Add to results
                grouped_results[date]['snow_area_m2'] += snow_area
                grouped_results[date]['total_area_m2'] += total_area
                
                # Only update the image info if not already set or if better quality image
                if (grouped_results[date]['image_id'] is None or 
                    grouped_results[date]['image_url'] is None):
                    grouped_results[date]['image_id'] = image_id
                    grouped_results[date]['image_url'] = thumbnail_url
            
            # Convertir el diccionario a lista y ordenar por fecha
            results = [{'date': date, **values} for date, values in grouped_results.items()]
            results = sorted(results, key=lambda x: x['date'])
            
            return jsonify({'results': results})
        
        except Exception as e:
            print(f"Error in Earth Engine processing: {e}")
            return create_mock_snow_data(start_date, end_date, with_images=True)
            
    except Exception as e:
        print(f"Unexpected error in endpoint: {e}")
        return jsonify({'error': str(e)}), 500

def create_mock_snow_data(start_date, end_date, with_images=False):
    """Create mock snow data when Earth Engine data is not available"""
    print("Creating mock snow data")
    
    # Extract years from dates
    start_year = int(start_date.split('-')[0])
    end_year = int(end_date.split('-')[0])
    
    # Generate mock data for the specified years
    results = []
    for year in range(start_year, end_year + 1):
        # Create 4 entries per year (simulating quarterly data)
        for month in [1, 4, 7, 10]:
            # Random snow area between 10000 and 20000 square meters
            snow_area = np.random.randint(10000, 20000)
            # Total area always 50000 square meters
            total_area = 50000
            
            # Format date
            date_str = f"{year}-{month:02d}-15"
            
            # Add mock image URL if requested
            image_data = {}
            if with_images:
                # Use placeholder images based on seasons
                season = "winter" if month in [1, 10] else "summer"
                image_data = {
                    "image_id": f"mock-{date_str}",
                    "image_url": f"https://via.placeholder.com/500x500.png?text=Mock+{season}+{date_str}"
                }
            
            results.append({
                "date": date_str,
                "snow_area_m2": int(snow_area),
                "total_area_m2": total_area,
                **image_data
            })
    
    # Sort results by date
    results = sorted(results, key=lambda x: x['date'])
    
    return jsonify({'results': results})

@app.route('/dummy', methods=['GET'])
def dummy():
    return jsonify({"message": "Hello, World!"})

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000, debug=True)