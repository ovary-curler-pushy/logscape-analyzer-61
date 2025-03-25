
import React, { useState, useRef, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, Brush, BarChart, Bar,
  ReferenceArea
} from 'recharts';
import { ChartDisplayProps } from '@/types/chartTypes';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { RefreshCw, ZoomIn } from 'lucide-react';

// Custom tooltip component for charts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    let formattedTime;
    try {
      formattedTime = format(new Date(label), 'HH:mm:ss.SSS');
    } catch (e) {
      formattedTime = label;
    }
    
    return (
      <div className="p-2 bg-white dark:bg-slate-800 shadow-md border rounded-md text-xs">
        <p className="font-medium mb-1">{formattedTime}</p>
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
  signals,
  onBrushChange,
  onZoomReset
}) => {
  const [refAreaLeft, setRefAreaLeft] = useState<number | null>(null);
  const [refAreaRight, setRefAreaRight] = useState<number | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomDomain, setZoomDomain] = useState<[number, number] | null>(null);

  // Format timestamps on x-axis
  const formatXAxis = (timestamp: number) => {
    try {
      return format(new Date(timestamp), 'HH:mm:ss');
    } catch (e) {
      return '';
    }
  };

  // Handle mouse down for zoom selection
  const handleMouseDown = (e: any) => {
    if (!e || !e.activeLabel) return;
    setRefAreaLeft(e.activeLabel);
  };

  // Handle mouse move for zoom selection
  const handleMouseMove = (e: any) => {
    if (refAreaLeft && e && e.activeLabel) {
      setRefAreaRight(e.activeLabel);
    }
  };

  // Handle mouse up to complete zoom selection
  const handleMouseUp = () => {
    if (refAreaLeft && refAreaRight) {
      // Ensure left is always less than right
      const [left, right] = refAreaLeft < refAreaRight 
        ? [refAreaLeft, refAreaRight] 
        : [refAreaRight, refAreaLeft];
      
      if (left === right || right - left < 10) {
        // Reset if the selection is too small
        handleZoomReset();
        return;
      }

      setZoomDomain([left, right]);
      setIsZoomed(true);
      setRefAreaLeft(null);
      setRefAreaRight(null);
      
      toast.info("Zoomed to selected area. Use the Reset Zoom button to view all data.");
    }
  };

  // Reset zoom
  const handleZoomReset = () => {
    setZoomDomain(null);
    setIsZoomed(false);
    setRefAreaLeft(null);
    setRefAreaRight(null);
    if (onZoomReset) onZoomReset();
    toast.info("Reset to full data view");
  };

  // Handle brush change
  const handleBrushChange = (brushData: any) => {
    if (!brushData || !onBrushChange) return;
    
    const { startIndex, endIndex } = brushData;
    if (startIndex === undefined || endIndex === undefined) return;
    
    // Check if indices are valid
    if (startIndex >= 0 && endIndex >= 0 && startIndex !== endIndex) {
      onBrushChange({
        startIndex,
        endIndex,
        startValue: visibleChartData[startIndex]?.timestamp,
        endValue: visibleChartData[endIndex]?.timestamp
      });
    }
  };

  if (!visibleChartData || visibleChartData.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-card p-4 rounded-md border">
        <p className="text-muted-foreground">No data available to display</p>
      </div>
    );
  }

  // Prepare domain for x-axis based on zoom state
  const xDomain = zoomDomain 
    ? { domain: zoomDomain as [number, number] } 
    : { dataKey: 'timestamp', domain: ['dataMin', 'dataMax'] };

  // Component to render
  const ChartComponent = chartType === 'line' ? LineChart : BarChart;

  // Sample data if there are too many points
  const dataToRender = visibleChartData.length > 5000 
    ? visibleChartData.filter((_, i) => i % Math.ceil(visibleChartData.length / 5000) === 0) 
    : visibleChartData;

  return (
    <div className="relative h-full">
      {isZoomed && (
        <div className="absolute top-2 right-2 z-10">
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={handleZoomReset} 
            className="flex items-center gap-1"
          >
            <RefreshCw className="h-3 w-3" />
            Reset Zoom
          </Button>
        </div>
      )}
      
      <ResponsiveContainer width="100%" height="100%">
        <ChartComponent
          data={dataToRender}
          margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="timestamp" 
            tickFormatter={formatXAxis}
            domain={xDomain.domain}
            type="number"
            scale="time"
            allowDataOverflow={isZoomed}
          />
          <YAxis />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          
          {chartType === 'line' ? (
            signals.map(signal => (
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
            ))
          ) : (
            signals.map(signal => (
              <Bar
                key={signal.id}
                dataKey={signal.name}
                name={signal.name}
                fill={signal.color}
                isAnimationActive={false}
              />
            ))
          )}
          
          {/* Reference area for zoom selection */}
          {refAreaLeft && refAreaRight && (
            <ReferenceArea
              x1={refAreaLeft}
              x2={refAreaRight}
              strokeOpacity={0.3}
              fill="#8884d8"
              fillOpacity={0.3}
            />
          )}
          
          {/* Brush component for additional navigation */}
          <Brush 
            dataKey="timestamp" 
            height={30} 
            stroke="#8884d8"
            onChange={handleBrushChange}
            tickFormatter={formatXAxis}
          />
        </ChartComponent>
      </ResponsiveContainer>
      
      <div className="text-center text-xs text-muted-foreground mt-2">
        <p>Select an area by clicking and dragging to zoom. Use Reset Zoom button to view all data.</p>
      </div>
    </div>
  );
};

export default RechartsDisplay;
