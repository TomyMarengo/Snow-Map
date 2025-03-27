import React from 'react';

import { formatDate, SnowData, sqmToSqkm } from './types';

interface SnowDataTableProps {
  selectedData: SnowData[] | null;
  handleSelectImage: (
    imageUrl: string | undefined,
    type: 'rgb' | 'snow'
  ) => void;
}

const SnowDataTable: React.FC<SnowDataTableProps> = ({
  selectedData,
  handleSelectImage,
}) => {
  if (!selectedData || selectedData.length === 0) {
    return null;
  }

  // Group results by year for display
  const groupedByYear = selectedData
    ? selectedData.reduce<Record<string, SnowData[]>>((acc, item) => {
        const year = item.image_date.split('-')[0];
        if (!acc[year]) acc[year] = [];
        acc[year].push(item);
        return acc;
      }, {})
    : {};

  return (
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
                    {((item.snow_area_m2 / item.total_area_m2) * 100).toFixed(
                      2
                    )}
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
  );
};

export default SnowDataTable;
