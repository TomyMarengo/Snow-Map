import * as d3 from 'd3';
import React, { useEffect, useRef } from 'react';

import { PermanentSnowData, sqmToSqkm } from './types';

interface PermanentSnowChartProps {
  permanentSnowData: PermanentSnowData[];
}

const PermanentSnowChart: React.FC<PermanentSnowChartProps> = ({
  permanentSnowData,
}) => {
  const chartRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    d3.select(chartRef.current).selectAll('*').remove();

    // Dimensiones
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

    if (permanentSnowData.length > 0) {
      // Preparar datos
      const chartData = permanentSnowData.map((item) => ({
        area: sqmToSqkm(item.area_m2),
        minHeight: item.min_height_m,
        totalArea: sqmToSqkm(item.total_area_m2),
        regionName: item.region_name || 'Unknown region',
      }));

      // Ordenar
      chartData.sort((a, b) => a.minHeight - b.minHeight);

      const xScale = d3
        .scaleLinear()
        .domain([0, (d3.max(chartData, (d) => d.minHeight) as number) * 1.1])
        .range([0, width]);

      const yScale = d3
        .scaleLinear()
        .domain([0, (d3.max(chartData, (d) => d.totalArea) as number) * 1.1])
        .range([height, 0]);

      const xAxis = d3.axisBottom(xScale);
      const yAxis = d3.axisLeft(yScale);

      svg.append('g').attr('transform', `translate(0,${height})`).call(xAxis);

      svg.append('g').call(yAxis);

      // Generador de línea
      const line = d3
        .line<{ minHeight: number; totalArea: number }>()
        .x((d) => xScale(d.minHeight))
        .y((d) => yScale(d.totalArea))
        .curve(d3.curveMonotoneX);

      // Dibujar línea
      svg
        .append('path')
        .datum(chartData)
        .attr('fill', 'none')
        .attr('stroke', 'steelblue')
        .attr('stroke-width', 2)
        .attr('d', line);

      // Crear tooltip
      // Al hacerlo hijo directo de chartRef, con position: absolute,
      // se posicionará relativo al contenedor .p-4
      const tooltip = d3
        .select(chartRef.current)
        .append('div')
        .style('position', 'absolute')
        .style('background', '#fff')
        .style('border', '1px solid #ccc')
        .style('padding', '5px 8px')
        .style('border-radius', '4px')
        .style('opacity', 0)
        .style('pointer-events', 'none');

      // Dibujar los puntos
      svg
        .selectAll('circle')
        .data(chartData)
        .enter()
        .append('circle')
        .attr('cx', (d) => xScale(d.minHeight))
        .attr('cy', (d) => yScale(d.totalArea))
        .attr('r', 5)
        .attr('fill', 'steelblue')
        .on('mouseover', function () {
          tooltip.style('opacity', 1);
        })
        .on('mousemove', function (event, d) {
          // Obtener el rect del contenedor
          const containerRect = (
            chartRef.current as HTMLDivElement
          ).getBoundingClientRect();
          // Ajustar coords relativas
          const xPos = event.clientX - containerRect.left + 10;
          const yPos = event.clientY - containerRect.top - 35;

          tooltip
            .style('left', `${xPos}px`)
            .style('top', `${yPos}px`)
            .html(
              `<b>Región:</b> ${d.regionName}<br/>
               <b>Altura mínima:</b> ${d.minHeight.toFixed(2)} m<br/>
               <b>Área de nieve permanente:</b> ${d.totalArea.toFixed(3)} km²`
            );
        })
        .on('mouseout', function () {
          tooltip.style('opacity', 0);
        });

      // Etiquetas de ejes
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
      svg
        .append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .text(
          'Dibuja un polígono y analiza para ver los datos de nieve permanente y vegetación'
        );
    }
  }, [permanentSnowData]);

  return (
    <div
      style={{ position: 'relative' }}
      className="bg-white border border-gray-200 rounded-lg p-4 mt-4"
    >
      <h3 className="text-lg font-semibold mb-3">
        Análisis de Nieve Permanente por Elevación
      </h3>
      <div
        ref={chartRef}
        className="w-full h-[300px] border border-gray-200 rounded-lg p-2"
      ></div>
    </div>
  );
};

export default PermanentSnowChart;
