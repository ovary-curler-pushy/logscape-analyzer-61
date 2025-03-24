
import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  Legend, ResponsiveContainer, Brush, BarChart, Bar
} from 'recharts';
import { ChartDisplayProps } from '@/types/chartTypes';
import { toast } from 'sonner';

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

const ChartDisplay: React.FC<ChartDisplayProps> = ({
  containerRef,
  chartType,
  visibleChartData,
  zoomDomain,
  signals,
  onBrushChange
}) => {
  const [chartWidth, setChartWidth] = useState<number>(0);
  const [chartHeight, setChartHeight] = useState<number>(0);

  useEffect(() => {
    if (containerRef.current) {
      const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
          setChartWidth(entry.contentRect.width);
          setChartHeight(entry.contentRect.height);
        }
      });
      
      resizeObserver.observe(containerRef.current);
      
      return () => {
        if (containerRef.current) {
          resizeObserver.unobserve(containerRef.current);
        }
      };
    }
  }, [containerRef]);

  const formatXAxis = (tickItem: any) => {
    try {
      const date = new Date(tickItem);
      if (isNaN(date.getTime())) return '';
      return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
    } catch (e) {
      return '';
    }
  };

  // Improved brush change handler with better error handling
  const handleBrushChange = (brushData: any) => {
    if (!brushData || !visibleChartData || visibleChartData.length === 0) {
      console.log("Invalid brush data or no chart data available");
      return;
    }
    
    try {
      // Ensure we have start and end indices
      if (typeof brushData.startIndex === 'undefined' || typeof brushData.endIndex === 'undefined') {
        console.log("Missing brush indices");
        return;
      }
      
      // Ensure indices are within bounds
      const safeStartIndex = Math.max(0, Math.min(visibleChartData.length - 1, brushData.startIndex));
      const safeEndIndex = Math.max(0, Math.min(visibleChartData.length - 1, brushData.endIndex));
      
      if (safeStartIndex === safeEndIndex) {
        console.log("Start and end indices are the same, can't zoom");
        return;
      }
      
      // Get actual timestamps
      const startTimestamp = visibleChartData[safeStartIndex]?.timestamp;
      const endTimestamp = visibleChartData[safeEndIndex]?.timestamp;
      
      // Verify timestamps
      if (startTimestamp === undefined || endTimestamp === undefined) {
        console.log("Invalid timestamps in data");
        return;
      }
      
      console.log(`Zooming to time range: ${new Date(startTimestamp).toISOString()} - ${new Date(endTimestamp).toISOString()}`);
      
      // Call parent's onBrushChange with valid data
      onBrushChange({
        startIndex: safeStartIndex,
        endIndex: safeEndIndex,
        startValue: startTimestamp,
        endValue: endTimestamp
      });
      
      toast.info(`Zoomed to selected time range: ${new Date(startTimestamp).toLocaleTimeString()} - ${new Date(endTimestamp).toLocaleTimeString()}`);
    } catch (error) {
      console.error("Error in brush change handler:", error);
      toast.error("Failed to apply zoom");
    }
  };

  // Show placeholder when no data is available
  if (!visibleChartData || visibleChartData.length === 0) {
    return (
      <div className="bg-card border rounded-md p-3 h-[300px] flex items-center justify-center" ref={containerRef}>
        <p className="text-muted-foreground">No data to display</p>
      </div>
    );
  }

  // Set domain values for zoom
  const domainStart = zoomDomain?.start || 'dataMin';
  const domainEnd = zoomDomain?.end || 'dataMax';

  console.log(`Rendering ${chartType} chart with ${signals.length} signals and ${visibleChartData.length} data points`);
  console.log("Current zoom domain:", zoomDomain);

  return (
    <div className="bg-card border rounded-md p-3 h-[300px]" ref={containerRef}>
      <ResponsiveContainer width="100%" height="100%">
        {chartType === 'line' ? (
          <LineChart
            data={visibleChartData}
            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="timestamp" 
              tickFormatter={formatXAxis} 
              type="number"
              domain={[domainStart, domainEnd]}
              scale="time"
            />
            <YAxis />
            <RechartsTooltip content={<CustomTooltip />} />
            <Legend />
            {signals.map(signal => (
              <Line
                key={signal.id}
                type="monotone"
                dataKey={signal.name}
                name={signal.name}
                stroke={signal.color}
                activeDot={{ r: 6 }}
                isAnimationActive={false}
                dot={false}
              />
            ))}
            <Brush 
              dataKey="timestamp" 
              height={30} 
              stroke="#8884d8"
              onChange={handleBrushChange}
              travellerWidth={10}
              startIndex={0}
              endIndex={Math.min(50, visibleChartData.length - 1)}
            />
          </LineChart>
        ) : (
          <BarChart
            data={visibleChartData}
            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="timestamp" 
              tickFormatter={formatXAxis} 
              type="number"
              domain={[domainStart, domainEnd]}
              scale="time"
            />
            <YAxis />
            <RechartsTooltip content={<CustomTooltip />} />
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
              endIndex={Math.min(50, visibleChartData.length - 1)}
            />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};

export default ChartDisplay;
