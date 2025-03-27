import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

import axios from 'axios';
import L from 'leaflet';
import React, { useRef, useState } from 'react';

import DateRangeSelector from '../components/snow-map/DateRangeSelector';
import MapComponent from '../components/snow-map/MapComponent';
import PermanentSnowChart from '../components/snow-map/PermanentSnowChart';
import ResultCarousel from '../components/snow-map/ResultCarousel';
import type {
  ApiResponse,
  PermanentSnowData,
  ResultData,
  SnowData,
} from '../components/snow-map/types';

// Simple ID generator function
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
};

// Component for showing loading skeleton
const ResultSkeleton: React.FC = () => (
  <div className="bg-white border border-gray-200 rounded-lg p-4 mt-4">
    <div className="mb-3">
      <div className="h-6 bg-gray-200 rounded w-1/4 mb-2 animate-pulse"></div>
      <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse"></div>
    </div>

    <div className="mb-4 bg-gray-50 p-3 rounded-md">
      {/* Region name skeleton */}
      <div className="h-7 bg-gray-300 rounded w-1/3 mb-3 animate-pulse"></div>

      <div className="flex justify-between">
        <div className="w-2/3">
          {/* Analysis and Period info skeleton */}
          <div className="h-5 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
          <div className="h-5 bg-gray-200 rounded w-2/3 animate-pulse"></div>
        </div>
        <div className="flex gap-2">
          {/* Navigation buttons skeleton */}
          <div className="h-9 w-9 bg-gray-300 rounded animate-pulse"></div>
          <div className="h-9 w-9 bg-gray-300 rounded animate-pulse"></div>
        </div>
      </div>
    </div>

    <div className="mb-4">
      <div className="h-8 bg-gray-200 rounded w-full mb-4 animate-pulse"></div>
      <div className="h-12 bg-gray-200 rounded w-full mb-2 animate-pulse"></div>
      <div className="h-12 bg-gray-200 rounded w-full mb-2 animate-pulse"></div>
      <div className="h-12 bg-gray-200 rounded w-full animate-pulse"></div>
    </div>

    <div>
      <div className="h-6 bg-gray-200 rounded w-1/4 mb-2 animate-pulse"></div>
      <div className="h-64 bg-gray-200 rounded w-full animate-pulse"></div>
    </div>
  </div>
);

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
    'rgb' | 'snow' | 'ndvi' | null
  >(null);
  const [imageLoading, setImageLoading] = useState<boolean>(false);

  // Ref for the map
  const mapRef = useRef<L.Map | null>(null);

  // States for permanent snow data
  const [permanentSnowData, setPermanentSnowData] = useState<
    PermanentSnowData[]
  >([]);

  // State for saved results
  const [savedResults, setSavedResults] = useState<ResultData[]>([]);
  const [activeResultId, setActiveResultId] = useState<string | null>(null);
  const [pastPolygon, setPastPolygon] = useState<ResultData['polygon'] | null>(
    null
  );

  // State for showing skeleton while loading new analysis
  const [showSkeleton, setShowSkeleton] = useState<boolean>(false);

  // Handle polygon creation
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

      // Only clear satellite images but keep the active result
      // until analysis is completed
      setSelectedImage(null);
      setSelectedImageType(null);
    }
  };

  // Image selection
  const handleSelectImage = (
    imageUrl: string | undefined,
    type: 'rgb' | 'snow' | 'ndvi'
  ) => {
    if (!imageUrl) {
      alert('No hay imagen disponible para esta fecha');
      // Re-enable drawing if there's no image available
      setDrawingEnabled(true);
      return;
    }

    setImageLoading(true);
    setSelectedImage(imageUrl);
    setSelectedImageType(type);
  };

  // On image loaded
  const handleImageLoaded = () => {
    setImageLoading(false);
  };

  // Form submission
  const handleSubmit = async () => {
    if (!drawnPolygon) {
      alert('Por favor, dibuja un polígono en el mapa primero');
      return;
    }

    // Clear previous results
    setSelectedData(null);
    setSelectedImage(null);
    setSelectedImageType(null);

    // Show loading skeleton and clear active result
    setShowSkeleton(true);
    setActiveResultId(null);

    const controller = new AbortController();
    setAbortController(controller);
    setLoading(true);
    setError(null);

    try {
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

      const newData = response.data.results;
      setSelectedData(newData);

      // Add new permanent snow data to the list
      const newPermanentSnowData = {
        ...response.data.permanent_snow,
        timestamp: new Date().toISOString(),
      };
      setPermanentSnowData((prev) => [...prev, newPermanentSnowData]);

      // Save result to carousel
      const newResultId = generateId();
      const newResult: ResultData = {
        id: newResultId,
        timestamp: new Date().toISOString(),
        polygon: { ...drawnPolygon },
        snowData: newData,
        permanentSnowData: newPermanentSnowData,
        dateRange: {
          startYear,
          startMonth,
          endYear,
          endMonth,
        },
      };

      // Add new result at the beginning and set it as active
      setSavedResults((prev) => [newResult, ...prev]);
      setActiveResultId(newResultId);
      setPastPolygon({ ...drawnPolygon });

      // Clear drawn polygon and enable drawing for the next query
      setDrawnPolygon(null);
      setDrawingEnabled(true);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Request cancelled');
        setError('Request cancelled by user');
        setSelectedData(null);
        setDrawingEnabled(true);
      } else {
        console.error('Error fetching snow data:', err);
        const errorMessage =
          err.response?.data?.error ||
          'Error al obtener los datos de nieve. Por favor, intente nuevamente.';
        setError(errorMessage);
        setSelectedData(null);
        setDrawingEnabled(true);
      }
    } finally {
      setLoading(false);
      setAbortController(null);
      setShowSkeleton(false);
    }
  };

  // Cancel request
  const handleCancel = () => {
    if (abortController) {
      abortController.abort();
    }
    // Clear the drawn polygon and re-enable drawing mode when canceling
    setDrawnPolygon(null);
    setDrawingEnabled(true);
  };

  // Handle selecting a past result from the carousel
  const handleSelectResult = (result: ResultData) => {
    // Clear any drawn polygon
    setDrawnPolygon(null);
    setDrawingEnabled(true);

    // Set the selected result
    setActiveResultId(result.id);
    setPastPolygon(result.polygon);
    setSelectedData(result.snowData);

    // Clear any satellite image
    setSelectedImage(null);
    setSelectedImageType(null);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">
        Análisis de Nieve y Vegetación por Área
      </h1>
      <p className="mb-4">
        Dibuja un polígono en el mapa y selecciona un rango de años para ver los
        datos de nieve y vegetación en esa área.
      </p>

      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="w-full md:w-2/3">
          <MapComponent
            drawnPolygon={drawnPolygon}
            selectedImage={selectedImage}
            selectedImageType={selectedImageType}
            imageLoading={imageLoading}
            drawingEnabled={drawingEnabled}
            handleCreated={handleCreated}
            handleImageLoaded={handleImageLoaded}
            setSelectedImage={setSelectedImage}
            pastPolygon={pastPolygon}
            isPastPolygonActive={activeResultId !== null}
            activeResultId={activeResultId}
          />
        </div>

        <DateRangeSelector
          startYear={startYear}
          endYear={endYear}
          startMonth={startMonth}
          endMonth={endMonth}
          setStartYear={setStartYear}
          setEndYear={setEndYear}
          setStartMonth={setStartMonth}
          setEndMonth={setEndMonth}
          drawnPolygon={drawnPolygon}
          loading={loading}
          handleSubmit={handleSubmit}
          handleCancel={handleCancel}
          error={error}
        />
      </div>

      {/* Loading Skeleton */}
      {showSkeleton && <ResultSkeleton />}

      {/* Results Carousel - Shows past results */}
      {!showSkeleton && savedResults.length > 0 && (
        <ResultCarousel
          results={savedResults}
          onSelectResult={handleSelectResult}
          handleSelectImage={handleSelectImage}
          currentResultId={activeResultId}
        />
      )}

      {/* Snow Analysis Chart - Always visible */}
      <PermanentSnowChart permanentSnowData={permanentSnowData} />
    </div>
  );
};

export default SnowMapPage;
