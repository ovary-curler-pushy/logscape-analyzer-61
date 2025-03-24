
import React, { useState } from 'react';
import {
  VictoryChart,
  VictoryLine,
  VictoryBar,
  VictoryZoomContainer,
  VictoryAxis,
  VictoryTooltip,
  VictoryVoronoiContainer,
  VictoryLegend,
  VictoryScatter,
  createContainer
} from 'victory';
import { ChartDisplayProps } from '@/types/chartTypes';
import { format } from 'date-fns';

const VictoryChartDisplay: React.FC<ChartDisplayProps> = ({
  chartType,
  visibleChartData,
  signals,
  onZoomDomainChange
}) => {
  const [zoomDomain, setZoomDomain] = useState<{ x?: [number, number]; y?: [number, number] }>();

  const handleZoomDomainChange = (domain: { x: [number, number]; y: [number, number] }) => {
    setZoomDomain(domain);
    if (onZoomDomainChange) {
      onZoomDomainChange(domain);
    }
  };

  const VictoryZoomVoronoiContainer = createContainer("zoom", "voronoi");

  return (
    <div className="relative h-[300px] w-full bg-card">
      <VictoryChart
        width={800}
        height={300}
        scale={{ x: "time" }}
        containerComponent={
          <VictoryZoomVoronoiContainer
            zoomDimension="x"
            zoomDomain={zoomDomain}
            onZoomDomainChange={handleZoomDomainChange}
            labels={({ datum }) => {
              const timestamp = format(new Date(datum.timestamp), 'MMM dd, HH:mm:ss');
              const value = datum._original || datum.y;
              return `${timestamp}\n${datum.seriesName}: ${value}`;
            }}
          />
        }
      >
        <VictoryAxis
          tickFormat={(timestamp) => format(new Date(timestamp), 'HH:mm')}
          style={{
            axis: { stroke: "#64748b" },
            tickLabels: { fill: "#64748b", fontSize: 10 },
            grid: { stroke: "#334155", strokeDasharray: "5,5" }
          }}
        />
        <VictoryAxis
          dependentAxis
          style={{
            axis: { stroke: "#64748b" },
            tickLabels: { fill: "#64748b", fontSize: 10 },
            grid: { stroke: "#334155", strokeDasharray: "5,5" }
          }}
        />
        
        {signals.map((signal) => {
          const data = visibleChartData.map(point => ({
            timestamp: point.timestamp,
            y: point[signal.name],
            _original: point[`${signal.name}_original`],
            seriesName: signal.name
          }));

          if (chartType === 'line') {
            return (
              <React.Fragment key={signal.id}>
                <VictoryLine
                  data={data}
                  x="timestamp"
                  y="y"
                  style={{
                    data: { stroke: signal.color }
                  }}
                />
                <VictoryScatter
                  data={data}
                  x="timestamp"
                  y="y"
                  size={2}
                  style={{
                    data: { fill: signal.color }
                  }}
                />
              </React.Fragment>
            );
          } else {
            return (
              <VictoryBar
                key={signal.id}
                data={data}
                x="timestamp"
                y="y"
                style={{
                  data: { fill: signal.color }
                }}
              />
            );
          }
        })}

        <VictoryLegend
          x={50}
          y={10}
          orientation="horizontal"
          gutter={20}
          style={{ 
            labels: { fill: "#64748b", fontSize: 10 } 
          }}
          data={signals.map(signal => ({
            name: signal.name,
            symbol: { fill: signal.color }
          }))}
        />
      </VictoryChart>
    </div>
  );
};

export default VictoryChartDisplay;
