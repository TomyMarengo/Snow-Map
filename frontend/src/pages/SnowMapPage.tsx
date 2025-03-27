import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

import axios from 'axios';
import * as d3 from 'd3';
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
  rgb_url?: string;
  snow_url?: string;
  image_date: string;
}

interface PermanentSnowData {
  area_m2: number;
  min_height_m: number;
  total_area_m2: number;
  timestamp: string;
}

interface ApiResponse {
  results: SnowData[];
  permanent_snow: PermanentSnowData;
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
  const [startMonth, setStartMonth] = useState<number>(1);
  const [endMonth, setEndMonth] = useState<number>(12);
  const [drawnPolygon, setDrawnPolygon] = useState<any>(null);
  const [selectedData, setSelectedData] = useState<SnowData[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [drawingEnabled, setDrawingEnabled] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);

  // States for satellite imagery
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageType, setSelectedImageType] = useState<
    'rgb' | 'snow' | null
  >(null);
  const [imageLoading, setImageLoading] = useState<boolean>(false);

  // Ref for the map
  const mapRef = useRef<L.Map | null>(null);

  // States for permanent snow data
  const [permanentSnowData, setPermanentSnowData] = useState<
    PermanentSnowData[]
  >([]);

  // Refs for charts
  const snowChartRef = useRef<HTMLDivElement | null>(null);

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
  const handleSelectImage = (
    imageUrl: string | undefined,
    type: 'rgb' | 'snow'
  ) => {
    if (!imageUrl) {
      alert('No hay imagen disponible para esta fecha');
      return;
    }

    setImageLoading(true);
    setSelectedImage(imageUrl);
    setSelectedImageType(type);
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

    // Clear previous results and selected image
    setSelectedData(null);
    setSelectedImage(null);
    setSelectedImageType(null);

    // Create new AbortController for this request
    const controller = new AbortController();
    setAbortController(controller);
    setLoading(true);
    setError(null);

    try {
      // Format data for the backend
      const requestData = {
        geometry: {
          type: 'Polygon',
          coordinates: [drawnPolygon.latlngs],
        },
        start_date: `${startYear}-${String(startMonth).padStart(2, '0')}-01`,
        end_date: `${endYear}-${String(endMonth).padStart(2, '0')}-${
          endMonth === 2 ? '28' : '30'
        }`,
      };

      // Call backend API with full URL since we're not using proxy
      const response = await axios.post<ApiResponse>(
        'http://localhost:5000/snow-data',
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        }
      );
      setSelectedData(response.data.results);

      // Add new permanent snow data to the list
      const newPermanentSnowData = {
        ...response.data.permanent_snow,
        timestamp: new Date().toISOString(),
      };
      setPermanentSnowData((prev) => [...prev, newPermanentSnowData]);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Request cancelled');
        setError('Request cancelled by user');
        setSelectedData(null);
      } else {
        console.error('Error fetching snow data:', err);
        const errorMessage =
          err.response?.data?.error ||
          'Error al obtener los datos de nieve. Por favor, intente nuevamente.';
        setError(errorMessage);
        setSelectedData(null);
      }
    } finally {
      setLoading(false);
      setAbortController(null);
    }
  };

  // Handle request cancellation
  const handleCancel = () => {
    if (abortController) {
      abortController.abort();
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

  // Format date for display in table
  const formatDate = (dateString: string) => {
    try {
      // Ensure the date string is in YYYY-MM-DD format
      const [year, month, day] = dateString.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return new Intl.DateTimeFormat('es-AR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(date);
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString; // Return original string if formatting fails
    }
  };

  // Convert m² to km²
  const sqmToSqkm = (valueInSqm: number): number => {
    return valueInSqm / 1000000;
  };

  const years = Array.from({ length: 6 }, (_, i) => 2018 + i);
  const months = [
    { value: 1, label: 'Enero' },
    { value: 2, label: 'Febrero' },
    { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Mayo' },
    { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' },
    { value: 11, label: 'Noviembre' },
    { value: 12, label: 'Diciembre' },
  ];

  // Group results by year for display in the table
  const groupedByYear = selectedData
    ? selectedData.reduce<Record<string, SnowData[]>>((acc, item) => {
        const year = item.image_date.split('-')[0];
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

  // D3 Chart for Snow Area vs Date (only month and year on X-axis)
  useEffect(() => {
    if (!snowChartRef.current) return;

    // Limpiar el div antes de dibujar
    d3.select(snowChartRef.current).selectAll('*').remove();

    // Si no hay datos, no graficar nada
    if (!selectedData || selectedData.length === 0) return;

    // Asegurarse de que la cadena sea 'YYYY-MM-DD'.
    // Ajustar el formato en .timeParse según corresponda a tus datos.
    const parseDate = d3.timeParse('%Y-%m-%d');

    // Convertimos cada registro a { date, snowAreaKm2 }
    // Ojo con fallback: si parseDate no lo reconoce, en lugar de new Date(), usa algo que te alerte
    const chartData = selectedData.map((d) => {
      const parsed = parseDate(d.image_date);
      if (!parsed) {
        console.warn('No se pudo parsear la fecha:', d.image_date);
        // Puedes evitar hacer fallback a 'new Date()' para no arruinar el dominio.
        // Retorna null y luego filtra más abajo, o maneja como gustes.
      }
      return {
        date: parsed, // null si falló
        snowAreaKm2: sqmToSqkm(d.snow_area_m2),
      };
    });

    // Filtrar posibles nulos si hay fechas mal parseadas
    const filteredData = chartData.filter((d) => d.date !== null) as {
      date: Date;
      snowAreaKm2: number;
    }[];

    // Ordenar datos por fecha ascendente
    filteredData.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Dimensiones
    const margin = { top: 20, right: 30, bottom: 50, left: 60 };
    const width = snowChartRef.current.clientWidth - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    // Crear SVG
    const svg = d3
      .select(snowChartRef.current)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Escalas
    const xDomain = d3.extent(filteredData, (d) => d.date) as [Date, Date];
    const yMax = d3.max(filteredData, (d) => d.snowAreaKm2) ?? 0;

    const xScale = d3.scaleTime().domain(xDomain).range([0, width]);
    const yScale = d3.scaleLinear().domain([0, yMax]).nice().range([height, 0]);

    // Para mostrar **solo** los meses con datos, recopilamos las fechas únicas:
    const uniqueDates = Array.from(
      new Set(filteredData.map((d) => +d.date)) // +d.date => timestamp
    ).map((ts) => new Date(ts));

    // Eje X con .tickValues
    const xAxis = d3
      .axisBottom<Date>(xScale)
      .tickValues(uniqueDates) // <-- solo dibuja ticks en esas fechas
      .tickFormat(d3.timeFormat('%b %Y')); // Ej: "Jan 2019"

    // Eje Y estándar
    const yAxis = d3.axisLeft(yScale);

    // Dibujar ejes
    svg
      .append('g')
      .attr('transform', `translate(0, ${height})`)
      .call(xAxis)
      .selectAll('text')
      .style('text-anchor', 'end')
      .attr('dx', '-0.5em')
      .attr('dy', '0.15em')
      .attr('transform', 'rotate(-30)');

    svg.append('g').call(yAxis);

    // Generador de línea
    const line = d3
      .line<{ date: Date; snowAreaKm2: number }>()
      .x((d) => xScale(d.date))
      .y((d) => yScale(d.snowAreaKm2))
      .curve(d3.curveMonotoneX);

    // Dibujar la línea
    svg
      .append('path')
      .datum(filteredData)
      .attr('fill', 'none')
      .attr('stroke', 'steelblue')
      .attr('stroke-width', 2)
      .attr('d', line);

    // Dibujar los puntos
    svg
      .selectAll('circle')
      .data(filteredData)
      .enter()
      .append('circle')
      .attr('cx', (d) => xScale(d.date))
      .attr('cy', (d) => yScale(d.snowAreaKm2))
      .attr('r', 4)
      .attr('fill', 'steelblue');

    // Etiquetas de ejes
    svg
      .append('text')
      .attr('transform', `translate(${width / 2}, ${height + 40})`)
      .style('text-anchor', 'middle')
      .text('Fecha (Mes/Año)');

    svg
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -margin.left + 15)
      .attr('x', -(height / 2))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .text('Área total nevada (km²)');
  }, [selectedData]);

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
            className={`h-[500px] border border-gray-300 rounded-lg overflow-hidden relative ${
              selectedImage ? 'satellite-image-active' : ''
            }`}
          >
            <MapContainer
              center={[-41.27, -71.32]}
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
                    opacity={selectedImageType === 'snow' ? 0.8 : 0.7}
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
            {drawnPolygon && !loading && (
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
              Mes de inicio
            </label>
            <select
              className="w-full p-2 border border-gray-300 rounded-md"
              value={startMonth}
              onChange={(e) => setStartMonth(parseInt(e.target.value))}
            >
              {months.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
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
                <option
                  key={year}
                  value={year}
                  disabled={
                    year < startYear ||
                    (year === startYear && endMonth < startMonth)
                  }
                >
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mes de fin
            </label>
            <select
              className="w-full p-2 border border-gray-300 rounded-md"
              value={endMonth}
              onChange={(e) => setEndMonth(parseInt(e.target.value))}
            >
              {months.map((month) => (
                <option
                  key={month.value}
                  value={month.value}
                  disabled={endYear === startYear && month.value < startMonth}
                >
                  {month.label}
                </option>
              ))}
            </select>
          </div>

          <button
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md disabled:bg-gray-400"
            onClick={loading ? handleCancel : handleSubmit}
            disabled={!drawnPolygon}
          >
            {loading ? 'Cancelar' : 'Analizar'}
          </button>

          {error && (
            <div className="mt-4 bg-red-100 border border-red-400 text-red-700 p-2 rounded">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* TABLE OF RESULTS */}
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
                    Nieve (km²)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Área Total (km²)
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
                    <tr key={`${year}-${item.image_date}`}>
                      {index === 0 ? (
                        <td
                          className="px-6 py-4 whitespace-nowrap font-medium text-gray-900"
                          rowSpan={dataItems.length}
                        >
                          {year}
                        </td>
                      ) : null}
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                        {formatDate(item.image_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                        {sqmToSqkm(item.snow_area_m2).toFixed(3)} km²
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                        {sqmToSqkm(item.total_area_m2).toFixed(3)} km²
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                        {(
                          (item.snow_area_m2 / item.total_area_m2) *
                          100
                        ).toFixed(2)}
                        %
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                        {item.rgb_url || item.snow_url ? (
                          <div className="flex gap-2">
                            {item.rgb_url && (
                              <button
                                className="p-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 satellite-image-button"
                                onClick={() =>
                                  handleSelectImage(item.rgb_url, 'rgb')
                                }
                                title="Ver imagen RGB"
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
                            )}
                            {item.snow_url && (
                              <button
                                className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200 satellite-image-button"
                                onClick={() =>
                                  handleSelectImage(item.snow_url, 'snow')
                                }
                                title="Ver máscara de nieve"
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
                                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                                  />
                                </svg>
                              </button>
                            )}
                          </div>
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

      {/* NEW CHART FOR TOTAL SNOW AREA VS DATE */}
      {selectedData && selectedData.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mt-4">
          <h3 className="text-lg font-semibold mb-3">
            Evolución del Área Nevada (km²) en el Tiempo
          </h3>
          <div
            ref={snowChartRef}
            className="w-full h-[300px] border border-gray-200 rounded-lg p-2"
          ></div>
        </div>
      )}

      {/* Permanent Snow Chart - Always visible */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mt-4">
        <h3 className="text-lg font-semibold mb-3">
          Relación entre Altura Mínima y Área de Nieve Permanente
        </h3>
        <div
          ref={(el) => {
            if (el) {
              // Clear previous chart if any
              d3.select(el).selectAll('*').remove();

              // Set dimensions and margins
              const margin = { top: 20, right: 30, bottom: 50, left: 60 };
              const width = el.clientWidth - margin.left - margin.right;
              const height = 300 - margin.top - margin.bottom;

              // Create SVG
              const svg = d3
                .select(el)
                .append('svg')
                .attr('width', width + margin.left + margin.right)
                .attr('height', height + margin.top + margin.bottom)
                .append('g')
                .attr('transform', `translate(${margin.left},${margin.top})`);

              if (permanentSnowData.length > 0) {
                // Format data for the chart
                const chartData = permanentSnowData.map((item) => ({
                  area: sqmToSqkm(item.area_m2),
                  minHeight: item.min_height_m,
                  totalArea: sqmToSqkm(item.total_area_m2),
                }));

                // Sort data by minimum height
                chartData.sort((a, b) => a.minHeight - b.minHeight);

                // Create scales
                const xScale = d3
                  .scaleLinear()
                  .domain([
                    0,
                    (d3.max(chartData, (d) => d.minHeight) as number) * 1.1,
                  ])
                  .range([0, width]);

                const yScale = d3
                  .scaleLinear()
                  .domain([
                    0,
                    (d3.max(chartData, (d) => d.totalArea) as number) * 1.1,
                  ])
                  .range([height, 0]);

                // Create line
                const line = d3
                  .line<{ minHeight: number; totalArea: number }>()
                  .x((d) => xScale(d.minHeight))
                  .y((d) => yScale(d.totalArea))
                  .curve(d3.curveMonotoneX);

                // Create axes
                const xAxis = d3.axisBottom(xScale);
                const yAxis = d3.axisLeft(yScale);

                // Add X axis
                svg
                  .append('g')
                  .attr('transform', `translate(0,${height})`)
                  .call(xAxis);

                // Add Y axis
                svg.append('g').call(yAxis);

                // Add line path
                svg
                  .append('path')
                  .datum(chartData)
                  .attr('fill', 'none')
                  .attr('stroke', 'steelblue')
                  .attr('stroke-width', 2)
                  .attr('d', line);

                // Add dots for data points
                svg
                  .selectAll('circle')
                  .data(chartData)
                  .enter()
                  .append('circle')
                  .attr('cx', (d) => xScale(d.minHeight))
                  .attr('cy', (d) => yScale(d.totalArea))
                  .attr('r', 5)
                  .attr('fill', 'steelblue');

                // Add axis labels
                svg
                  .append('text')
                  .attr(
                    'transform',
                    `translate(${width / 2}, ${height + margin.bottom - 5})`
                  )
                  .style('text-anchor', 'middle')
                  .text('Altura Mínima (m)');

                svg
                  .append('text')
                  .attr('transform', 'rotate(-90)')
                  .attr('y', -margin.left + 15)
                  .attr('x', -(height / 2))
                  .attr('dy', '1em')
                  .style('text-anchor', 'middle')
                  .text('Área Total de Nieve Permanente (km²)');
              } else {
                // Add message when no data is available
                svg
                  .append('text')
                  .attr('x', width / 2)
                  .attr('y', height / 2)
                  .attr('text-anchor', 'middle')
                  .text(
                    'Dibuja un polígono y analiza para ver los datos de nieve permanente'
                  );
              }
            }
          }}
          className="w-full h-[300px] border border-gray-200 rounded-lg p-2"
        ></div>
      </div>
    </div>
  );
};

export default SnowMapPage;
