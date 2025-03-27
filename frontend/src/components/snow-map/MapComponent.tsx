import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

import L from 'leaflet';
import React, { useEffect, useRef } from 'react';
import {
  FeatureGroup,
  ImageOverlay,
  MapContainer,
  Polygon,
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

// Component to handle map actions
const MapController: React.FC<{
  imageUrl: string | null;
  bounds: L.LatLngBoundsExpression | null;
  onImageLoad: () => void;
  shouldCenter: boolean;
  polygonId: string | null;
}> = ({ imageUrl, bounds, onImageLoad, shouldCenter, polygonId }) => {
  const map = useMap();

  useEffect(() => {
    if (bounds && shouldCenter) {
      map.fitBounds(bounds as L.LatLngBoundsLiteral, {
        animate: true,
        duration: 0.5,
      });
    }
  }, [bounds, map, shouldCenter, polygonId]);

  return null;
};

interface MapComponentProps {
  drawnPolygon: any;
  selectedImage: string | null;
  selectedImageType: 'rgb' | 'snow' | 'ndvi' | null;
  imageLoading: boolean;
  drawingEnabled: boolean;
  handleCreated: (e: any) => void;
  handleImageLoaded: () => void;
  setSelectedImage: (image: string | null) => void;
  pastPolygon: {
    type: string;
    latlngs: [number, number][];
    bounds: L.LatLngBounds;
  } | null;
  isPastPolygonActive: boolean;
  activeResultId: string | null;
}

const MapComponent: React.FC<MapComponentProps> = ({
  drawnPolygon,
  selectedImage,
  selectedImageType,
  imageLoading,
  drawingEnabled,
  handleCreated,
  handleImageLoaded,
  setSelectedImage,
  pastPolygon,
  isPastPolygonActive,
  activeResultId,
}) => {
  const mapRef = useRef<L.Map | null>(null);

  // Fix Leaflet marker icons
  useEffect(() => {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
      shadowUrl:
        'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    });
  }, []);

  // For the overlay
  const getImageBounds = (): L.LatLngBoundsExpression | null => {
    if (drawnPolygon && drawnPolygon.bounds) {
      return drawnPolygon.bounds;
    }
    if (pastPolygon && pastPolygon.bounds) {
      return pastPolygon.bounds;
    }
    return null;
  };

  // Get the currently active polygon
  const getActivePolygon = () => {
    // If there's an active past polygon, prioritize it
    if (isPastPolygonActive && pastPolygon) {
      return pastPolygon;
    }
    // Only use the drawn polygon if no past polygon is active
    if (drawnPolygon) {
      return drawnPolygon;
    }
    return null;
  };

  const activePolygon = getActivePolygon();

  // Determine which polygon should receive the satellite image
  const shouldShowImageOverlay = () => {
    if (!selectedImage) return false;

    // If we have a drawn polygon, it's the active one
    if (drawnPolygon) return true;

    // Otherwise, only show image on past polygon if it's active
    return isPastPolygonActive && pastPolygon !== null;
  };

  return (
    <>
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

          {/* Show the drawn polygon */}
          {drawnPolygon && (
            <Polygon
              positions={drawnPolygon.latlngs}
              pathOptions={{
                color: isPastPolygonActive ? 'gray' : 'blue',
                weight: 3,
                fillOpacity: isPastPolygonActive ? 0.2 : 0.3,
              }}
            />
          )}

          {/* Show past polygon if active */}
          {isPastPolygonActive && pastPolygon && (
            <Polygon
              positions={pastPolygon.latlngs}
              pathOptions={{ color: 'green', weight: 3 }}
            />
          )}

          {/* Show satellite image if selected */}
          {shouldShowImageOverlay() && activePolygon && selectedImage && (
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
                shouldCenter={isPastPolygonActive}
                polygonId={activeResultId}
              />
            </>
          )}

          {/* Add a map controller specifically for polygon centering */}
          {isPastPolygonActive && pastPolygon && (
            <MapController
              imageUrl={null}
              bounds={pastPolygon.bounds}
              onImageLoad={() => {
                /* Empty function intentionally */
              }}
              shouldCenter={true}
              polygonId={activeResultId}
            />
          )}
        </MapContainer>

        {/* Loading overlay */}
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
          Herramientas de dibujo no disponibles por compatibilidad.
        </div>
      )}
      <div className="mt-2 flex gap-2">
        {selectedImage && (
          <button
            className="bg-gray-500 hover:bg-gray-600 text-white py-1 px-3 rounded-md text-sm"
            onClick={() => setSelectedImage(null)}
          >
            Ocultar imagen satelital
          </button>
        )}
      </div>
    </>
  );
};

export default MapComponent;
