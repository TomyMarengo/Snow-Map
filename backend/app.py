from flask import Flask, request, jsonify
from flask_cors import CORS

import ssl
import ee
import geemap
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
    Calcula el área nevada (en m²) y el área total (en m²) para la geometría dada.
    Utiliza NDSI (normalizado con B3 y B11) con un umbral de 0.4 para determinar si hay nieve.
    """
    # Índice de nieve
    ndsi = image.normalizedDifference(['B3', 'B11']).rename('NDSI')
    snow = ndsi.gt(0.4)  # Umbral típico para nieve

    # Contar píxeles nevados
    snow_pixel_count = snow.reduceRegion(
        reducer=ee.Reducer.sum(),
        geometry=roi,
        scale=10,
        bestEffort=False,
        maxPixels=1e13
    ).get('NDSI')

    # Contar píxeles totales en base a una banda (p. ej. B3)
    total_pixel_count = image.select(['B3']).reduceRegion(
        reducer=ee.Reducer.count(),
        geometry=roi,
        scale=10,
        bestEffort=False,
        maxPixels=1e13
    ).get('B3')

    # Convertir a valores locales (getInfo())
    if snow_pixel_count and total_pixel_count:
        # Cada píxel es de 10m x 10m = 100m²
        snow_area = snow_pixel_count.getInfo() * 100
        total_area = total_pixel_count.getInfo() * 100
    else:
        snow_area = 0.0
        total_area = 0.0

    return snow_area, total_area


def calculate_permanent_snow(image, roi):
    """
    Calcula el área de nieve permanente (en m²) y la altura mínima para la geometría dada.
    Utiliza NDSI (normalizado con B3 y B11) con un umbral de 0.4 para determinar si hay nieve.
    """
    # Índice de nieve
    ndsi = image.normalizedDifference(['B3', 'B11']).rename('NDSI')
    snow = ndsi.gt(0.4)  # Umbral típico para nieve

    # Contar píxeles nevados
    snow_pixel_count = snow.reduceRegion(
        reducer=ee.Reducer.sum(),
        geometry=roi,
        scale=10,
        bestEffort=False,
        maxPixels=1e13
    ).get('NDSI')

    # Obtener la altura mínima de los píxeles nevados
    # Usamos la banda de elevación de SRTM
    elevation = ee.Image('USGS/SRTMGL1_003')
    snow_elevation = elevation.updateMask(snow)
    min_elevation = snow_elevation.reduceRegion(
        reducer=ee.Reducer.min(),
        geometry=roi,
        scale=10,
        bestEffort=False,
        maxPixels=1e13
    ).get('elevation')

    # Convertir a valores locales (getInfo())
    snow_pixel_count_info = snow_pixel_count.getInfo()
    min_elevation_info = min_elevation.getInfo()

    # Si no hay píxeles nevados o no se pudo obtener la elevación, retornar 0
    if snow_pixel_count_info is None or min_elevation_info is None:
        return 0.0, 0.0

    # Cada píxel es de 10m x 10m = 100m²
    snow_area = snow_pixel_count_info * 100
    min_height = min_elevation_info

    return snow_area, min_height


@app.route('/snow-data', methods=['POST'])
def get_snow_data():
    """
    Endpoint: POST /snow-data
    Espera:
        {
            "geometry": {
                "type": "Polygon",
                "coordinates": [ [ [lat, lon], [lat, lon], ... ] ]  
            },
            "start_date": "YYYY-MM-DD",
            "end_date": "YYYY-MM-DD"
        }
    Devuelve:
        {
            "results": [
                {
                    "month": "YYYY-MM",
                    "image_date": "YYYY-MM-DD",
                    "image_id": "COPERNICUS/S2_SR_HARMONIZED/....",
                    "snow_area_m2": ...,
                    "total_area_m2": ...,
                    "rgb_url": "...",
                    "snow_url": "..."
                },
                ...
            ],
            "permanent_snow": {
                "area_m2": ...,
                "min_height_m": ...,
                "total_area_m2": ...
            }
        }
    """
    try:
        data = request.get_json()
        print(f"Received request data: {data}")

        # Recibir geometría y fechas
        geometry = data.get('geometry')
        start_date = data.get('start_date')
        end_date = data.get('end_date')

        if not geometry or not start_date or not end_date:
            return jsonify({'error': 'Faltan parámetros'}), 400

        # Intercambiar lat/lon a lon/lat para Earth Engine
        coordinates = geometry.get('coordinates', [])
        formatted_coords = []
        for poly in coordinates:
            processed_poly = []
            for point in poly:
                # [lat, lon] -> [lon, lat]
                processed_poly.append([point[1], point[0]])
            formatted_coords.append(processed_poly)

        roi = ee.Geometry.Polygon(formatted_coords)

        # Calcular área total del polígono
        total_area = roi.area().getInfo()

        # Filtrar colección de imágenes Sentinel-2
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
            return jsonify({'error': 'No se encontraron imágenes para la región y período seleccionado'}), 404

        # Añadir propiedad 'month' = YYYY-MM a cada imagen
        collection_with_month = collection.map(
            lambda img: img.set('month', img.date().format('YYYY-MM'))
        )

        # Obtener la lista de meses distintos (como objetos de Python)
        distinct_months = collection_with_month.aggregate_array('month').distinct().sort().getInfo()
        print(f"Distinct months found: {distinct_months}")

        results = []
        permanent_snow_area = 0
        min_snow_height = float('inf')
        max_snow_area = 0  # Track maximum snow area observed

        # Para cada mes en la lista, tomamos la PRIMERA imagen (que estará menos nublada, por .sort anterior)
        for month in distinct_months:
            # Filtrar por ese mes
            monthly_col = collection_with_month.filterMetadata('month', 'equals', month)
            if monthly_col.size().getInfo() == 0:
                continue

            # Tomar la primera imagen (menor nubosidad)
            best_img = ee.Image(monthly_col.first())

            # Calcular nieve y área total
            snow_area, total_area = calculate_snow_area(best_img, roi)

            # Update maximum snow area if current snow area is larger
            max_snow_area = max(max_snow_area, snow_area)

            # Calcular nieve permanente y altura mínima
            perm_snow_area, min_height = calculate_permanent_snow(best_img, roi)
            permanent_snow_area = max(permanent_snow_area, perm_snow_area)
            if min_height > 0:
                min_snow_height = min(min_snow_height, min_height)

            # Obtener fecha real de esa "imagen ganadora"
            image_date = best_img.date().format('YYYY-MM-DD').getInfo()
            image_id = best_img.id().getInfo()

            # Generar URLs de miniatura
            try:
                # Get the bounding box of the ROI
                roi_bounds = roi.bounds()
                
                # RGB
                # Create a clipped version of the image that only shows the ROI
                clipped_rgb = best_img.clip(roi)
                rgb_url = clipped_rgb.getThumbURL({
                    'region': roi_bounds,
                    'dimensions': '500',
                    'format': 'png',
                    'min': 0,
                    'max': 3000,
                    'bands': 'B4,B3,B2'
                })

                # Máscara de nieve
                ndsi = best_img.normalizedDifference(['B3', 'B11']).rename('NDSI')
                snow_mask = ndsi.gt(0.4)
                # Create a clipped version that combines snow detection with ROI
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

        # Si no se encontró nieve permanente, establecer altura mínima a 0
        if min_snow_height == float('inf'):
            min_snow_height = 0

        return jsonify({
            'results': results,
            'permanent_snow': {
                'area_m2': permanent_snow_area,
                'min_height_m': min_snow_height,
                'total_area_m2': max_snow_area  # Use maximum snow area instead of polygon area
            }
        })

    except Exception as e:
        print(f"Unexpected error: {e}")
        return jsonify({'error': 'Error interno del servidor'}), 500


@app.route('/dummy', methods=['GET'])
def dummy():
    return jsonify({"message": "Hello, World!"})


if __name__ == '__main__':
    # Ajusta el host/puerto según tu entorno
    app.run(host="0.0.0.0", port=5000, debug=True)