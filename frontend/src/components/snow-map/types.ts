// Interfaces for snow data
export interface SnowData {
  date: string;
  snow_area_m2: number;
  total_area_m2: number;
  image_id?: string;
  rgb_url?: string;
  snow_url?: string;
  image_date: string;
}

export interface PermanentSnowData {
  area_m2: number;
  min_height_m: number;
  total_area_m2: number;
  timestamp: string;
  region_name?: string;
}

export interface ApiResponse {
  results: SnowData[];
  permanent_snow: PermanentSnowData;
}

// Store past polygon results
export interface ResultData {
  id: string;
  timestamp: string;
  polygon: {
    type: string;
    latlngs: [number, number][];
    bounds: L.LatLngBounds;
  };
  snowData: SnowData[];
  permanentSnowData: PermanentSnowData;
  dateRange: {
    startYear: number;
    startMonth: number;
    endYear: number;
    endMonth: number;
  };
}

// Utility functions
export const sqmToSqkm = (valueInSqm: number): number => {
  return valueInSqm / 1_000_000;
};

export const formatDate = (dateString: string): string => {
  try {
    const [year, month, day] = dateString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return new Intl.DateTimeFormat('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
};
