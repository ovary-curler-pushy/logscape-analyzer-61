
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
  formatDataCallback: (data: LogData[]) => void
) => {
  // Adaptive chunk size based on device memory
  const CHUNK_SIZE = 10000; // Increased for faster processing on capable machines
  const lines = content.split('\n');
  const totalLines = lines.length;
  const chunks = Math.ceil(totalLines / CHUNK_SIZE);
  
  // Clear previous data
  setChartData([]);
  
  // Create signals for each pattern
  const newSignals: Signal[] = regexPatterns.map((pattern, index) => ({
    id: `signal-${Date.now()}-${index}`,
    name: pattern.name,
    pattern,
    color: CHART_COLORS[index % CHART_COLORS.length],
    visible: true
  }));
  
  setSignals(newSignals);
  
  console.log(`Processing ${totalLines} lines in ${chunks} chunks of ${CHUNK_SIZE}`);
  
  let currentChunk = 0;
  const parsedData: LogData[] = [];
  const stringValues: Record<string, Set<string>> = {};
  const lastSeenValues: Record<string, number | string> = {};
  let minTimestamp: Date | null = null;
  let maxTimestamp: Date | null = null;
  
  const processChunk = () => {
    if (currentChunk >= chunks) {
      finalizeProcessing(parsedData);
      return;
    }
    
    setProcessingStatus(`Processing chunk ${currentChunk + 1} of ${chunks} (${Math.round(((currentChunk + 1) / chunks) * 100)}%)`);
    
    const startIdx = currentChunk * CHUNK_SIZE;
    const endIdx = Math.min((currentChunk + 1) * CHUNK_SIZE, totalLines);
    const chunkLines = lines.slice(startIdx, endIdx);
    
    let successCount = 0;
    
    chunkLines.forEach((line) => {
      if (!line.trim()) return;
      
      // More flexible timestamp regex to catch more formats
      const timestampMatch = line.match(/^(\d{4}[\/\-]\d{2}[\/\-]\d{2}[\sT]\d{2}:\d{2}:\d{2}(?:\.\d+)?)/);
      
      if (timestampMatch) {
        try {
          const timestampStr = timestampMatch[1];
          // Convert to ISO format for better parsing
          const isoTimestamp = timestampStr
            .replace(/\//g, '-')
            .replace(' ', 'T');
          
          const timestamp = new Date(isoTimestamp);
          
          if (isNaN(timestamp.getTime())) {
            console.log("Invalid timestamp:", timestampStr);
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
          console.error("Error processing line:", error);
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
  
  const finalizeProcessing = (parsedData: LogData[]) => {
    if (parsedData.length === 0) {
      toast.warning("No matching data found with the provided patterns");
      setIsProcessing(false);
      setProcessingStatus("");
      return;
    }

    // Sort data chronologically
    parsedData.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    console.log("Processing completed, found", parsedData.length, "data points");
    console.log("Sample data point:", parsedData[0]);
    
    if (formatDataCallback) {
      formatDataCallback(parsedData);
    }
  };

  // Start processing
  processChunk();
};

export const extractDataForTimeRange = (data: any[], range: { start: Date, end: Date }): any[] => {
  if (!data || data.length === 0) return [];
  
  const startTime = range.start.getTime();
  const endTime = range.end.getTime();
  
  return data.filter(point => {
    const timestamp = typeof point.timestamp === 'number' 
      ? point.timestamp 
      : point.timestamp.getTime();
    return timestamp >= startTime && timestamp <= endTime;
  });
};
