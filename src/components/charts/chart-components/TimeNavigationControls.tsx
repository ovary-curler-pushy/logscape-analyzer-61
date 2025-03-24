
import React from 'react';
import { format } from 'date-fns';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TimeNavigationControlsProps } from '@/types/chartTypes';

const TimeNavigationControls: React.FC<TimeNavigationControlsProps> = ({
  timeNavigation,
  timeRangePreset,
  timeWindowSize,
  customTimeRange,
  selectedSegment,
  timeSegments,
  onTimeRangePresetChange,
  onTimeWindowSizeChange,
  onNavigateTimeWindow,
  onNavigateTime,
  onSegmentChange,
  isProcessing
}) => {
  const handleTimeWindowSizeChange = (value: number[]) => {
    onTimeWindowSizeChange(value[0]);
  };

  const formatTimeLabel = (date?: Date): string => {
    if (!date) return 'Not set';
    return format(date, 'MMM dd, HH:mm');
  };

  const getSegmentLabel = (segmentId: string): string => {
    const segment = timeSegments.find(s => s.id === segmentId);
    if (!segment) return 'Unknown segment';
    return `${format(segment.startTime, 'HH:mm')} - ${format(segment.endTime, 'HH:mm')} (${segment.data.length} points)`;
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 items-end">
        <div className="w-full max-w-[200px]">
          <p className="text-sm font-medium mb-1">View Mode</p>
          <Select
            value={timeNavigation === 'segments' ? 'segments' : timeRangePreset}
            onValueChange={onTimeRangePresetChange}
            disabled={isProcessing}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Data</SelectItem>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="6h">Last 6 Hours</SelectItem>
              <SelectItem value="12h">Last 12 Hours</SelectItem>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="3d">Last 3 Days</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="window">Time Window</SelectItem>
              <SelectItem value="pagination">Page by Page</SelectItem>
              <SelectItem value="segments">Time Segments</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {timeNavigation === 'window' && (
          <div className="flex-1 min-w-[200px]">
            <p className="text-sm font-medium mb-1">Window Size (hours)</p>
            <div className="pr-2 pl-2">
              <Slider
                value={[timeWindowSize]}
                min={1}
                max={24}
                step={1}
                onValueChange={handleTimeWindowSizeChange}
                disabled={isProcessing}
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>1h</span>
                <span>6h</span>
                <span>12h</span>
                <span>18h</span>
                <span>24h</span>
              </div>
            </div>
          </div>
        )}

        {timeNavigation === 'segments' && (
          <div className="flex-1 min-w-[200px]">
            <p className="text-sm font-medium mb-1">Time Segment</p>
            <Select
              value={selectedSegment || ''}
              onValueChange={onSegmentChange ? onSegmentChange : () => {}}
              disabled={isProcessing || timeSegments.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select segment" />
              </SelectTrigger>
              <SelectContent>
                {timeSegments.map(segment => (
                  <SelectItem key={segment.id} value={segment.id}>
                    {format(segment.startTime, 'HH:mm')} - {format(segment.endTime, 'HH:mm')} ({segment.data.length} pts)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {(timeNavigation === 'window' || timeNavigation === 'preset') && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateTime('backward')}
              disabled={isProcessing || !customTimeRange.start || !customTimeRange.end}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateTime('forward')}
              disabled={isProcessing || !customTimeRange.start || !customTimeRange.end}
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
        
        {timeNavigation === 'window' && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateTimeWindow('backward')}
              disabled={isProcessing}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous Window
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateTimeWindow('forward')}
              disabled={isProcessing}
            >
              Next Window <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
      
      {(customTimeRange.start || customTimeRange.end) && timeNavigation !== 'segments' && (
        <div className="text-xs text-muted-foreground">
          Current range: {formatTimeLabel(customTimeRange.start)} to {formatTimeLabel(customTimeRange.end)}
          {timeNavigation === 'window' && <span> | Window: {timeWindowSize} hours</span>}
        </div>
      )}
      
      {timeNavigation === 'segments' && selectedSegment && (
        <div className="text-xs text-muted-foreground">
          Selected segment: {getSegmentLabel(selectedSegment)}
        </div>
      )}
    </div>
  );
};

export default TimeNavigationControls;
