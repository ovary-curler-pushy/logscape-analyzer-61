
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { SegmentedPanelsProps } from '@/types/chartTypes';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from 'sonner';
import RechartsDisplay from './RechartsDisplay';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from 'lucide-react';

const SegmentedPanels: React.FC<SegmentedPanelsProps> = ({
  timeSegments,
  signals,
  selectedSegment,
  onSegmentChange,
  chartType,
  getPanelSignals
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Calculate the optimal sampling factor based on segment data size
  const samplingFactor = useMemo(() => {
    const selectedSegmentData = timeSegments.find(s => s.id === selectedSegment)?.data || [];
    // Apply sampling for large datasets
    if (selectedSegmentData.length > 2000) {
      return Math.ceil(selectedSegmentData.length / 2000);
    }
    return 1;
  }, [timeSegments, selectedSegment]);

  // Handle segment navigation - memoized for performance
  const navigateSegment = useCallback((direction: 'next' | 'previous') => {
    const currentIndex = timeSegments.findIndex(s => s.id === selectedSegment);
    if (currentIndex === -1) return;
    
    let newIndex = currentIndex;
    if (direction === 'next') {
      newIndex = (currentIndex + 1) % timeSegments.length;
    } else {
      newIndex = (currentIndex - 1 + timeSegments.length) % timeSegments.length;
    }
    
    onSegmentChange(timeSegments[newIndex].id);
    toast.info(`Moved to ${direction} segment`, {
      duration: 2000
    });
  }, [timeSegments, selectedSegment, onSegmentChange]);

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

  // Log a sample data point for debugging
  if (selectedSegmentData.length > 0) {
    console.log('Sample segment data point:', selectedSegmentData[0]);
  }

  // Find current segment index for navigation
  const currentSegmentIndex = timeSegments.findIndex(s => s.id === selectedSegment);
  const currentSegment = timeSegments[currentSegmentIndex];

  return (
    <div className="space-y-4">
      <Tabs value={selectedSegment} onValueChange={onSegmentChange}>
        <div className="mb-2">
          <p className="text-sm text-muted-foreground mb-1">Time segments (approximately 5000 points each)</p>
          <div className="overflow-x-auto pb-2">
            <TabsList className="inline-flex flex-nowrap h-auto py-1 px-1">
              {timeSegments.map(segment => (
                <TabsTrigger 
                  key={segment.id} 
                  value={segment.id}
                  className="text-xs py-1 px-2 h-auto whitespace-nowrap"
                >
                  {format(new Date(segment.startTime), 'HH:mm:ss')} - {format(new Date(segment.endTime), 'HH:mm:ss')} 
                  <span className="text-xs text-muted-foreground ml-1">({segment.data.length} points)</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </div>
      </Tabs>

      {/* Segment navigation controls */}
      <div className="flex items-center justify-between">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigateSegment('previous')}
          disabled={timeSegments.length <= 1}
          className="flex items-center gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous Segment
        </Button>
        
        <span className="text-sm text-muted-foreground">
          Segment {currentSegmentIndex + 1} of {timeSegments.length}
        </span>
        
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigateSegment('next')}
          disabled={timeSegments.length <= 1}
          className="flex items-center gap-1"
        >
          Next Segment
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Segment chart display */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {currentSegment && (
              <>
                Time Segment: {format(new Date(currentSegment.startTime), 'HH:mm:ss.SSS')} - {format(new Date(currentSegment.endTime), 'HH:mm:ss.SSS')}
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]" ref={containerRef}>
            <RechartsDisplay
              chartType={chartType}
              visibleChartData={selectedSegmentData}
              signals={panelSignals}
              containerRef={containerRef}
              samplingFactor={samplingFactor}
              onZoomReset={() => {
                toast.info("Reset zoom on segment", {
                  duration: 2000
                });
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default React.memo(SegmentedPanels);
