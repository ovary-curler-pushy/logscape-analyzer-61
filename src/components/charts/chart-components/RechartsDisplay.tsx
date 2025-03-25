
import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, Brush, BarChart, Bar,
  ReferenceArea
} from 'recharts';
import { ChartDisplayProps } from '@/types/chartTypes';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';

// Custom tooltip component for charts
const CustomTooltip = React.memo(({ active, payload, label }: any) => {
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
        {payload.map((entry: any, index: number) => {
          const originalKey = `${entry.name}_original`;
          const hasOriginalValue = entry.payload && originalKey in entry.payload;
          
          return (
            <div key={`tooltip-${index}`} className="flex items-center gap-2 py-0.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="font-medium">{entry.name}:</span>
              <span>
                {hasOriginalValue 
                  ? `${entry.payload[originalKey]} (${entry.value})` 
                  : entry.value}
              </span>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
});
CustomTooltip.displayName = 'CustomTooltip';

const RechartsDisplay: React.FC<ChartDisplayProps> = ({
  containerRef,
  chartType,
  visibleChartData,
  signals,
  onBrushChange,
  onZoomReset,
  samplingFactor = 1
}) => {
  const [refAreaLeft, setRefAreaLeft] = useState<number | null>(null);
  const [refAreaRight, setRefAreaRight] = useState<number | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomDomain, setZoomDomain] = useState<[number, number] | null>(null);

  // Reset zoom - Define this before it's used in handleMouseUp
  const handleZoomReset = useCallback(() => {
    setZoomDomain(null);
    setIsZoomed(false);
    setRefAreaLeft(null);
    setRefAreaRight(null);
    if (onZoomReset) onZoomReset();
  }, [onZoomReset]);

  // Sample the data based on the sampling factor
  const sampledData = useMemo(() => {
    if (!visibleChartData || visibleChartData.length === 0) return [];
    
    if (samplingFactor === 1 || visibleChartData.length < 1000) {
      return visibleChartData;
    }
    
    return visibleChartData.filter((_, i) => i % samplingFactor === 0);
  }, [visibleChartData, samplingFactor]);
  
  // Format timestamps on x-axis - memoize formatter for performance
  const formatXAxis = useCallback((timestamp: number) => {
    try {
      return format(new Date(timestamp), 'HH:mm:ss');
    } catch (e) {
      return '';
    }
  }, []);

  // Handle mouse down for zoom selection
  const handleMouseDown = useCallback((e: any) => {
    if (!e || !e.activeLabel) return;
    setRefAreaLeft(e.activeLabel);
  }, []);

  // Handle mouse move for zoom selection - debounced version
  const handleMouseMove = useCallback((e: any) => {
    if (refAreaLeft && e && e.activeLabel) {
      setRefAreaRight(e.activeLabel);
    }
  }, [refAreaLeft]);

  // Handle mouse up to complete zoom selection
  const handleMouseUp = useCallback(() => {
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
      
      toast.info("Zoomed to selected area", {
        duration: 2000
      });
    }
  }, [refAreaLeft, refAreaRight, handleZoomReset]);

  // Handle brush change with debounce
  const handleBrushChange = useCallback((brushData: any) => {
    if (!brushData || !onBrushChange) return;
    
    const { startIndex, endIndex } = brushData;
    if (startIndex === undefined || endIndex === undefined) return;
    
    // Check if indices are valid
    if (startIndex >= 0 && endIndex >= 0 && startIndex !== endIndex) {
      onBrushChange({
        startIndex,
        endIndex,
        startValue: sampledData[startIndex]?.timestamp,
        endValue: sampledData[endIndex]?.timestamp
      });
    }
  }, [sampledData, onBrushChange]);

  if (!sampledData || sampledData.length === 0) {
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
          data={sampledData}
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
            minTickGap={50}
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
                activeDot={{ r: 4 }}
                isAnimationActive={false}
                strokeWidth={1.5}
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
                fillOpacity={0.8}
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
          
          {/* Brush component for additional navigation - optimized with lower height */}
          <Brush 
            dataKey="timestamp" 
            height={20} 
            stroke="#8884d8"
            onChange={handleBrushChange}
            tickFormatter={formatXAxis}
            startIndex={0}
            endIndex={Math.min(100, sampledData.length - 1)}
          />
        </ChartComponent>
      </ResponsiveContainer>
      
      <div className="text-center text-xs text-muted-foreground mt-1">
        <p>Drag to zoom. Double-click chart or use Reset button to reset view.</p>
      </div>
    </div>
  );
};

export default React.memo(RechartsDisplay);
