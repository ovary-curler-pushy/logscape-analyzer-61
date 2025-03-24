
import React, { useRef, useState, useEffect } from 'react';
import { format } from 'date-fns';
import { SegmentedPanelsProps } from '@/types/chartTypes';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import VictoryChartDisplay from './VictoryChartDisplay';
import { toast } from 'sonner';

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

  // Handle zoom domain changes
  const handleZoomDomainChange = (domain: any) => {
    console.log("Zoom domain changed:", domain);
    setZoomDomain(domain);
    toast.info(`Zoomed to selected time range`);
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

  console.log("Selected segment data:", selectedSegmentData.length, "points");
  console.log("First data point:", selectedSegmentData[0]);

  return (
    <div className="space-y-4">
      <Tabs value={selectedSegment} onValueChange={onSegmentChange}>
        <div className="mb-2">
          <p className="text-sm text-muted-foreground mb-1">Time segments (15 minute intervals)</p>
          <div className="overflow-x-auto">
            <TabsList className="inline-flex whitespace-nowrap h-auto py-1 px-1">
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
            <VictoryChartDisplay
              chartType={chartType}
              visibleChartData={selectedSegmentData}
              signals={panelSignals}
              onZoomDomainChange={handleZoomDomainChange}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SegmentedPanels;
