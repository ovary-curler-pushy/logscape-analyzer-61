
import JSZip from "jszip";
import pako from "pako";
import { toast } from "sonner";

// Function to check if the file is zip, gzip, or just text
const isCompressed = (file: File): boolean => {
  const zip = ['.zip', '.gz', '.gzip'];
  return zip.some(ext => file.name.toLowerCase().endsWith(ext));
};

// Process a single file and return its content
export const processFile = async (
  file: File,
  setIsLoading: (isLoading: boolean) => void,
  setUploadStatus: (status: string) => void,
  chunkCallback?: (content: string) => void
): Promise<string> => {
  setIsLoading(true);
  setUploadStatus("Reading file");
  
  try {
    if (!isCompressed(file)) {
      // Regular text file, just read it directly
      setUploadStatus("Processing text file");
      const content = await readTextFile(file);
      
      // If chunk callback is provided, call it with the content
      if (chunkCallback) {
        chunkCallback(content);
      }
      
      setIsLoading(false);
      setUploadStatus("");
      return content;
    }
    
    // Handle compressed files
    if (file.name.toLowerCase().endsWith('.zip')) {
      setUploadStatus("Decompressing ZIP archive");
      return await processZipFile(file, setUploadStatus, chunkCallback);
    } else if (file.name.toLowerCase().endsWith('.gz') || file.name.toLowerCase().endsWith('.gzip')) {
      setUploadStatus("Decompressing GZIP file");
      return await processGzipFile(file, setUploadStatus, chunkCallback);
    } else {
      throw new Error("Unsupported file format");
    }
  } catch (error) {
    console.error("Error processing file:", error);
    toast.error(`Error processing file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    setIsLoading(false);
    setUploadStatus("");
    return "";
  }
};

// Read a text file
const readTextFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      if (event.target?.result) {
        resolve(event.target.result as string);
      } else {
        reject(new Error("Failed to read file"));
      }
    };
    
    reader.onerror = (error) => {
      reject(error);
    };
    
    reader.readAsText(file);
  });
};

// Read a binary file
const readBinaryFile = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      if (event.target?.result) {
        resolve(event.target.result as ArrayBuffer);
      } else {
        reject(new Error("Failed to read file"));
      }
    };
    
    reader.onerror = (error) => {
      reject(error);
    };
    
    reader.readAsArrayBuffer(file);
  });
};

// Process a ZIP file
const processZipFile = async (
  file: File,
  setUploadStatus: (status: string) => void,
  chunkCallback?: (content: string) => void
): Promise<string> => {
  try {
    const buffer = await readBinaryFile(file);
    const zip = new JSZip();
    
    setUploadStatus("Extracting ZIP contents");
    const contents = await zip.loadAsync(buffer);
    
    // Find log files in the zip
    const logFiles = Object.keys(contents.files).filter(
      filename => !contents.files[filename].dir && 
      (filename.toLowerCase().endsWith('.log') || 
       filename.toLowerCase().endsWith('.txt'))
    );
    
    if (logFiles.length === 0) {
      throw new Error("No log files found in the archive");
    }
    
    // Process the first log file found
    setUploadStatus(`Reading ${logFiles[0]}`);
    const fileData = await contents.files[logFiles[0]].async("string");
    
    // If chunk callback is provided, call it with the content
    if (chunkCallback) {
      chunkCallback(fileData);
    }
    
    setUploadStatus("");
    return fileData;
  } catch (error) {
    console.error("Error processing ZIP file:", error);
    throw new Error(`Error extracting ZIP: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Process a GZIP file
const processGzipFile = async (
  file: File,
  setUploadStatus: (status: string) => void,
  chunkCallback?: (content: string) => void
): Promise<string> => {
  try {
    const buffer = await readBinaryFile(file);
    
    setUploadStatus("Decompressing GZIP file");
    const decompressed = pako.inflate(new Uint8Array(buffer));
    
    // Convert to string
    const decoder = new TextDecoder("utf-8");
    const content = decoder.decode(decompressed);
    
    // If chunk callback is provided, call it with the content
    if (chunkCallback) {
      chunkCallback(content);
    }
    
    setUploadStatus("");
    return content;
  } catch (error) {
    console.error("Error processing GZIP file:", error);
    throw new Error(`Error decompressing GZIP: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
