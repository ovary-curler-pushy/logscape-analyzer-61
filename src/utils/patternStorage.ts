
import { RegexPattern } from "@/components/regex/RegexManager";

const DB_NAME = 'LogVision';
const STORE_NAME = 'RegexPatterns';
const DB_VERSION = 1;
const SHARED_PATTERNS_KEY = 'LogVision_SharedPatterns';

// Helper to open the IndexedDB
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event) => {
      reject(new Error('Error opening database'));
    };
    
    request.onsuccess = (event) => {
      resolve(request.result);
    };
    
    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

// Helper function to generate a unique ID
const generateId = (): string => {
  return Date.now().toString() + '-' + Math.random().toString(36).substring(2, 9);
};

// Save patterns to IndexedDB and localStorage for sharing across users
export const savePatterns = async (patterns: RegexPattern[]): Promise<void> => {
  try {
    // First, save to IndexedDB (local user storage)
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    // Clear existing patterns
    store.clear();
    
    // Add each pattern
    for (const pattern of patterns) {
      store.add(pattern);
    }
    
    // Now save to localStorage for sharing across users
    localStorage.setItem(SHARED_PATTERNS_KEY, JSON.stringify(patterns));

    // If in a production environment, you would typically call an API here
    // to store the patterns in a shared database instead of localStorage
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      
      transaction.onerror = (event) => {
        console.error('Transaction error:', event);
        reject(new Error('Failed to save patterns'));
      };
    });
  } catch (error) {
    console.error('Error saving patterns:', error);
    throw error;
  }
};

// Load patterns from all available sources (prioritizing shared patterns)
export const loadPatterns = async (): Promise<RegexPattern[]> => {
  try {
    // First check localStorage for shared patterns
    const sharedPatterns = localStorage.getItem(SHARED_PATTERNS_KEY);
    if (sharedPatterns) {
      const parsedPatterns = JSON.parse(sharedPatterns) as RegexPattern[];
      
      // Ensure all patterns have valid IDs
      const validatedPatterns = parsedPatterns.map(pattern => {
        if (!pattern.id) {
          return { ...pattern, id: generateId() };
        }
        return pattern;
      });
      
      // Also save to IndexedDB for this user
      try {
        const db = await openDB();
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        store.clear();
        
        for (const pattern of validatedPatterns) {
          store.add(pattern);
        }
        
        await new Promise<void>((resolve, reject) => {
          transaction.oncomplete = () => {
            db.close();
            resolve();
          };
          
          transaction.onerror = () => {
            db.close();
            reject(new Error('Failed to sync patterns to IndexedDB'));
          };
        });
      } catch (err) {
        console.error('Error syncing shared patterns to IndexedDB:', err);
      }
      
      return validatedPatterns;
    }
    
    // If no shared patterns, try to load from IndexedDB
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    
    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        db.close();
        const patterns = request.result as RegexPattern[];
        
        // Save to localStorage to share with other users
        if (patterns && patterns.length > 0) {
          localStorage.setItem(SHARED_PATTERNS_KEY, JSON.stringify(patterns));
        }
        
        resolve(patterns);
      };
      
      request.onerror = (event) => {
        db.close();
        reject(new Error('Failed to load patterns from IndexedDB'));
      };
    });
  } catch (error) {
    console.error('Error loading patterns:', error);
    
    // Fallback to default patterns
    return getDefaultPatterns();
  }
};

// Default patterns to use when no patterns are available
const getDefaultPatterns = (): RegexPattern[] => {
  return [
    {
      id: "default-cpu",
      name: "CPU Usage",
      pattern: "CPU_USAGE cpu=(\\d+)%",
      description: "Extracts CPU usage percentage"
    },
    {
      id: "default-memory",
      name: "Memory Usage",
      pattern: "MEMORY_USAGE memory=(\\d+)MB",
      description: "Extracts memory usage in MB"
    },
    {
      id: "default-http",
      name: "HTTP Status",
      pattern: "HTTP_REQUEST .* status=(\\d+) .*",
      description: "Extracts HTTP status codes"
    },
    {
      id: "default-response-time",
      name: "Response Time",
      pattern: "HTTP_REQUEST .* time=(\\d+)ms",
      description: "Extracts HTTP response time"
    }
  ];
};

// Check for pattern updates from other users
export const checkForSharedPatternUpdates = async (): Promise<boolean> => {
  try {
    // In a real application, this would check an API endpoint instead of localStorage
    const sharedPatterns = localStorage.getItem(SHARED_PATTERNS_KEY);
    if (!sharedPatterns) return false;
    
    const parsedSharedPatterns = JSON.parse(sharedPatterns) as RegexPattern[];
    
    // Compare with current patterns in IndexedDB
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    
    return new Promise((resolve) => {
      request.onsuccess = () => {
        db.close();
        const currentPatterns = request.result as RegexPattern[];
        
        // Simple check: different pattern count
        if (currentPatterns.length !== parsedSharedPatterns.length) {
          return resolve(true);
        }
        
        // Compare by stringifying and sorting IDs
        const currentIds = currentPatterns.map(p => p.id).sort().join(',');
        const sharedIds = parsedSharedPatterns.map(p => p.id).sort().join(',');
        
        resolve(currentIds !== sharedIds);
      };
      
      request.onerror = () => {
        db.close();
        resolve(true); // Assume update needed on error
      };
    });
  } catch (error) {
    console.error('Error checking for pattern updates:', error);
    return false;
  }
};
