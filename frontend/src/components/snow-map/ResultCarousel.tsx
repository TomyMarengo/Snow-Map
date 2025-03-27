import React, { useEffect, useState } from 'react';

import SnowAreaChart from './SnowAreaChart';
import SnowDataTable from './SnowDataTable';
import { ResultData } from './types';

interface ResultCarouselProps {
  results: ResultData[];
  onSelectResult: (result: ResultData) => void;
  handleSelectImage: (
    imageUrl: string | undefined,
    type: 'rgb' | 'snow'
  ) => void;
  currentResultId: string | null;
}

const ResultCarousel: React.FC<ResultCarouselProps> = ({
  results,
  onSelectResult,
  handleSelectImage,
  currentResultId,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Reset to show the newest result when results array changes or a new result is added
  useEffect(() => {
    if (results.length > 0) {
      // Find the index of the current result if it exists
      if (currentResultId) {
        const index = results.findIndex((r) => r.id === currentResultId);
        if (index !== -1) {
          setCurrentIndex(index);
        } else {
          // Default to the first (newest) result if current one isn't found
          setCurrentIndex(0);
        }
      } else {
        // Show newest result (first in array) when there's no active result
        setCurrentIndex(0);
      }
    }
  }, [results.length, currentResultId]);

  if (results.length === 0) {
    return null;
  }

  const goToPrevious = () => {
    const newIndex = currentIndex === 0 ? results.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
    onSelectResult(results[newIndex]);
  };

  const goToNext = () => {
    const newIndex = currentIndex === results.length - 1 ? 0 : currentIndex + 1;
    setCurrentIndex(newIndex);
    onSelectResult(results[newIndex]);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('es-AR');
  };

  const formatDateRange = (dateRange: ResultData['dateRange']) => {
    const startMonthName = new Intl.DateTimeFormat('es-AR', {
      month: 'long',
    }).format(new Date(dateRange.startYear, dateRange.startMonth - 1));
    const endMonthName = new Intl.DateTimeFormat('es-AR', {
      month: 'long',
    }).format(new Date(dateRange.endYear, dateRange.endMonth - 1));

    return `${startMonthName} ${dateRange.startYear} - ${endMonthName} ${dateRange.endYear}`;
  };

  const currentResult = results[currentIndex];

  // Get the region name from the permanent snow data
  const regionName =
    currentResult.permanentSnowData.region_name || 'Región Desconocida';

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mt-4">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xl font-semibold">Resultados Guardados</h2>
        <div className="text-gray-600">
          {currentIndex + 1} de {results.length}
        </div>
      </div>

      <div className="mb-4 bg-gray-50 p-3 rounded-md">
        {/* Region name is now the main title */}
        <h3 className="text-lg font-bold text-gray-800 mb-2">{regionName}</h3>

        <div className="flex justify-between items-start">
          <div>
            <div className="text-sm text-gray-600 mb-1">
              <span className="font-medium">Análisis:</span>{' '}
              {formatTimestamp(currentResult.timestamp)}
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-medium">Período:</span>{' '}
              {formatDateRange(currentResult.dateRange)}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={goToPrevious}
              className="p-2 bg-gray-200 hover:bg-gray-300 rounded"
              aria-label="Anterior resultado"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <button
              onClick={goToNext}
              className="p-2 bg-gray-200 hover:bg-gray-300 rounded"
              aria-label="Siguiente resultado"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="result-content">
        <SnowDataTable
          selectedData={currentResult.snowData}
          handleSelectImage={handleSelectImage}
        />
        <SnowAreaChart selectedData={currentResult.snowData} />
      </div>
    </div>
  );
};

export default ResultCarousel;
