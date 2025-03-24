
import { toast } from "sonner";
import { RegexPattern } from "@/components/regex/RegexManager";
import { LogData, Signal, CHART_COLORS, DataTimeRange, TimeSegment } from "@/types/chartTypes";

export const processLogDataInChunks = (
  content: string,
  regexPatterns: RegexPattern[],
  setChartData: React.Dispatch<React.SetStateAction<LogData[]>>,
  setFormattedChartData: React.Dispatch<React.SetStateAction<any[]>>,
  setSignals: React.Dispatch<React.SetStateAction<Signal[]>>,
  setPanels: React.Dispatch<React.SetStateAction<{id: string; signals: string[]}[]>>,
  setStringValueMap: React.Dispatch<React.SetStateAction<Record<string, Record<string, number>>>>,
  setProcessingStatus: React.Dispatch<React.SetStateAction<string>>,
  setIsProcessing: React.Dispatch<React.SetStateAction<boolean>>,
  setDataTimeRange: React.Dispatch<React.SetStateAction<DataTimeRange>>,
  formatDataCallback: (data: LogData[], valueMap: Record<string, Record<string, number>>) => void
) => {
  // Adaptive chunk size based on device memory
  const CHUNK_SIZE = 10000; // Increased for faster processing on capable machines
  const lines = content.split('\n');
  const totalLines = lines.length;
  const chunks = Math.ceil(totalLines / CHUNK_SIZE);
  
  // Clear previous data
  setChartData([]);
  setFormattedChartData([]);
  
  // Create signals for each pattern
  const newSignals: Signal[] = regexPatterns.map((pattern, index) => ({
    id: `signal-${Date.now()}-${index}`,
    name: pattern.name,
    pattern,
    color: CHART_COLORS[index % CHART_COLORS.length],
    visible: true
  }));
  
  setSignals(newSignals);
  setPanels([{ id: 'panel-1', signals: newSignals.map(s => s.id) }]);
  
  console.log(`Processing ${totalLines} lines in ${chunks} chunks of ${CHUNK_SIZE}`);
  
  let currentChunk = 0;
  const parsedData: LogData[] = [];
  const stringValues: Record<string, Set<string>> = {};
  const lastSeenValues: Record<string, number | string> = {};
  let minTimestamp: Date | null = null;
  let maxTimestamp: Date | null = null;
  
  const processChunk = () => {
    if (currentChunk >= chunks) {
      finalizeProcessing(parsedData, stringValues, minTimestamp, maxTimestamp);
      return;
    }
    
    setProcessingStatus(`Processing chunk ${currentChunk + 1} of ${chunks} (${Math.round(((currentChunk + 1) / chunks) * 100)}%)`);
    
    const startIdx = currentChunk * CHUNK_SIZE;
    const endIdx = Math.min((currentChunk + 1) * CHUNK_SIZE, totalLines);
    const chunkLines = lines.slice(startIdx, endIdx);
    
    let successCount = 0;
    
    chunkLines.forEach((line) => {
      if (!line.trim()) return;
      
      const timestampMatch = line.match(/^(\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}\.\d{6})/);
      
      if (timestampMatch) {
        try {
          const timestampStr = timestampMatch[1];
          const isoTimestamp = timestampStr
            .replace(/\//g, '-')
            .replace(' ', 'T')
            .substring(0, 23);
          
          const timestamp = new Date(isoTimestamp);
          
          if (isNaN(timestamp.getTime())) {
            return;
          }
          
          // Update min and max timestamps
          if (!minTimestamp || timestamp < minTimestamp) {
            minTimestamp = timestamp;
          }
          if (!maxTimestamp || timestamp > maxTimestamp) {
            maxTimestamp = timestamp;
          }
          
          const values: { [key: string]: number | string } = {};
          let hasNewValue = false;
          
          regexPatterns.forEach((pattern) => {
            try {
              const regex = new RegExp(pattern.pattern);
              const match = line.match(regex);
              
              if (match && match[1] !== undefined) {
                const value = isNaN(Number(match[1])) ? match[1] : Number(match[1]);
                values[pattern.name] = value;
                lastSeenValues[pattern.name] = value;
                hasNewValue = true;
                
                if (typeof value === 'string') {
                  if (!stringValues[pattern.name]) {
                    stringValues[pattern.name] = new Set<string>();
                  }
                  stringValues[pattern.name].add(value);
                }
                
                successCount++;
              }
            } catch (error) {
              // Silently ignore regex errors
            }
          });
          
          // Add last seen values for patterns not found in this line
          regexPatterns.forEach((pattern) => {
            if (!(pattern.name in values) && pattern.name in lastSeenValues) {
              values[pattern.name] = lastSeenValues[pattern.name];
            }
          });
          
          if (Object.keys(values).length > 0 && hasNewValue) {
            parsedData.push({ timestamp, values });
          }
        } catch (error) {
          // Silently ignore date parsing errors
        }
      }
    });
    
    const progress = Math.round(((currentChunk + 1) / chunks) * 100);
    if (progress % 10 === 0 || progress === 100) {
      toast.info(`Processing: ${progress}% - Found ${parsedData.length.toLocaleString()} data points so far`);
    }
    
    currentChunk++;
    
    // Use setTimeout with 0 ms for smoother UI updates
    setTimeout(processChunk, 0);
  };
  
  const finalizeProcessing = (parsedData: LogData[], stringValues: Record<string, Set<string>>, minTime: Date | null, maxTime: Date | null) => {
    setProcessingStatus("Finalizing data processing");
    console.log("Finalizing data processing, found", parsedData.length, "data points");
    
    // Use setTimeout to yield to browser
    setTimeout(() => {
      try {
        if (parsedData.length === 0) {
          toast.warning("No matching data found with the provided patterns");
          setIsProcessing(false);
          setProcessingStatus("");
          return;
        }
        
        // Sort data chronologically
        parsedData.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        
        // Create mapping for string values
        const newStringValueMap: Record<string, Record<string, number>> = {};
        
        Object.entries(stringValues).forEach(([key, valueSet]) => {
          newStringValueMap[key] = {};
          Array.from(valueSet).sort().forEach((value, index) => {
            newStringValueMap[key][value] = index + 1;
          });
        });
        
        console.log("String value mappings:", newStringValueMap);
        setStringValueMap(newStringValueMap);
        
        // Set the chart data
        setChartData(parsedData);
        
        // Set time range for data selection
        if (minTime && maxTime) {
          setDataTimeRange({
            min: minTime,
            max: maxTime,
            selected: {
              start: minTime,
              end: new Date(Math.min(minTime.getTime() + (15 * 60 * 1000), maxTime.getTime()))
            }
          });
        }
        
        toast.success(`Found ${parsedData.length.toLocaleString()} data points with the selected patterns`);
        setProcessingStatus("Formatting data for display");
        
        // Format data for display - will be segmented later
        optimizedFormatChartData(parsedData, newStringValueMap, formatDataCallback, setProcessingStatus, setIsProcessing);
      } catch (error) {
        console.error("Error finalizing data:", error);
        toast.error("Error finalizing data");
        setIsProcessing(false);
        setProcessingStatus("");
      }
    }, 0);
  };
  
  // Start processing the first chunk
  processChunk();
};

// Updated data formatting with performance optimizations
const optimizedFormatChartData = (
  data: LogData[],
  valueMap: Record<string, Record<string, number>>,
  formatDataCallback: (data: LogData[], valueMap: Record<string, Record<string, number>>) => void,
  setProcessingStatus: React.Dispatch<React.SetStateAction<string>>,
  setIsProcessing: React.Dispatch<React.SetStateAction<boolean>>
) => {
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
    try {
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
    } catch (error) {
      console.error("Error in processing batch:", error);
      setProcessingStatus("Error formatting data. Retrying with smaller batches...");
      
      // Try again with a smaller batch size
      const halfBatchSize = Math.max(100, Math.floor(BATCH_SIZE / 2));
      retryWithSmallerBatch(data, valueMap, halfBatchSize, result, setProcessingStatus, () => {
        finalizeBatches();
      });
    }
  };
  
  const finalizeBatches = () => {
    try {
      formatDataCallback(data, valueMap);
      setIsProcessing(false);
      setProcessingStatus("");
      toast.success("Chart data ready");
    } catch (error) {
      console.error("Error in finalizing data:", error);
      toast.error("Error preparing chart data");
      setIsProcessing(false);
      setProcessingStatus("");
    }
  };
  
  setTimeout(processBatch, 0);
};

// Utility to retry with smaller batch size for very large datasets
const retryWithSmallerBatch = (
  data: LogData[],
  valueMap: Record<string, Record<string, number>>,
  batchSize: number,
  existingResult: any[],
  setProcessingStatus: React.Dispatch<React.SetStateAction<string>>,
  onComplete: () => void
) => {
  console.log(`Retrying with smaller batch size: ${batchSize}`);
  
  const remainingData = data.slice(existingResult.length);
  const totalBatches = Math.ceil(remainingData.length / batchSize);
  let batchIndex = 0;
  
  const processBatch = () => {
    try {
      const startIdx = batchIndex * batchSize;
      const endIdx = Math.min((batchIndex + 1) * batchSize, remainingData.length);
      
      for (let i = startIdx; i < endIdx; i++) {
        const item = remainingData[i];
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
        
        existingResult.push(dataPoint);
      }
      
      const progress = Math.round(((batchIndex + 1) / totalBatches) * 100);
      setProcessingStatus(`Recovery formatting (${progress}%)`);
      
      batchIndex++;
      
      if (batchIndex < totalBatches) {
        setTimeout(processBatch, 0);
      } else {
        onComplete();
      }
    } catch (error) {
      console.error("Error in recovery batch processing:", error);
      
      // If still failing, try with even smaller batches or skip remaining
      if (batchSize > 50) {
        const smallerBatchSize = Math.max(50, Math.floor(batchSize / 2));
        console.log(`Further reducing batch size to: ${smallerBatchSize}`);
        retryWithSmallerBatch(
          data,
          valueMap,
          smallerBatchSize,
          existingResult,
          setProcessingStatus,
          onComplete
        );
      } else {
        console.warn("Giving up on processing remaining data, using partial results");
        onComplete();
      }
    }
  };
  
  setTimeout(processBatch, 0);
};

// New function to segment data into time periods
export const segmentDataByTime = (
  data: any[],
  segmentMinutes: number = 15
): TimeSegment[] => {
  if (!data || data.length === 0) return [];
  
  // Sort data by timestamp if not already sorted
  const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);
  
  const segments: TimeSegment[] = [];
  const segmentMs = segmentMinutes * 60 * 1000;
  
  let currentSegmentStart = sortedData[0].timestamp;
  let currentSegmentEnd = currentSegmentStart + segmentMs;
  let currentSegmentData = [];
  
  for (const point of sortedData) {
    if (point.timestamp <= currentSegmentEnd) {
      currentSegmentData.push(point);
    } else {
      // Create segment with accumulated data
      if (currentSegmentData.length > 0) {
        segments.push({
          startTime: new Date(currentSegmentStart),
          endTime: new Date(currentSegmentEnd),
          data: currentSegmentData,
          id: `segment-${segments.length + 1}`
        });
      }
      
      // Start new segment
      currentSegmentStart = Math.floor(point.timestamp / segmentMs) * segmentMs;
      currentSegmentEnd = currentSegmentStart + segmentMs;
      currentSegmentData = [point];
    }
  }
  
  // Add final segment
  if (currentSegmentData.length > 0) {
    segments.push({
      startTime: new Date(currentSegmentStart),
      endTime: new Date(currentSegmentEnd),
      data: currentSegmentData,
      id: `segment-${segments.length + 1}`
    });
  }
  
  return segments;
};

// Extract data for a specific time range
export const extractDataForTimeRange = (
  data: any[],
  timeRange: { start: Date, end: Date }
): any[] => {
  if (!data || data.length === 0) return [];
  
  const startTime = timeRange.start.getTime();
  const endTime = timeRange.end.getTime();
  
  return data.filter(point => {
    const timestamp = typeof point.timestamp === 'number' 
      ? point.timestamp 
      : point.timestamp.getTime();
    
    return timestamp >= startTime && timestamp <= endTime;
  });
};

// Function to sample data to a manageable size
export const sampleDataPoints = (data: any[], maxPoints: number = 500): any[] => {
  if (!data || data.length <= maxPoints) return data;
  
  const samplingRate = Math.ceil(data.length / maxPoints);
  return data.filter((_, idx) => idx % samplingRate === 0);
};
