
import React, { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { FileText, Wand, RefreshCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import VictoryChartDisplay from "./chart-components/VictoryChartDisplay";
import { LogChartProps, TimeSegment } from '@/types/chartTypes';
import { processLogDataInChunks } from '@/utils/logProcessing';

const POINTS_PER_PANEL = 5000;

const LogChart: React.FC<LogChartProps> = ({ logContent, patterns, className }) => {
  // Basic states
  const [rawChartData, setRawChartData] = useState<any[]>([]);
  const [signals, setSignals] = useState<any[]>([]);
  const [timeSegments, setTimeSegments] = useState<TimeSegment[]>([]);
  const [selectedSegment, setSelectedSegment] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("");
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [zoomDomain, setZoomDomain] = useState<any>(null);

  // Process log data when inputs change
  useEffect(() => {
    if (!logContent || patterns.length === 0) return;

    setIsProcessing(true);
    setRawChartData([]);
    setTimeSegments([]);
    
    processLogDataInChunks(
      logContent,
      patterns,
      setRawChartData,
      () => {},  // Removed formatted chart data setter
      setSignals,
      () => {},  // Removed panels setter
      () => {},  // Removed string value map setter
      setProcessingStatus,
      setIsProcessing,
      () => {},  // Removed time range setter
      formatDataCallback
    );
  }, [logContent, patterns]);

  // Format and segment data into time segments
  const formatDataCallback = useCallback((data: any[]) => {
    if (!data.length) {
      setIsProcessing(false);
      toast.error("No data points found matching the patterns");
      return;
    }

    try {
      // Sort data by timestamp
      const sortedData = [...data].sort((a, b) => {
        const aTime = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
        const bTime = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
        return aTime - bTime;
      });

      console.log("Total data points:", sortedData.length);

      // Process data to flattened format for chart
      const processedData = sortedData.map(item => {
        const timestamp = item.timestamp instanceof Date 
          ? item.timestamp.getTime() // Convert Date object to number for Victory
          : new Date(item.timestamp).getTime(); // Convert string date to number
        
        const result: any = { timestamp };
        
        // Flatten values from the values object
        Object.entries(item.values || {}).forEach(([key, value]) => {
          if (typeof value === 'number') {
            result[key] = value;
          } else if (typeof value === 'string') {
            // Try to convert to number if possible
            const numValue = parseFloat(value as string);
            if (!isNaN(numValue)) {
              result[key] = numValue;
              result[`${key}_original`] = value; // Keep original string value
            } else {
              // For string values, we'll try to map them to numbers for charting
              result[key] = 1; // Default value for string appearance
              result[`${key}_original`] = value; // Keep original string value
            }
          }
        });
        
        return result;
      });

      // Create time segments based on POINTS_PER_PANEL
      const segments: TimeSegment[] = [];
      
      for (let i = 0; i < processedData.length; i += POINTS_PER_PANEL) {
        const segmentData = processedData.slice(i, i + POINTS_PER_PANEL);
        if (segmentData.length > 0) {
          segments.push({
            id: `segment-${i / POINTS_PER_PANEL}`,
            startTime: new Date(segmentData[0].timestamp),
            endTime: new Date(segmentData[segmentData.length - 1].timestamp),
            data: segmentData
          });
        }
      }
      
      setTimeSegments(segments);
      if (segments.length > 0) {
        setSelectedSegment(segments[0].id);
      }
      
      console.log(`Created ${segments.length} segments with ${POINTS_PER_PANEL} points per segment`);
      console.log("First segment points:", segments[0]?.data?.length);
      console.log("First data point:", segments[0]?.data?.[0]);
      
      toast.success(`Data divided into ${segments.length} segments`);
    } catch (error) {
      console.error('Error formatting data:', error);
      toast.error('Error preparing chart data');
    }

    setIsProcessing(false);
  }, []);

  // Handle zoom domain changes
  const handleZoomDomainChange = useCallback((domain: any) => {
    setZoomDomain(domain);
    console.log('Zoom domain changed:', domain);
  }, []);

  // Handle chart type changes
  const handleChartTypeChange = useCallback((type: 'line' | 'bar') => {
    setChartType(type);
    toast.info(`Switched to ${type} chart view`);
  }, []);

  // Reset zoom to default
  const handleResetZoom = useCallback(() => {
    setZoomDomain(null);
    toast.info("Zoom reset to default view");
  }, []);

  // Get signals for a panel
  const getPanelSignals = useCallback((panelId: string) => {
    // In this simplified approach, we're using all available signals
    return signals;
  }, [signals]);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Data Analysis</CardTitle>
            <CardDescription>
              {timeSegments.length > 0 
                ? `Viewing ${timeSegments.length} segments of ${POINTS_PER_PANEL} points each` 
                : 'Process log data to begin analysis'}
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            {isProcessing && (
              <div className="flex items-center text-sm text-muted-foreground">
                <div className="w-4 h-4 mr-2 rounded-full border-2 border-t-primary animate-spin" />
                {processingStatus}
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleResetZoom}
              disabled={!zoomDomain}
            >
              <RefreshCcw className="h-4 w-4 mr-1" />
              Reset Zoom
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleChartTypeChange(chartType === 'line' ? 'bar' : 'line')}
            >
              {chartType === 'line' ? 'Switch to Bar' : 'Switch to Line'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {timeSegments.length > 0 ? (
          <div>
            <ScrollArea className="w-full">
              <div className="mb-4 overflow-x-auto pb-2">
                <TabsList className="inline-flex h-auto py-2 w-auto">
                  {timeSegments.map((segment, index) => (
                    <TabsTrigger 
                      key={segment.id} 
                      value={segment.id}
                      onClick={() => setSelectedSegment(segment.id)}
                      className={`text-xs h-auto py-1.5 px-2.5 whitespace-nowrap ${segment.id === selectedSegment ? 'bg-primary text-primary-foreground' : ''}`}
                    >
                      Segment {index + 1}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
            </ScrollArea>

            <div className="mt-4">
              {selectedSegment && (
                <VictoryChartDisplay
                  chartType={chartType}
                  visibleChartData={timeSegments.find(s => s.id === selectedSegment)?.data || []}
                  signals={signals}
                  onZoomDomainChange={handleZoomDomainChange}
                />
              )}
              {selectedSegment && timeSegments.find(s => s.id === selectedSegment) && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Time range: {new Date(timeSegments.find(s => s.id === selectedSegment)!.startTime).toLocaleTimeString()} - {new Date(timeSegments.find(s => s.id === selectedSegment)!.endTime).toLocaleTimeString()}
                  {timeSegments.find(s => s.id === selectedSegment)!.data && ` | ${timeSegments.find(s => s.id === selectedSegment)!.data.length} data points`}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="py-16 flex flex-col items-center justify-center text-center">
            <FileText className="w-12 h-12 mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium mb-1">No data to display</h3>
            <p className="text-sm text-muted-foreground">
              Process log data to begin analysis
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LogChart;
