
import React, { useRef, useState, useEffect } from 'react';
import { format } from 'date-fns';
import { SegmentedPanelsProps } from '@/types/chartTypes';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  Legend, ResponsiveContainer, Brush, BarChart, Bar } from 'recharts';
import { toast } from 'sonner';

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-2 bg-background shadow-md border rounded-md text-xs">
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

const SegmentedPanels: React.FC<SegmentedPanelsProps> = ({
  timeSegments,
  signals,
  selectedSegment,
  onSegmentChange,
  chartType,
  getPanelSignals
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoomDomain, setZoomDomain] = useState<{ start?: number, end?: number }>({});

  // Reset zoom domain when segment changes
  useEffect(() => {
    setZoomDomain({});
  }, [selectedSegment]);

  const handleBrushChange = (brushData: any) => {
    if (!brushData || !brushData.startValue || !brushData.endValue) {
      console.log("Invalid brush data");
      return;
    }
    
    try {
      console.log(`Zooming segment to: ${new Date(brushData.startValue).toISOString()} - ${new Date(brushData.endValue).toISOString()}`);
      
      setZoomDomain({
        start: brushData.startValue,
        end: brushData.endValue
      });
      
      toast.info(`Zoomed in on selected time range within segment`);
    } catch (error) {
      console.error("Error handling segment brush change:", error);
    }
  };

  const formatXAxis = (tickItem: any) => {
    try {
      const date = new Date(tickItem);
      if (isNaN(date.getTime())) return '';
      return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
    } catch (e) {
      return '';
    }
  };

  if (timeSegments.length === 0) {
    return (
      <Card className="mb-4">
        <CardContent className="py-6 text-center">
          <p className="text-muted-foreground">No time segments available</p>
        </CardContent>
      </Card>
    );
  }

  // Get the selected segment's data and signals
  const selectedSegmentData = timeSegments.find(s => s.id === selectedSegment)?.data || [];
  const panelSignals = getPanelSignals('panel-1'); // Using first panel for all segments

  // Set domain values for zoom
  const domainStart = zoomDomain?.start || 'dataMin';
  const domainEnd = zoomDomain?.end || 'dataMax';

  return (
    <div className="space-y-4">
      <Tabs value={selectedSegment} onValueChange={onSegmentChange}>
        <div className="mb-2">
          <p className="text-sm text-muted-foreground mb-1">Time segments (15 minute intervals)</p>
          <TabsList className="overflow-x-auto relative whitespace-nowrap max-w-full flex-none h-auto py-1 px-1">
            {timeSegments.map(segment => (
              <TabsTrigger 
                key={segment.id} 
                value={segment.id}
                className="text-xs py-1 px-2 h-auto"
              >
                {format(segment.startTime, 'HH:mm')} - {format(segment.endTime, 'HH:mm')} 
                <span className="text-xs text-muted-foreground ml-1">({segment.data.length} points)</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>

      {/* Segment chart display */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {timeSegments.find(s => s.id === selectedSegment) && (
              <>
                Time Segment: {format(timeSegments.find(s => s.id === selectedSegment)!.startTime, 'HH:mm')} - {format(timeSegments.find(s => s.id === selectedSegment)!.endTime, 'HH:mm')}
                <button 
                  onClick={() => setZoomDomain({})}
                  className="ml-2 text-xs text-primary hover:text-primary/80 underline"
                >
                  Reset Zoom
                </button>
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]" ref={containerRef}>
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'line' ? (
                <LineChart
                  data={selectedSegmentData}
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
                  {panelSignals.map(signal => (
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
                    endIndex={Math.min(50, selectedSegmentData.length - 1)}
                  />
                </LineChart>
              ) : (
                <BarChart
                  data={selectedSegmentData}
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
                  {panelSignals.map(signal => (
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
                    endIndex={Math.min(50, selectedSegmentData.length - 1)}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SegmentedPanels;
