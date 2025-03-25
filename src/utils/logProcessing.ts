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
  // Adaptive chunk size based on content length
  const totalSize = content.length;
  const CHUNK_SIZE = totalSize > 1000000 ? 15000 : 10000; // Larger chunks for bigger files
  
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
  
  // Store all unique string values per signal
  const stringValueSets: Record<string, Set<string>> = {};
  const stringValueMaps: Record<string, Record<string, number>> = {};
  
  // For keeping track of last seen values
  // Define our value types with a discriminated union for type safety
  type NumericValue = { type: 'numeric'; value: number; };
  type StringValue = { type: 'string'; value: string; mappedValue: number; };
  type LastSeenValue = NumericValue | StringValue;
  
  const lastSeenValues: Record<string, LastSeenValue> = {};
  
  let minTimestamp: Date | null = null;
  let maxTimestamp: Date | null = null;
  
  // Pre-compile regex patterns for better performance
  const compiledPatterns = regexPatterns.map(pattern => {
    try {
      return {
        name: pattern.name,
        regex: new RegExp(pattern.pattern)
      };
    } catch (e) {
      console.error(`Invalid regex pattern: ${pattern.pattern}`);
      return null;
    }
  }).filter(Boolean);
  
  // More efficient timestamp regex
  const timestampRegex = /^(\d{4}[\/\-]\d{2}[\/\-]\d{2}[\sT]\d{2}:\d{2}:\d{2}(?:\.\d+)?)/;
  
  // First pass: identify and map all string values
  const collectStringValues = () => {
    setProcessingStatus("Identifying unique string values in the log data...");
    
    // First scan through and collect all unique string values by signal
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      for (const pattern of compiledPatterns) {
        if (!pattern) continue;
        
        try {
          const match = line.match(pattern.regex);
          if (match && match[1] !== undefined) {
            const value = match[1].trim();
            
            // If it's not a number, store it as a string value
            if (isNaN(Number(value))) {
              if (!stringValueSets[pattern.name]) {
                stringValueSets[pattern.name] = new Set<string>();
              }
              stringValueSets[pattern.name].add(value);
            }
          }
        } catch (error) {
          // Skip on regex errors
        }
      }
      
      // Update status occasionally
      if (i % 50000 === 0) {
        setProcessingStatus(`Scanning for string values: ${Math.round((i / lines.length) * 100)}%`);
      }
    }
    
    // Create numeric mappings for string values (alphabetically sorted)
    for (const signalName of Object.keys(stringValueSets)) {
      const values = Array.from(stringValueSets[signalName]).sort();
      stringValueMaps[signalName] = {};
      
      values.forEach((value, index) => {
        stringValueMaps[signalName][value] = index; // Use index as numeric value
      });
      
      console.log(`Created mapping for ${signalName}: `, 
        Object.fromEntries(values.map((v, i) => [v, i])));
    }
    
    // Save the mapping for later use
    setStringValueMap(stringValueMaps);
    
    // Move to the second pass - actual data extraction
    processChunk();
  };
  
  // Process log data in chunks
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
    
    for (let i = 0; i < chunkLines.length; i++) {
      const line = chunkLines[i];
      if (!line.trim()) continue;
      
      // Extract timestamp
      const timestampMatch = line.match(timestampRegex);
      
      if (timestampMatch) {
        try {
          const timestampStr = timestampMatch[1];
          // Convert to ISO format for better parsing
          const isoTimestamp = timestampStr
            .replace(/\//g, '-')
            .replace(' ', 'T');
          
          const timestamp = new Date(isoTimestamp);
          
          if (isNaN(timestamp.getTime())) {
            continue;
          }
          
          // Update min and max timestamps
          if (!minTimestamp || timestamp < minTimestamp) {
            minTimestamp = timestamp;
          }
          if (!maxTimestamp || timestamp > maxTimestamp) {
            maxTimestamp = timestamp;
          }
          
          // Extract values from this line
          const values: { [key: string]: number | string } = {};
          let hasNewValue = false;
          
          for (const pattern of compiledPatterns) {
            if (!pattern) continue;
            
            try {
              const match = line.match(pattern.regex);
              
              if (match && match[1] !== undefined) {
                const extractedValue = match[1].trim();
                const signalName = pattern.name;
                
                // Handle numeric values
                if (!isNaN(Number(extractedValue))) {
                  const numValue = Number(extractedValue);
                  values[signalName] = numValue;
                  lastSeenValues[signalName] = { 
                    type: 'numeric', 
                    value: numValue 
                  };
                  hasNewValue = true;
                } 
                // Handle string values - improved handling
                else {
                  if (stringValueMaps[signalName] && stringValueMaps[signalName][extractedValue] !== undefined) {
                    const mappedValue = stringValueMaps[signalName][extractedValue];
                    
                    // Store the NUMERIC value for charting
                    values[signalName] = mappedValue;
                    
                    // Store the ORIGINAL string value for tooltips
                    values[`${signalName}_original`] = extractedValue;
                    
                    lastSeenValues[signalName] = {
                      type: 'string',
                      value: extractedValue,
                      mappedValue: mappedValue
                    };
                    
                    hasNewValue = true;
                  }
                }
                
                successCount++;
              }
            } catch (error) {
              // Skip on regex errors
            }
          }
          
          // Add last seen values for signals not found in this line (data continuity)
          for (const pattern of compiledPatterns) {
            if (!pattern) continue;
            const signalName = pattern.name;
            
            if (!(signalName in values) && (signalName in lastSeenValues)) {
              const lastSeen = lastSeenValues[signalName];
              
              if (lastSeen.type === 'numeric') {
                values[signalName] = lastSeen.value;
              } else {
                // For string values, add both numeric mapping and original value
                values[signalName] = lastSeen.mappedValue;
                values[`${signalName}_original`] = lastSeen.value;
              }
            }
          }
          
          // Only add data points that have at least one new value
          if (Object.keys(values).length > 0 && hasNewValue) {
            parsedData.push({ timestamp, values });
          }
        } catch (error) {
          console.error("Error processing line:", error);
        }
      }
    }
    
    const progress = Math.round(((currentChunk + 1) / chunks) * 100);
    if (progress % 10 === 0 || progress === 100) {
      toast.info(`Processing: ${progress}% - Found ${parsedData.length.toLocaleString()} data points so far`);
    }
    
    currentChunk++;
    
    // Use requestAnimationFrame for better performance
    if (window.requestAnimationFrame) {
      window.requestAnimationFrame(processChunk);
    } else {
      setTimeout(processChunk, 0);
    }
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
    
    if (formatDataCallback) {
      formatDataCallback(parsedData);
    }
  };

  // Start processing - first collect string values, then process data
  collectStringValues();
};

// Helper function to map string values to their numeric equivalents based on the mapping
export const mapStringValueToNumber = (
  signalName: string, 
  stringValue: string, 
  stringValueMap: Record<string, Record<string, number>>
): number => {
  if (!stringValueMap || !stringValueMap[signalName] || !(stringValue in stringValueMap[signalName])) {
    // Return default value if mapping doesn't exist
    return -1;
  }
  
  return stringValueMap[signalName][stringValue];
};

// Helper to extract data for a specific time range
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
