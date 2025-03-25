import React, { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RechartsDisplay from "./chart-components/RechartsDisplay";
import PanelTabsManager from "./chart-components/PanelTabsManager";
import SegmentedPanels from "./chart-components/SegmentedPanels";
import { LogChartProps, Signal, ChartPanel, TimeSegment, CHART_COLORS } from '@/types/chartTypes';
import { processLogDataInChunks, mapStringValueToNumber } from '@/utils/logProcessing';

const POINTS_PER_PANEL = 5000;

const LogChart: React.FC<LogChartProps> = ({ logContent, patterns, className }) => {
  // Basic states
  const [rawChartData, setRawChartData] = useState<any[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [panels, setPanels] = useState<ChartPanel[]>([]);
  const [activePanel, setActivePanel] = useState<string>("");
  const [timeSegments, setTimeSegments] = useState<TimeSegment[]>([]);
  const [selectedSegment, setSelectedSegment] = useState<string>("");
  const [viewMode, setViewMode] = useState<'panels' | 'segments'>('panels');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("");
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [stringValueMap, setStringValueMap] = useState<Record<string, Record<string, number>>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize the panels when signals change
  useEffect(() => {
    if (signals.length > 0 && panels.length === 0) {
      const initialPanel: ChartPanel = {
        id: 'panel-1',
        signals: signals.map(s => s.id)
      };
      setPanels([initialPanel]);
      setActivePanel('panel-1');
    }
  }, [signals, panels]);

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
      setPanels,
      setStringValueMap,
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
          ? item.timestamp.getTime() // Convert Date object to number
          : new Date(item.timestamp).getTime(); // Convert string date to number
        
        const result: any = { timestamp };
        
        // Flatten values from the values object
        Object.entries(item.values || {}).forEach(([key, value]) => {
          if (typeof value === 'number') {
            result[key] = value;
          } else if (typeof value === 'string') {
            // Apply string value mapping
            const numValue = mapStringValueToNumber(key, value, stringValueMap);
            result[key] = numValue;
            result[`${key}_original`] = value; // Keep original string value
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
      
      toast.success(`Data divided into ${segments.length} segments`);
    } catch (error) {
      console.error('Error formatting data:', error);
      toast.error('Error preparing chart data');
    }

    setIsProcessing(false);
  }, [stringValueMap]);

  // Panel management functions
  const handleAddPanel = useCallback(() => {
    const newPanelId = `panel-${panels.length + 1}`;
    const newPanel: ChartPanel = {
      id: newPanelId,
      signals: []
    };
    
    setPanels(prev => [...prev, newPanel]);
    setActivePanel(newPanelId);
    toast.success(`Added new panel: ${newPanelId}`);
  }, [panels]);

  const handleRemovePanel = useCallback((panelId: string) => {
    if (panels.length <= 1) return;
    
    setPanels(prev => {
      const filtered = prev.filter(p => p.id !== panelId);
      if (activePanel === panelId && filtered.length > 0) {
        setActivePanel(filtered[0].id);
      }
      return filtered;
    });
    
    toast.info(`Removed panel: ${panelId}`);
  }, [panels, activePanel]);

  const handleAddSignal = useCallback((panelId: string, signalId: string) => {
    setPanels(prev => 
      prev.map(panel => 
        panel.id === panelId
          ? { ...panel, signals: [...panel.signals, signalId] }
          : panel
      )
    );
  }, []);

  const handleRemoveSignal = useCallback((panelId: string, signalId: string) => {
    setPanels(prev => 
      prev.map(panel => 
        panel.id === panelId
          ? { ...panel, signals: panel.signals.filter(id => id !== signalId) }
          : panel
      )
    );
  }, []);

  const handleToggleSignalVisibility = useCallback((signalId: string) => {
    setSignals(prev => 
      prev.map(signal => 
        signal.id === signalId
          ? { ...signal, visible: !signal.visible }
          : signal
      )
    );
  }, []);

  // Handle chart type changes
  const handleChartTypeChange = useCallback((type: 'line' | 'bar') => {
    setChartType(type);
    toast.info(`Switched to ${type} chart view`);
  }, []);

  // Get the visible signals for a specific panel
  const getPanelSignals = useCallback((panelId: string) => {
    const panel = panels.find(p => p.id === panelId);
    if (!panel) return [];
    
    return signals
      .filter(signal => panel.signals.includes(signal.id) && signal.visible);
  }, [signals, panels]);
  
  // Handle zoom reset
  const handleZoomReset = useCallback(() => {
    toast.info("Zoom reset to default view");
  }, []);
  
  // Render chart display for a specific panel
  const renderPanelChartDisplay = useCallback((panelId: string) => {
    const currentSegment = timeSegments.find(s => s.id === selectedSegment);
    if (!currentSegment) return null;
    
    const panelSignals = getPanelSignals(panelId);
    
    return (
      <div className="h-[300px]" ref={containerRef}>
        <RechartsDisplay
          chartType={chartType}
          visibleChartData={currentSegment.data}
          signals={panelSignals}
          containerRef={containerRef}
          onZoomReset={handleZoomReset}
        />
      </div>
    );
  }, [timeSegments, selectedSegment, getPanelSignals, chartType, handleZoomReset]);

  // View mode toggle
  const handleViewModeChange = useCallback((mode: 'panels' | 'segments') => {
    setViewMode(mode);
    toast.info(`Switched to ${mode} view`);
  }, []);

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

            <Tabs value={viewMode} onValueChange={(v: string) => handleViewModeChange(v as 'panels' | 'segments')}>
              <TabsList className="h-8">
                <TabsTrigger value="panels" className="text-xs px-2">Separate Panels</TabsTrigger>
                <TabsTrigger value="segments" className="text-xs px-2">Time Segments</TabsTrigger>
              </TabsList>
            </Tabs>

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
          viewMode === 'panels' ? (
            <PanelTabsManager
              panels={panels}
              activeTab={activePanel}
              signals={signals}
              onActiveTabChange={setActivePanel}
              onAddPanel={handleAddPanel}
              onRemovePanel={handleRemovePanel}
              onAddSignal={handleAddSignal}
              onRemoveSignal={handleRemoveSignal}
              onToggleSignalVisibility={handleToggleSignalVisibility}
              renderChartDisplay={renderPanelChartDisplay}
            />
          ) : (
            <SegmentedPanels
              timeSegments={timeSegments}
              signals={signals}
              selectedSegment={selectedSegment}
              onSegmentChange={setSelectedSegment}
              chartType={chartType}
              getPanelSignals={getPanelSignals}
            />
          )
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
