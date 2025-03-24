
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from "sonner";
import { FileText, Wand, RefreshCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import VictoryChartDisplay from "./chart-components/VictoryChartDisplay";
import { LogChartProps } from '@/types/chartTypes';
import { processLogDataInChunks } from '@/utils/logProcessing';

const POINTS_PER_PANEL = 5000;

const LogChart: React.FC<LogChartProps> = ({ logContent, patterns, className }) => {
  // Basic states
  const [chartData, setChartData] = useState<any[]>([]);
  const [signals, setSignals] = useState<any[]>([]);
  const [panels, setPanels] = useState<any[]>([]);
  const [activePanel, setActivePanel] = useState<string>("0");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("");
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');

  // Process log data when inputs change
  useEffect(() => {
    if (!logContent || patterns.length === 0) return;

    setIsProcessing(true);
    processLogDataInChunks(
      logContent,
      patterns,
      setChartData,
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
      return;
    }

    try {
      // Sort data by timestamp
      const sortedData = [...data].sort((a, b) => 
        a.timestamp.getTime() - b.timestamp.getTime()
      );

      // Create panels based on data points count
      const totalPanels = Math.ceil(sortedData.length / POINTS_PER_PANEL);
      const newPanels = Array.from({ length: totalPanels }, (_, index) => {
        const start = index * POINTS_PER_PANEL;
        const end = Math.min((index + 1) * POINTS_PER_PANEL, sortedData.length);
        return {
          id: index.toString(),
          data: sortedData.slice(start, end),
          range: {
            start: new Date(sortedData[start].timestamp),
            end: new Date(sortedData[end - 1].timestamp)
          }
        };
      });

      setPanels(newPanels);
      setActivePanel("0");
      
      console.log(`Created ${newPanels.length} panels with ${POINTS_PER_PANEL} points each`);
      toast.success(`Data divided into ${newPanels.length} panels`);
    } catch (error) {
      console.error('Error formatting data:', error);
      toast.error('Error preparing chart data');
    }

    setIsProcessing(false);
  }, []);

  // Handle zoom domain changes
  const handleZoomDomainChange = useCallback((domain: any) => {
    console.log('Zoom domain changed:', domain);
  }, []);

  // Handle chart type changes
  const handleChartTypeChange = useCallback((type: 'line' | 'bar') => {
    setChartType(type);
    toast.info(`Switched to ${type} chart view`);
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
            <TabsList className="mb-4">
              {panels.map((panel) => (
                <TabsTrigger key={panel.id} value={panel.id}>
                  Panel {parseInt(panel.id) + 1}
                </TabsTrigger>
              ))}
            </TabsList>

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
