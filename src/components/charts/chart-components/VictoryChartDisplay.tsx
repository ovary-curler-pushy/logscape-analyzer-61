
import React, { useState } from 'react';
import {
  VictoryChart,
  VictoryLine,
  VictoryBar,
  VictoryAxis,
  VictoryTooltip,
  VictoryLegend,
  VictoryScatter,
  VictoryZoomContainer,
  VictoryVoronoiContainer
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

  // Sample data to reduce the number of points displayed
  const sampleChartData = () => {
    if (!visibleChartData || visibleChartData.length === 0) return [];
    
    const maxPoints = 500; // Maximum points to display for better performance
    
    if (visibleChartData.length <= maxPoints) return visibleChartData;
    
    const samplingRate = Math.ceil(visibleChartData.length / maxPoints);
    return visibleChartData.filter((_, index) => index % samplingRate === 0);
  };

  const sampledData = sampleChartData();
  
  // Debug data display issues
  console.log("Chart data points:", visibleChartData?.length);
  console.log("Signals:", signals);
  console.log("First data point:", visibleChartData?.[0]);
  console.log("Sampled data points:", sampledData?.length);

  if (!sampledData || sampledData.length === 0) {
    return (
      <div className="flex h-[300px] w-full bg-card items-center justify-center text-muted-foreground">
        No data available for this panel
      </div>
    );
  }

  return (
    <div className="relative h-[300px] w-full bg-card">
      <VictoryChart
        width={800}
        height={300}
        scale={{ x: "time" }}
        containerComponent={
          <VictoryZoomContainer
            zoomDimension="x"
            zoomDomain={zoomDomain}
            onZoomDomainChange={handleZoomDomainChange}
            allowZoom={true}
            minimumZoom={{x: 1/100000}}
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
          const data = sampledData.map(point => ({
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
