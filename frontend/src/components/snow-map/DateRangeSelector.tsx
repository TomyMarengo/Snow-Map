import React from 'react';

interface DateRangeSelectorProps {
  startYear: number;
  endYear: number;
  startMonth: number;
  endMonth: number;
  setStartYear: (year: number) => void;
  setEndYear: (year: number) => void;
  setStartMonth: (month: number) => void;
  setEndMonth: (month: number) => void;
  drawnPolygon: any;
  loading: boolean;
  handleSubmit: () => void;
  handleCancel: () => void;
  error: string | null;
}

const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
  startYear,
  endYear,
  startMonth,
  endMonth,
  setStartYear,
  setEndYear,
  setStartMonth,
  setEndMonth,
  drawnPolygon,
  loading,
  handleSubmit,
  handleCancel,
  error,
}) => {
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

  return (
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
        className={`w-full ${loading ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'} text-white py-2 px-4 rounded-md disabled:bg-gray-400`}
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
  );
};

export default DateRangeSelector;
