
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from "sonner";
import { FileText, Wand, RefreshCcw, ZoomIn } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import VictoryChartDisplay from "./chart-components/VictoryChartDisplay";
import { LogChartProps } from '@/types/chartTypes';
import { processLogDataInChunks } from '@/utils/logProcessing';

const POINTS_PER_PANEL = 5000;

const LogChart: React.FC<LogChartProps> = ({ logContent, patterns, className }) => {
  // Basic states
  const [rawChartData, setRawChartData] = useState<any[]>([]);
  const [signals, setSignals] = useState<any[]>([]);
  const [panels, setPanels] = useState<any[]>([]);
  const [activePanel, setActivePanel] = useState<string>("0");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("");
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [zoomDomain, setZoomDomain] = useState<any>(null);

  // Process log data when inputs change
  useEffect(() => {
    if (!logContent || patterns.length === 0) return;

    setIsProcessing(true);
    setRawChartData([]);
    setPanels([]);
    
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

  // Format and segment data
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
        const result: any = {
          timestamp: item.timestamp instanceof Date 
            ? item.timestamp.getTime() // Convert Date object to number for Victory
            : new Date(item.timestamp).getTime() // Convert string date to number
        };
        
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

      // Create panels based on data points count
      const totalPanels = Math.ceil(processedData.length / POINTS_PER_PANEL);
      const newPanels = Array.from({ length: totalPanels }, (_, index) => {
        const start = index * POINTS_PER_PANEL;
        const end = Math.min((index + 1) * POINTS_PER_PANEL, processedData.length);
        return {
          id: index.toString(),
          data: processedData.slice(start, end),
          range: {
            start: new Date(processedData[start].timestamp),
            end: new Date(processedData[end - 1].timestamp)
          }
        };
      });

      console.log(`Created ${newPanels.length} panels with ${POINTS_PER_PANEL} points each`);
      console.log("First panel data points:", newPanels[0]?.data?.length);
      console.log("First data point in first panel:", newPanels[0]?.data?.[0]);
      
      setPanels(newPanels);
      setActivePanel("0");
      
      toast.success(`Data divided into ${newPanels.length} panels`);
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

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Data Analysis</CardTitle>
            <CardDescription>
              {panels.length > 0 
                ? `Viewing ${panels.length} panels of ${POINTS_PER_PANEL} points each` 
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
              <ZoomIn className="h-4 w-4 mr-1" />
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
        {panels.length > 0 ? (
          <Tabs value={activePanel} onValueChange={setActivePanel}>
            <div className="mb-4 overflow-x-auto">
              <TabsList className="inline-flex flex-wrap h-auto py-2">
                {panels.map((panel) => (
                  <TabsTrigger key={panel.id} value={panel.id} className="text-xs h-auto py-1.5 px-2.5">
                    Panel {parseInt(panel.id) + 1}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {panels.map((panel) => (
              <TabsContent key={panel.id} value={panel.id}>
                <VictoryChartDisplay
                  chartType={chartType}
                  visibleChartData={panel.data}
                  signals={signals}
                  onZoomDomainChange={handleZoomDomainChange}
                />
                <div className="mt-2 text-xs text-muted-foreground">
                  Time range: {panel.range.start.toLocaleString()} - {panel.range.end.toLocaleString()}
                  {panel.data && ` | ${panel.data.length} data points`}
                </div>
              </TabsContent>
            ))}
          </Tabs>
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
