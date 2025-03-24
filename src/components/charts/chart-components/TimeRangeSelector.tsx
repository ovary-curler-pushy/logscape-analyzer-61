
import React, { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { TimeRangeSelectorProps } from '@/types/chartTypes';

const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({
  dataTimeRange,
  onTimeRangeChange,
  isProcessing
}) => {
  const [startDate, setStartDate] = useState<Date | undefined>(dataTimeRange.selected.start);
  const [endDate, setEndDate] = useState<Date | undefined>(dataTimeRange.selected.end);
  const [timeWindow, setTimeWindow] = useState<number>(15); // Default 15 minutes
  
  // Calculate min & max hours/minutes for display
  const startHours = startDate ? startDate.getHours() : 0;
  const startMinutes = startDate ? startDate.getMinutes() : 0;
  const endHours = endDate ? endDate.getHours() : 0;
  const endMinutes = endDate ? endDate.getMinutes() : 0;

  const handleApplyTimeRange = useCallback(() => {
    if (startDate && endDate) {
      onTimeRangeChange({ start: startDate, end: endDate });
    }
  }, [startDate, endDate, onTimeRangeChange]);

  const handleTimeWindowChange = useCallback((value: number[]) => {
    const minutes = value[0];
    setTimeWindow(minutes);
    
    if (startDate) {
      const newEnd = new Date(startDate.getTime());
      newEnd.setMinutes(startDate.getMinutes() + minutes);
      
      // Ensure new end doesn't exceed data max
      if (newEnd > dataTimeRange.max) {
        newEnd.setTime(dataTimeRange.max.getTime());
      }
      
      setEndDate(newEnd);
    }
  }, [startDate, dataTimeRange.max]);

  const handleHourChange = useCallback((type: 'start' | 'end', value: string) => {
    const hours = parseInt(value);
    
    if (type === 'start' && startDate) {
      const newDate = new Date(startDate);
      newDate.setHours(hours);
      setStartDate(newDate);
    } else if (type === 'end' && endDate) {
      const newDate = new Date(endDate);
      newDate.setHours(hours);
      setEndDate(newDate);
    }
  }, [startDate, endDate]);

  const handleMinuteChange = useCallback((type: 'start' | 'end', value: string) => {
    const minutes = parseInt(value);
    
    if (type === 'start' && startDate) {
      const newDate = new Date(startDate);
      newDate.setMinutes(minutes);
      setStartDate(newDate);
    } else if (type === 'end' && endDate) {
      const newDate = new Date(endDate);
      newDate.setMinutes(minutes);
      setEndDate(newDate);
    }
  }, [startDate, endDate]);

  // Generate hours and minutes options
  const hoursOptions = Array.from({ length: 24 }, (_, i) => i);
  const minutesOptions = Array.from({ length: 60 }, (_, i) => i);

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Select Time Range</CardTitle>
        <CardDescription>
          Choose a time range from the available data ({format(dataTimeRange.min, 'MMM dd, HH:mm')} to {format(dataTimeRange.max, 'MMM dd, HH:mm')})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="mb-2 text-sm font-medium">Start Date & Time</div>
            <div className="flex items-center gap-2 mb-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="justify-start text-left font-normal flex-1"
                    disabled={isProcessing}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'MMM dd, yyyy') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => {
                      if (date) {
                        const newDate = new Date(date);
                        if (startDate) {
                          newDate.setHours(startDate.getHours());
                          newDate.setMinutes(startDate.getMinutes());
                        }
                        setStartDate(newDate);
                      }
                    }}
                    disabled={(date) => 
                      date < dataTimeRange.min || 
                      date > dataTimeRange.max
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              
              <div className="flex items-center gap-1">
                <Select 
                  value={startHours.toString()} 
                  onValueChange={(value) => handleHourChange('start', value)}
                  disabled={isProcessing || !startDate}
                >
                  <SelectTrigger className="w-16">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {hoursOptions.map((hour) => (
                      <SelectItem key={`start-hour-${hour}`} value={hour.toString()}>
                        {hour.toString().padStart(2, '0')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span>:</span>
                <Select 
                  value={startMinutes.toString()} 
                  onValueChange={(value) => handleMinuteChange('start', value)}
                  disabled={isProcessing || !startDate}
                >
                  <SelectTrigger className="w-16">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {minutesOptions.map((minute) => (
                      <SelectItem key={`start-minute-${minute}`} value={minute.toString()}>
                        {minute.toString().padStart(2, '0')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="mb-2 text-sm font-medium">Time Window (minutes)</div>
            <div className="px-1">
              <Slider
                defaultValue={[timeWindow]}
                max={120}
                min={1}
                step={1}
                onValueChange={handleTimeWindowChange}
                disabled={isProcessing || !startDate}
              />
              <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                <span>1m</span>
                <span>30m</span>
                <span>60m</span>
                <span>90m</span>
                <span>120m</span>
              </div>
            </div>
          </div>
          
          <div>
            <div className="mb-2 text-sm font-medium">End Date & Time</div>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="justify-start text-left font-normal flex-1"
                    disabled={isProcessing}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'MMM dd, yyyy') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => {
                      if (date) {
                        const newDate = new Date(date);
                        if (endDate) {
                          newDate.setHours(endDate.getHours());
                          newDate.setMinutes(endDate.getMinutes());
                        }
                        setEndDate(newDate);
                      }
                    }}
                    disabled={(date) => 
                      date < dataTimeRange.min || 
                      date > dataTimeRange.max ||
                      (startDate && date < startDate)
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              
              <div className="flex items-center gap-1">
                <Select 
                  value={endHours.toString()} 
                  onValueChange={(value) => handleHourChange('end', value)}
                  disabled={isProcessing || !endDate}
                >
                  <SelectTrigger className="w-16">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {hoursOptions.map((hour) => (
                      <SelectItem key={`end-hour-${hour}`} value={hour.toString()}>
                        {hour.toString().padStart(2, '0')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span>:</span>
                <Select 
                  value={endMinutes.toString()} 
                  onValueChange={(value) => handleMinuteChange('end', value)}
                  disabled={isProcessing || !endDate}
                >
                  <SelectTrigger className="w-16">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {minutesOptions.map((minute) => (
                      <SelectItem key={`end-minute-${minute}`} value={minute.toString()}>
                        {minute.toString().padStart(2, '0')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="mt-6">
              <p className="text-sm text-muted-foreground mb-2">
                Selected window: <span className="font-medium">{timeWindow} minutes</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {startDate && endDate ? (
                  <>
                    From {format(startDate, 'MMM dd, yyyy HH:mm')} to {format(endDate, 'MMM dd, yyyy HH:mm')}
                  </>
                ) : (
                  'Select start and end times'
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="mt-4 flex justify-end">
          <Button
            onClick={handleApplyTimeRange}
            disabled={isProcessing || !startDate || !endDate}
          >
            <Clock className="mr-2 h-4 w-4" />
            Apply Time Range
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TimeRangeSelector;
