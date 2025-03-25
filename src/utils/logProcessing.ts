
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
  
  // For string-to-number mapping, store all unique string values per signal
  const stringValueSets: Record<string, Set<string>> = {};
  const stringValueMaps: Record<string, Record<string, number>> = {};
  
  // Updated to properly handle mixed types for last seen values
  type LastSeenValueType = { type: 'number', value: number } | { type: 'string', value: string };
  const lastSeenValues: Record<string, LastSeenValueType> = {};
  
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
  
  // First pass: collect all unique string values for each signal
  const collectUniqueStringValues = () => {
    console.log("Starting first pass to collect unique string values");
    let processedLines = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      for (const pattern of compiledPatterns) {
        if (!pattern) continue;
        
        try {
          const match = line.match(pattern.regex);
          
          if (match && match[1] !== undefined) {
            const value = match[1];
            
            // If the value is a string (not a number), add it to the set
            if (isNaN(Number(value))) {
              if (!stringValueSets[pattern.name]) {
                stringValueSets[pattern.name] = new Set<string>();
              }
              stringValueSets[pattern.name].add(value);
            }
          }
        } catch (error) {
          // Silently ignore regex errors
        }
      }
      
      processedLines++;
      if (processedLines % 10000 === 0) {
        console.log(`Collected string values from ${processedLines} lines`);
      }
    }
    
    // Create the string-to-number mappings
    for (const [signalName, valueSet] of Object.entries(stringValueSets)) {
      if (!stringValueMaps[signalName]) {
        stringValueMaps[signalName] = {};
      }
      
      // Create a sorted array of unique string values for consistent mapping
      const uniqueValues = Array.from(valueSet).sort();
      
      // Map each unique string value to a numeric index (starting from 0)
      uniqueValues.forEach((value, index) => {
        stringValueMaps[signalName][value] = index;
      });
      
      console.log(`Created mapping for ${signalName} with ${uniqueValues.length} unique values:`, 
        Object.fromEntries(uniqueValues.map((v, i) => [v, i])));
    }
    
    // Update the string value map state
    setStringValueMap(stringValueMaps);
    
    // Now proceed to the second pass to actually parse the data
    processChunk();
  };
  
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
          
          const values: { [key: string]: number | string } = {};
          let hasNewValue = false;
          
          for (const pattern of compiledPatterns) {
            try {
              if (!pattern) continue;
              const match = line.match(pattern.regex);
              
              if (match && match[1] !== undefined) {
                let extractedValue = match[1];
                
                // Check if it's a number or string
                if (!isNaN(Number(extractedValue))) {
                  // It's a number, use it directly
                  const numberValue = Number(extractedValue);
                  values[pattern.name] = numberValue;
                  lastSeenValues[pattern.name] = { type: 'number', value: numberValue };
                } else {
                  // It's a string, store both the original value and its numeric mapping
                  const originalValue = extractedValue;
                  
                  // Use the pre-created mapping for this string value
                  if (stringValueMaps[pattern.name] && stringValueMaps[pattern.name][originalValue] !== undefined) {
                    const mappedValue = stringValueMaps[pattern.name][originalValue];
                    values[pattern.name] = mappedValue;
                    // Store the original string value with a special prefix for reference
                    values[`${pattern.name}_original`] = originalValue;
                    lastSeenValues[pattern.name] = { type: 'string', value: originalValue };
                  } else {
                    // Fallback if mapping doesn't exist (shouldn't happen)
                    console.warn(`No mapping found for ${pattern.name}:${originalValue}`);
                    values[pattern.name] = -1; // Use a default value
                    lastSeenValues[pattern.name] = { type: 'string', value: originalValue };
                  }
                }
                
                hasNewValue = true;
                successCount++;
              }
            } catch (error) {
              // Silently ignore regex errors
            }
          }
          
          // Add last seen values for patterns not found in this line
          for (const pattern of compiledPatterns) {
            if (!pattern) continue;
            if (!(pattern.name in values) && pattern.name in lastSeenValues) {
              const lastSeen = lastSeenValues[pattern.name];
              if (lastSeen.type === 'number') {
                values[pattern.name] = lastSeen.value;
              } else {
                // It's a string type
                const originalValue = lastSeen.value;
                if (stringValueMaps[pattern.name] && stringValueMaps[pattern.name][originalValue] !== undefined) {
                  values[pattern.name] = stringValueMaps[pattern.name][originalValue];
                  values[`${pattern.name}_original`] = originalValue;
                } else {
                  values[pattern.name] = -1;
                }
              }
            }
          }
          
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

  // Start the processing with the first pass to collect string values
  collectUniqueStringValues();
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
