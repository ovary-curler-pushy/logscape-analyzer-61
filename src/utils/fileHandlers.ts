
import JSZip from "jszip";
import pako from "pako";
import { toast } from "sonner";

// Function to validate file types
export const isValidFileType = (fileName: string): boolean => {
  const validExtensions = ['.log', '.txt', '.zip', '.gz', '.gzip'];
  return validExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
};

// Function to check if the file is zip, gzip, or just text
const isCompressed = (file: File): boolean => {
  const zip = ['.zip', '.gz', '.gzip'];
  return zip.some(ext => file.name.toLowerCase().endsWith(ext));
};

// Read a text file
export const readAsText = (file: File): Promise<string> => {
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

// Process a ZIP file and return the content of the first log file found
export const decompressZip = async (file: File): Promise<string> => {
  try {
    const buffer = await readBinaryFile(file);
    const zip = new JSZip();
    
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
    const fileData = await contents.files[logFiles[0]].async("string");
    return fileData;
  } catch (error) {
    console.error("Error processing ZIP file:", error);
    throw new Error(`Error extracting ZIP: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Process a GZIP file and return its content
export const decompressGzip = async (file: File): Promise<string> => {
  try {
    const buffer = await readBinaryFile(file);
    
    const decompressed = pako.inflate(new Uint8Array(buffer));
    
    // Convert to string
    const decoder = new TextDecoder("utf-8");
    const content = decoder.decode(decompressed);
    
    return content;
  } catch (error) {
    console.error("Error processing GZIP file:", error);
    throw new Error(`Error decompressing GZIP: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
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
      const content = await readAsText(file);
      
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
      const content = await decompressZip(file);
      
      // If chunk callback is provided, call it with the content
      if (chunkCallback) {
        chunkCallback(content);
      }
      
      setIsLoading(false);
      setUploadStatus("");
      return content;
    } else if (file.name.toLowerCase().endsWith('.gz') || file.name.toLowerCase().endsWith('.gzip')) {
      setUploadStatus("Decompressing GZIP file");
      const content = await decompressGzip(file);
      
      // If chunk callback is provided, call it with the content
      if (chunkCallback) {
        chunkCallback(content);
      }
      
      setIsLoading(false);
      setUploadStatus("");
      return content;
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
