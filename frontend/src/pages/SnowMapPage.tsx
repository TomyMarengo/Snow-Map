import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

import axios from 'axios';
import L from 'leaflet';
import React, { useEffect, useRef, useState } from 'react';
import {
  FeatureGroup,
  ImageOverlay,
  MapContainer,
  TileLayer,
  useMap,
} from 'react-leaflet';

// Import EditControl dynamically to handle potential loading errors
let EditControl: any = null;
try {
  // Dynamically import react-leaflet-draw
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const drawModule = require('react-leaflet-draw');
  EditControl = drawModule.EditControl;
} catch (error) {
  console.error('Failed to load react-leaflet-draw:', error);
}

// Define interfaces for data types
interface SnowData {
  date: string;
  snow_area_m2: number;
  total_area_m2: number;
  image_id?: string;
  image_url?: string;
}

interface ApiResponse {
  results: SnowData[];
}

// Component to handle map actions
const MapController: React.FC<{
  imageUrl: string | null;
  bounds: L.LatLngBoundsExpression | null;
  onImageLoad: () => void;
}> = ({ imageUrl, bounds, onImageLoad }) => {
  const map = useMap();

  useEffect(() => {
    if (imageUrl && bounds) {
      // Center map on the polygon
      map.fitBounds(bounds);
    }
  }, [imageUrl, bounds, map]);

  return null;
};

const SnowMapPage: React.FC = () => {
  // States
  const [startYear, setStartYear] = useState<number>(2018);
  const [endYear, setEndYear] = useState<number>(2023);
  const [drawnPolygon, setDrawnPolygon] = useState<any>(null);
  const [selectedData, setSelectedData] = useState<SnowData[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [drawingEnabled, setDrawingEnabled] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // States for satellite imagery
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState<boolean>(false);

  // Ref for the map
  const mapRef = useRef<L.Map | null>(null);

  // Fix for the default marker icons
  useEffect(() => {
    // Fix Leaflet icon issues
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
      shadowUrl:
        'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    });
  }, []);

  // Handle polygon drawing
  const handleCreated = (e: any) => {
    const { layerType, layer } = e;
    if (layerType === 'polygon') {
      setDrawnPolygon({
        type: 'polygon',
        latlngs: layer
          .getLatLngs()[0]
          .map((latLng: L.LatLng) => [latLng.lat, latLng.lng]),
        bounds: layer.getBounds(),
      });
      setDrawingEnabled(false);
    }
  };

  // Handle selecting a satellite image
  const handleSelectImage = (imageUrl: string | undefined) => {
    if (!imageUrl) {
      alert('No hay imagen disponible para esta fecha');
      return;
    }

    setImageLoading(true);
    setSelectedImage(imageUrl);
  };

  // Handle image loaded
  const handleImageLoaded = () => {
    setImageLoading(false);
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!drawnPolygon) {
      alert('Please draw a polygon on the map first');
      return;
    }

    setLoading(true);
    setError(null);
    setSelectedImage(null);

    try {
      // Format data for the backend
      const requestData = {
        geometry: {
          type: 'Polygon',
          coordinates: [drawnPolygon.latlngs],
        },
        start_date: `${startYear}-01-01`,
        end_date: `${endYear}-12-31`,
      };

      // Call backend API with full URL since we're not using proxy
      const response = await axios.post<ApiResponse>(
        'http://localhost:5000/snow-data',
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      setSelectedData(response.data.results);
    } catch (err) {
      console.error('Error fetching snow data:', err);
      setError('Failed to fetch snow data. Please try again.');
      // For development/testing, use mock data if backend call fails
      setSelectedData([
        {
          date: '2018-01-15',
          snow_area_m2: 12000,
          total_area_m2: 50000,
          image_url:
            'https://via.placeholder.com/500x500.png?text=Mock+winter+2018-01-15',
        },
        {
          date: '2018-04-15',
          snow_area_m2: 14500,
          total_area_m2: 50000,
          image_url:
            'https://via.placeholder.com/500x500.png?text=Mock+summer+2018-04-15',
        },
        {
          date: '2019-01-15',
          snow_area_m2: 11000,
          total_area_m2: 50000,
          image_url:
            'https://via.placeholder.com/500x500.png?text=Mock+winter+2019-01-15',
        },
        {
          date: '2019-04-15',
          snow_area_m2: 13500,
          total_area_m2: 50000,
          image_url:
            'https://via.placeholder.com/500x500.png?text=Mock+summer+2019-04-15',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Reset drawn polygon
  const handleReset = () => {
    setDrawnPolygon(null);
    setSelectedData(null);
    setError(null);
    setDrawingEnabled(true);
    setSelectedImage(null);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  const years = Array.from({ length: 6 }, (_, i) => 2018 + i);

  // Group results by year for display
  const groupedByYear = selectedData
    ? selectedData.reduce<Record<string, SnowData[]>>((acc, item) => {
        const year = item.date.split('-')[0];
        if (!acc[year]) acc[year] = [];
        acc[year].push(item);
        return acc;
      }, {})
    : {};

  // Get the bounds for the image overlay
  const getImageBounds = (): L.LatLngBoundsExpression | null => {
    if (!drawnPolygon || !drawnPolygon.bounds) return null;
    return drawnPolygon.bounds;
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Análisis de Nieve por Área</h1>
      <p className="mb-4">
        Dibuja un polígono en el mapa y selecciona un rango de años para ver los
        datos de nieve en esa área.
      </p>

      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="w-full md:w-2/3">
          <div
            className={`h-[500px] border border-gray-300 rounded-lg overflow-hidden relative ${selectedImage ? 'satellite-image-active' : ''}`}
          >
            <MapContainer
              center={[-34.6037, -58.3816]} // Buenos Aires
              zoom={10}
              style={{ height: '100%', width: '100%' }}
              ref={mapRef}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <FeatureGroup>
                {EditControl && drawingEnabled && (
                  <EditControl
                    position="topright"
                    onCreated={handleCreated}
                    draw={{
                      rectangle: false,
                      circle: false,
                      circlemarker: false,
                      marker: false,
                      polyline: false,
                    }}
                  />
                )}
              </FeatureGroup>

              {/* Show satellite image if selected */}
              {selectedImage && drawnPolygon && (
                <>
                  <ImageOverlay
                    url={selectedImage}
                    bounds={
                      getImageBounds() || [
                        [-90, -180],
                        [90, 180],
                      ]
                    }
                    opacity={0.7}
                    zIndex={500}
                    eventHandlers={{
                      load: handleImageLoaded,
                    }}
                  />
                  <MapController
                    imageUrl={selectedImage}
                    bounds={getImageBounds()}
                    onImageLoad={handleImageLoaded}
                  />
                </>
              )}
            </MapContainer>

            {/* Image loading overlay */}
            {imageLoading && (
              <div className="image-loading-overlay">
                <div className="bg-white p-3 rounded-lg shadow-md">
                  <div className="flex items-center space-x-2">
                    <svg
                      className="animate-spin h-5 w-5 text-blue-500"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>Cargando imagen satelital...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          {!EditControl && (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 p-2 mt-2 rounded">
              Herramientas de dibujo no disponibles debido a problemas de
              compatibilidad. Por favor, utiliza la opción de coordenadas
              manuales.
            </div>
          )}
          <div className="mt-2 flex gap-2">
            {drawnPolygon && (
              <button
                className="bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded-md text-sm"
                onClick={handleReset}
              >
                Borrar polígono
              </button>
            )}
            {selectedImage && (
              <button
                className="bg-gray-500 hover:bg-gray-600 text-white py-1 px-3 rounded-md text-sm"
                onClick={() => setSelectedImage(null)}
              >
                Ocultar imagen satelital
              </button>
            )}
          </div>
        </div>

        <div className="w-full md:w-1/3 bg-gray-50 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-3">Seleccionar Período</h2>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Año de inicio
            </label>
            <select
              className="w-full p-2 border border-gray-300 rounded-md"
              value={startYear}
              onChange={(e) => setStartYear(parseInt(e.target.value))}
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Año de fin
            </label>
            <select
              className="w-full p-2 border border-gray-300 rounded-md"
              value={endYear}
              onChange={(e) => setEndYear(parseInt(e.target.value))}
            >
              {years.map((year) => (
                <option key={year} value={year} disabled={year < startYear}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <button
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md disabled:bg-gray-400"
            onClick={handleSubmit}
            disabled={!drawnPolygon || loading}
          >
            {loading ? 'Cargando...' : 'Analizar'}
          </button>

          {error && (
            <div className="mt-4 bg-red-100 border border-red-400 text-red-700 p-2 rounded">
              {error}
            </div>
          )}
        </div>
      </div>

      {selectedData && selectedData.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mt-4">
          <h2 className="text-xl font-semibold mb-3">Resultados</h2>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Año
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nieve (m²)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Área Total (m²)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Porcentaje
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Imagen
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.entries(groupedByYear).flatMap(([year, dataItems]) =>
                  dataItems.map((item, index) => (
                    <tr key={`${year}-${item.date}`}>
                      {index === 0 ? (
                        <td
                          className="px-6 py-4 whitespace-nowrap font-medium text-gray-900"
                          rowSpan={dataItems.length}
                        >
                          {year}
                        </td>
                      ) : null}
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                        {formatDate(item.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                        {item.snow_area_m2.toLocaleString()} m²
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                        {item.total_area_m2.toLocaleString()} m²
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                        {(
                          (item.snow_area_m2 / item.total_area_m2) *
                          100
                        ).toFixed(2)}
                        %
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                        {item.image_url ? (
                          <button
                            className="p-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 satellite-image-button"
                            onClick={() => handleSelectImage(item.image_url)}
                            title="Ver imagen satelital"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                          </button>
                        ) : (
                          <span className="text-gray-400">No disponible</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SnowMapPage;
