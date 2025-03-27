import * as d3 from 'd3';
import React, { useEffect, useRef } from 'react';

import { SnowData, sqmToSqkm } from './types';

interface SnowAreaChartProps {
  selectedData: SnowData[] | null;
}

const SnowAreaChart: React.FC<SnowAreaChartProps> = ({ selectedData }) => {
  const chartRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    d3.select(chartRef.current).selectAll('*').remove();

    if (!selectedData || selectedData.length === 0) return;

    const parseDate = d3.timeParse('%Y-%m-%d');
    const chartData = selectedData.map((d) => {
      const parsed = parseDate(d.image_date);
      if (!parsed) {
        console.warn('Could not parse date:', d.image_date);
      }
      return {
        date: parsed,
        snowAreaKm2: sqmToSqkm(d.snow_area_m2),
      };
    });

    const filteredData = chartData.filter((d) => d.date !== null) as {
      date: Date;
      snowAreaKm2: number;
    }[];

    filteredData.sort((a, b) => a.date.getTime() - b.date.getTime());

    const margin = { top: 20, right: 30, bottom: 50, left: 60 };
    const width = chartRef.current.clientWidth - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const svg = d3
      .select(chartRef.current)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const xDomain = d3.extent(filteredData, (d) => d.date) as [Date, Date];
    const yMax = d3.max(filteredData, (d) => d.snowAreaKm2) ?? 0;

    const xScale = d3.scaleTime().domain(xDomain).range([0, width]);
    const yScale = d3.scaleLinear().domain([0, yMax]).nice().range([height, 0]);

    const uniqueDates = Array.from(
      new Set(filteredData.map((d) => +d.date))
    ).map((ts) => new Date(ts));

    const xAxis = d3
      .axisBottom<Date>(xScale)
      .tickValues(uniqueDates)
      .tickFormat(d3.timeFormat('%b %Y'));

    const yAxis = d3.axisLeft(yScale);

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

    const line = d3
      .line<{ date: Date; snowAreaKm2: number }>()
      .x((d) => xScale(d.date))
      .y((d) => yScale(d.snowAreaKm2))
      .curve(d3.curveMonotoneX);

    svg
      .append('path')
      .datum(filteredData)
      .attr('fill', 'none')
      .attr('stroke', 'steelblue')
      .attr('stroke-width', 2)
      .attr('d', line);

    svg
      .selectAll('circle')
      .data(filteredData)
      .enter()
      .append('circle')
      .attr('cx', (d) => xScale(d.date))
      .attr('cy', (d) => yScale(d.snowAreaKm2))
      .attr('r', 4)
      .attr('fill', 'steelblue');

    // Axis labels
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

  if (!selectedData || selectedData.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mt-4">
      <h3 className="text-lg font-semibold mb-3">
        Evolución del Área Nevada (km²) en el Tiempo
      </h3>
      <div
        ref={chartRef}
        className="w-full h-[300px] border border-gray-200 rounded-lg p-2"
      ></div>
    </div>
  );
};

export default SnowAreaChart;
