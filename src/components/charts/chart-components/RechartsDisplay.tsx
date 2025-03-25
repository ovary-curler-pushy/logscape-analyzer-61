
import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, Brush, BarChart, Bar
} from 'recharts';
import { ChartDisplayProps } from '@/types/chartTypes';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight } from 'lucide-react';

// Custom tooltip component for charts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-2 bg-white shadow-md border rounded-md text-xs">
        <p className="font-medium mb-1">{new Date(label).toLocaleString()}</p>
        {payload.map((entry: any, index: number) => (
          <div key={`tooltip-${index}`} className="flex items-center gap-2 py-0.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="font-medium">{entry.name}:</span>
            <span>{typeof entry.payload[`${entry.name}_original`] === 'string' 
              ? entry.payload[`${entry.name}_original`] 
              : entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const RechartsDisplay: React.FC<ChartDisplayProps> = ({
  containerRef,
  chartType,
  visibleChartData,
  zoomDomain,
  signals,
  onZoomDomainChange,
  onBrushChange
}) => {
  // Sample data to reduce the number of points displayed for better performance
  const [sampledData, setSampledData] = useState<any[]>([]);
  
  // Prepare and process data for display
  useEffect(() => {
    if (!visibleChartData || visibleChartData.length === 0) {
      setSampledData([]);
      return;
    }

    // Ensure that each datum has a valid timestamp that can be rendered
    const processed = visibleChartData.map(point => {
      // Ensure timestamp is a number for Recharts
      const timestamp = typeof point.timestamp === 'number' 
        ? point.timestamp 
        : new Date(point.timestamp).getTime();
        
      // Copy other properties as is
      return { 
        ...point, 
        timestamp 
      };
    });

    // Sample data if too many points
    const maxPoints = 1000;
    if (processed.length > maxPoints) {
      const samplingRate = Math.ceil(processed.length / maxPoints);
      setSampledData(processed.filter((_, index) => index % samplingRate === 0));
      console.log(`Sampled data from ${processed.length} to ${Math.ceil(processed.length / samplingRate)} points`);
    } else {
      setSampledData(processed);
    }
  }, [visibleChartData]);

  const formatXAxis = (tickItem: any) => {
    try {
      const date = new Date(tickItem);
      if (isNaN(date.getTime())) return '';
      return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
    } catch (e) {
      return '';
    }
  };

  // Handle brush change (zoom)
  const handleBrushChange = (brushData: any) => {
    if (!brushData || !onBrushChange) return;
    
    try {
      // Make sure we have valid brush data with indices
      if (brushData.startIndex !== undefined && brushData.endIndex !== undefined) {
        if (sampledData && sampledData.length > 0) {
          const startIndex = Math.max(0, brushData.startIndex);
          const endIndex = Math.min(sampledData.length - 1, brushData.endIndex);
          
          if (startIndex >= endIndex) return;
          
          const start = sampledData[startIndex].timestamp;
          const end = sampledData[endIndex].timestamp;
          
          // Pass the brush data to parent component
          onBrushChange(brushData);
          
          if (onZoomDomainChange) {
            onZoomDomainChange({ start, end });
          }
        }
      }
    } catch (error) {
      console.error("Error in brush change handler:", error);
    }
  };

  // Show placeholder when no data is available
  if (!sampledData || sampledData.length === 0) {
    return (
      <div className="bg-card border rounded-md p-3 h-[300px] flex items-center justify-center">
        <p className="text-muted-foreground">No data to display</p>
      </div>
    );
  }

  // Set domain values for zoom if provided, otherwise show all data
  const domainStart = zoomDomain?.start || undefined;
  const domainEnd = zoomDomain?.end || undefined;

  console.log(`Rendering ${chartType} chart with ${signals.length} signals and ${sampledData.length} data points`);
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      {chartType === 'line' ? (
        <LineChart
          data={sampledData}
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="timestamp" 
            tickFormatter={formatXAxis} 
            type="number"
            domain={domainStart && domainEnd ? [domainStart, domainEnd] : ['dataMin', 'dataMax']}
            scale="time"
          />
          <YAxis />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {signals.map(signal => (
            <Line
              key={signal.id}
              type="monotone"
              dataKey={signal.name}
              name={signal.name}
              stroke={signal.color}
              dot={false}
              activeDot={{ r: 6 }}
              isAnimationActive={false}
            />
          ))}
          <Brush 
            dataKey="timestamp" 
            height={30} 
            stroke="#8884d8"
            onChange={handleBrushChange}
            travellerWidth={10}
            startIndex={0}
            endIndex={Math.min(200, sampledData.length - 1)}
            gap={1}
          />
        </LineChart>
      ) : (
        <BarChart
          data={sampledData}
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="timestamp" 
            tickFormatter={formatXAxis} 
            type="number"
            domain={domainStart && domainEnd ? [domainStart, domainEnd] : ['dataMin', 'dataMax']}
            scale="time"
          />
          <YAxis />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {signals.map(signal => (
            <Bar
              key={signal.id}
              dataKey={signal.name}
              name={signal.name}
              fill={signal.color}
              isAnimationActive={false}
            />
          ))}
          <Brush 
            dataKey="timestamp" 
            height={30} 
            stroke="#8884d8"
            onChange={handleBrushChange}
            travellerWidth={10}
            startIndex={0}
            endIndex={Math.min(200, sampledData.length - 1)}
            gap={1}
          />
        </BarChart>
      )}
    </ResponsiveContainer>
  );
};

export default RechartsDisplay;
