import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart as LineChartIcon, BarChart as BarChartIcon, RefreshCcw } from 'lucide-react';
import { RegexPattern } from "@/components/regex/RegexManager";
import ChartControls from "./chart-components/ChartControls";
import PanelTabsManager from "./chart-components/PanelTabsManager";
import ChartDisplay from "./chart-components/ChartDisplay";
import LogSample from "./chart-components/LogSample";
import TimeRangeSelector from "./chart-components/TimeRangeSelector";
import SegmentedPanels from "./chart-components/SegmentedPanels";
import { processLogDataInChunks, segmentDataByTime, extractDataForTimeRange, sampleDataPoints } from "@/utils/logProcessing";

import { 
  LogData, 
  Signal, 
  ChartPanel, 
  LogChartProps,
  TimeSegment,
  DataTimeRange 
} from "@/types/chartTypes";

// Constants
const MAX_CHART_POINTS = 5000;
const MAX_VISIBLE_POINTS = 1000; 
const SEGMENT_MINUTES = 15; // Each segment is 15 minutes

const LogChart: React.FC<LogChartProps> = ({ logContent, patterns, className }) => {
  // Data states
  const [chartData, setChartData] = useState<LogData[]>([]);
  const [formattedChartData, setFormattedChartData] = useState<any[]>([]);
  const [displayedChartData, setDisplayedChartData] = useState<any[]>([]);
  const [timeSegments, setTimeSegments] = useState<TimeSegment[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [panels, setPanels] = useState<ChartPanel[]>([{ id: 'panel-1', signals: [] }]);
  const [stringValueMap, setStringValueMap] = useState<Record<string, Record<string, number>>>({});
  const [rawLogSample, setRawLogSample] = useState<string[]>([]);
  
  // UI states
  const [activeTab, setActiveTab] = useState<string>("panel-1");
  const [selectedSegment, setSelectedSegment] = useState<string>("");
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [zoomDomain, setZoomDomain] = useState<{ start?: number, end?: number }>({});
  const [dataTimeRange, setDataTimeRange] = useState<DataTimeRange>({ 
    min: new Date(), 
    max: new Date(),
    selected: {
      start: new Date(),
      end: new Date()
    }
  });
  
  // View & navigation states
  const [timeNavigation, setTimeNavigation] = useState<'preset' | 'pagination' | 'window' | 'segments'>('preset');
  const [timeRangePreset, setTimeRangePreset] = useState<string>('all');
  const [timeWindowSize, setTimeWindowSize] = useState<number>(1); // Default 1 hour window
  const [customTimeRange, setCustomTimeRange] = useState<{ start?: Date, end?: Date }>({});
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [maxDisplayPoints, setMaxDisplayPoints] = useState<number>(MAX_CHART_POINTS);
  
  // Processing states
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStatus, setProcessingStatus] = useState<string>("");
  const [dataStats, setDataStats] = useState<{ 
    total: number, displayed: number, samplingRate: number, 
    currentPage?: number, totalPages?: number 
  }>({ 
    total: 0, displayed: 0, samplingRate: 1 
  });
  
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Process log data when logs & patterns are available
  useEffect(() => {
    if (!logContent || patterns.length === 0) return;
    
    try {
      setIsProcessing(true);
      setProcessingStatus("Starting to process log data");
      const logLines = logContent.split('\n');
      setRawLogSample(logLines.slice(0, 10));
      
      console.log("Processing log data with patterns:", patterns);
      console.log(`Starting to process ${logLines.length} log lines`);
      
      // Call the processing function with our new approach
      processLogDataInChunks(
        logContent, 
        patterns, 
        setChartData, 
        setFormattedChartData, 
        setSignals, 
        setPanels, 
        setStringValueMap, 
        setProcessingStatus, 
        setIsProcessing,
        setDataTimeRange,
        optimizedFormatChartData
      );
      
      toast.success("Started processing log data");
    } catch (error) {
      console.error("Error processing log data:", error);
      toast.error("Error processing log data");
      setIsProcessing(false);
    }
  }, [logContent, patterns]);
  
  // Format chart data optimized for our new approach
  const optimizedFormatChartData = useCallback((data: LogData[], valueMap: Record<string, Record<string, number>>) => {
    if (data.length === 0) {
      setIsProcessing(false);
      setProcessingStatus("");
      return;
    }

    setProcessingStatus("Formatting data (0%)");
    
    const getBatchSize = () => {
      if (data.length > 500000) return 1000;
      if (data.length > 100000) return 2000;
      if (data.length > 50000) return 5000;
      return 10000;
    };
    
    const BATCH_SIZE = getBatchSize();
    const totalBatches = Math.ceil(data.length / BATCH_SIZE);
    const result: any[] = [];
    
    let batchIndex = 0;
    
    const processBatch = () => {
      const isLastBatch = batchIndex === totalBatches - 1;
      
      const startIdx = batchIndex * BATCH_SIZE;
      const endIdx = Math.min((batchIndex + 1) * BATCH_SIZE, data.length);
      
      for (let i = startIdx; i < endIdx; i++) {
        const item = data[i];
        const dataPoint: any = {
          timestamp: item.timestamp.getTime(),
        };
        
        Object.entries(item.values).forEach(([key, value]) => {
          if (typeof value === 'string') {
            if (valueMap[key] && valueMap[key][value] !== undefined) {
              dataPoint[key] = valueMap[key][value];
              dataPoint[`${key}_original`] = value;
            } else {
              dataPoint[key] = 0;
            }
          } else {
            dataPoint[key] = value;
          }
        });
        
        result.push(dataPoint);
      }
      
      const progress = Math.round(((batchIndex + 1) / totalBatches) * 100);
      if (progress < 99 || isLastBatch) {
        setProcessingStatus(`Formatting data (${progress}%)`);
      }
      
      batchIndex++;
      
      if (batchIndex < totalBatches) {
        setTimeout(processBatch, 0);
      } else {
        finalizeBatches();
      }
    };
    
    const finalizeBatches = () => {
      setFormattedChartData(result);
      
      // For initial state, sample data to avoid overwhelming the UI
      try {
        const sampledData = sampleDataPoints(result, 200);
        setDisplayedChartData(sampledData);
        
        setDataStats({ 
          total: result.length, 
          displayed: sampledData.length, 
          samplingRate: Math.ceil(result.length / sampledData.length)
        });
      } catch (error) {
        console.error("Error sampling data:", error);
        setDisplayedChartData([]);
      }
      
      setIsProcessing(false);
      setProcessingStatus("");
      toast.success("Chart data ready");
    };
    
    setTimeout(processBatch, 0);
  }, []);
  
  // Handle time range changes - optimized version
  const handleTimeRangeChange = useCallback((range: { start: Date, end: Date }) => {
    console.log(`Time range selected: ${range.start.toISOString()} - ${range.end.toISOString()}`);
    
    setCustomTimeRange(range);
    setDataTimeRange(prev => ({
      ...prev,
      selected: range
    }));
    
    setIsProcessing(true);
    setProcessingStatus("Preparing time segments");
    
    // Process in next tick to allow UI to update
    setTimeout(() => {
      try {
        // Extract data for the selected time range
        const filteredData = extractDataForTimeRange(formattedChartData, range);
        console.log(`Extracted ${filteredData.length} data points for selected time range`);
        
        if (filteredData.length === 0) {
          toast.warning("No data points found in the selected time range");
          setIsProcessing(false);
          setProcessingStatus("");
          return;
        }
        
        // Create time segments for the filtered data
        const segments = segmentDataByTime(filteredData, SEGMENT_MINUTES);
        console.log(`Created ${segments.length} time segments`);
        
        setTimeSegments(segments);
        
        if (segments.length > 0) {
          setSelectedSegment(segments[0].id);
          setTimeNavigation('segments');
          setTimeRangePreset('segments');
          toast.success(`Created ${segments.length} time segments for selected range`);
        } else {
          toast.warning("Could not create time segments for the selected range");
        }
      } catch (error) {
        console.error("Error creating time segments:", error);
        toast.error("Error processing time range");
      } finally {
        setIsProcessing(false);
        setProcessingStatus("");
      }
    }, 0);
  }, [formattedChartData]);
  
  // Handle switching to a different segment
  const handleSegmentChange = useCallback((segmentId: string) => {
    console.log("Switching to segment:", segmentId);
    setSelectedSegment(segmentId);
    setZoomDomain({}); // Reset zoom when changing segments
  }, []);
  
  // Handle chart type change with debug info
  const handleChartTypeChange = useCallback((type: 'line' | 'bar') => {
    console.log(`Changing chart type from ${chartType} to ${type}`);
    setChartType(type);
    toast.info(`Switched to ${type} chart view`);
  }, [chartType]);
  
  // Handle zoom domain change from brush selection
  const handleBrushChange = useCallback((brushData: any) => {
    if (brushData && brushData.startValue !== undefined && brushData.endValue !== undefined) {
      console.log("Zoom domain updated:", brushData);
      
      setZoomDomain({
        start: brushData.startValue,
        end: brushData.endValue
      });
      
      toast.info("Zoomed to selected time range");
    } else {
      console.log("Invalid brush data:", brushData);
    }
  }, []);
  
  // Reset zoom domain
  const handleZoomReset = useCallback(() => {
    console.log("Resetting zoom domain");
    setZoomDomain({});
    toast.info("Zoom reset");
  }, []);
  
  // Handle max points change for display
  const handleMaxPointsChange = useCallback((value: number[]) => {
    const newMaxPoints = value[0];
    setMaxDisplayPoints(newMaxPoints);
  }, []);
  
  // Toggle time navigation mode & preset
  const handleTimeRangePresetChange = useCallback((preset: string) => {
    if (preset === 'segments') {
      setTimeNavigation('segments');
      setTimeRangePreset('segments');
    } else {
      setTimeRangePreset(preset);
      
      if (preset === 'pagination') {
        setTimeNavigation('pagination');
      } else if (preset === 'window') {
        setTimeNavigation('window');
      } else {
        setTimeNavigation('preset');
      }
    }
  }, []);
  
  // Panel management functions
  const handleAddPanel = useCallback(() => {
    const newPanelId = `panel-${panels.length + 1}`;
    setPanels([...panels, { id: newPanelId, signals: [] }]);
    setActiveTab(newPanelId);
  }, [panels]);

  const handleRemovePanel = useCallback((panelId: string) => {
    if (panels.length <= 1) {
      toast.error("Cannot remove the only panel");
      return;
    }
    
    const updatedPanels = panels.filter(panel => panel.id !== panelId);
    setPanels(updatedPanels);
    
    if (activeTab === panelId) {
      setActiveTab(updatedPanels[0].id);
    }
  }, [panels, activeTab]);

  const handleAddSignalToPanel = useCallback((panelId: string, signalId: string) => {
    setPanels(panels.map(panel => {
      if (panel.id === panelId) {
        if (!panel.signals.includes(signalId)) {
          return { ...panel, signals: [...panel.signals, signalId] };
        }
      }
      return panel;
    }));
  }, [panels]);

  const handleRemoveSignalFromPanel = useCallback((panelId: string, signalId: string) => {
    setPanels(panels.map(panel => {
      if (panel.id === panelId) {
        return { ...panel, signals: panel.signals.filter(id => id !== signalId) };
      }
      return panel;
    }));
  }, [panels]);

  const toggleSignalVisibility = useCallback((signalId: string) => {
    setSignals(signals.map(signal => {
      if (signal.id === signalId) {
        return { ...signal, visible: !signal.visible };
      }
      return signal;
    }));
  }, [signals]);
  
  // Get visible signals for a panel
  const getPanelSignals = useCallback((panelId: string) => {
    const panel = panels.find(p => p.id === panelId);
    if (!panel) return [];
    
    return signals.filter(signal => 
      panel.signals.includes(signal.id) && signal.visible
    );
  }, [panels, signals]);
  
  // Pagination UI rendering
  const renderPaginationControls = useCallback(() => {
    // Simplified for this example - can be expanded if needed
    return null;
  }, []);
  
  // Reset all data and settings
  const handleResetAll = useCallback(() => {
    setChartData([]);
    setFormattedChartData([]);
    setDisplayedChartData([]);
    setTimeSegments([]);
    setSignals([]);
    setPanels([{ id: 'panel-1', signals: [] }]);
    setActiveTab("panel-1");
    setChartType('line');
    setZoomDomain({});
    setStringValueMap({});
    setRawLogSample([]);
    setDataStats({ total: 0, displayed: 0, samplingRate: 1 });
    setCustomTimeRange({});
    setTimeRangePreset('all');
    setTimeNavigation('preset');
    setCurrentPage(1);
    setSelectedSegment("");
    toast.success("Reset all data and settings");
  }, []);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <LineChartIcon className="h-5 w-5" /> 
              Log Visualization
            </CardTitle>
            <CardDescription>
              Visualize patterns from your log data
            </CardDescription>
          </div>
          
          <div className="flex gap-2 items-center">
            {isProcessing && (
              <div className="flex items-center text-sm text-muted-foreground">
                <div className="w-4 h-4 mr-2 rounded-full border-2 border-t-primary animate-spin" />
                {processingStatus}
              </div>
            )}
            
            <Button 
              variant="outline" 
              size="sm" 
              disabled={isProcessing || formattedChartData.length === 0}
              title="Reset chart"
              onClick={handleResetAll}
            >
              <RefreshCcw className="h-4 w-4 mr-1" /> Reset
            </Button>
            
            <div className="flex gap-1">
              <Button
                variant={chartType === 'line' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleChartTypeChange('line')}
                title="Line chart"
                disabled={isProcessing}
              >
                <LineChartIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={chartType === 'bar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleChartTypeChange('bar')}
                title="Bar chart"
                disabled={isProcessing}
              >
                <BarChartIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {isProcessing && chartData.length === 0 && (
          <div className="py-16 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 mb-4 rounded-full border-4 border-t-primary animate-spin" />
            <h3 className="text-lg font-medium mb-1">Processing log data</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              {processingStatus || "Extracting patterns from your log file..."}
            </p>
          </div>
        )}
        
        {!isProcessing && chartData.length === 0 && (
          <div className="py-16 flex flex-col items-center justify-center text-center">
            <LineChartIcon className="w-12 h-12 mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium mb-1">No visualization data yet</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Select patterns to extract data from your logs.
            </p>
          </div>
        )}
        
        {chartData.length > 0 && (
          <div className="space-y-4">
            {/* Time Range Selector */}
            <TimeRangeSelector
              dataTimeRange={dataTimeRange}
              onTimeRangeChange={handleTimeRangeChange}
              isProcessing={isProcessing}
            />
            
            {/* Chart Controls */}
            <ChartControls 
              dataStats={dataStats}
              timeNavigation={timeNavigation}
              timeRangePreset={timeRangePreset}
              timeWindowSize={timeWindowSize}
              customTimeRange={customTimeRange}
              maxDisplayPoints={maxDisplayPoints}
              chartType={chartType}
              zoomDomain={zoomDomain}
              formattedChartData={formattedChartData}
              currentPage={currentPage}
              isProcessing={isProcessing}
              selectedSegment={selectedSegment}
              timeSegments={timeSegments}
              onTimeRangePresetChange={handleTimeRangePresetChange}
              onTimeWindowSizeChange={setTimeWindowSize}
              onNavigateTimeWindow={() => {}}
              onNavigateTime={() => {}}
              onMaxPointsChange={handleMaxPointsChange}
              onChartTypeChange={handleChartTypeChange}
              onZoomReset={handleZoomReset}
              onSegmentChange={handleSegmentChange}
              renderPaginationControls={renderPaginationControls}
            />
            
            <div className="text-xs flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
              <div>Total data points: <span className="font-medium">{dataStats.total.toLocaleString()}</span></div>
              {timeNavigation === 'segments' && (
                <>
                  <div>Time segments: <span className="font-medium">{timeSegments.length}</span></div>
                  <div>Segment size: <span className="font-medium">{SEGMENT_MINUTES} minutes</span></div>
                </>
              )}
            </div>
            
            {/* Segmented Panels - Shown when in segment mode */}
            {timeNavigation === 'segments' && timeSegments.length > 0 && (
              <SegmentedPanels
                timeSegments={timeSegments}
                signals={signals}
                selectedSegment={selectedSegment}
                onSegmentChange={handleSegmentChange}
                chartType={chartType}
                getPanelSignals={getPanelSignals}
              />
            )}
            
            {/* Standard Panel View - Shown when not in segment mode */}
            {timeNavigation !== 'segments' && (
              <PanelTabsManager
                panels={panels}
                activeTab={activeTab}
                signals={signals}
                onActiveTabChange={setActiveTab}
                onAddPanel={handleAddPanel}
                onRemovePanel={handleRemovePanel}
                onAddSignal={handleAddSignalToPanel}
                onRemoveSignal={handleRemoveSignalFromPanel}
                onToggleSignalVisibility={toggleSignalVisibility}
                renderChartDisplay={(panelId) => (
                  <ChartDisplay
                    containerRef={containerRef}
                    chartType={chartType}
                    visibleChartData={displayedChartData}
                    zoomDomain={zoomDomain}
                    signals={getPanelSignals(panelId)}
                    onBrushChange={handleBrushChange}
                  />
                )}
              />
            )}
            
            {/* Log Sample Display */}
            <LogSample rawLogSample={rawLogSample} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LogChart;
