
import { toast } from "sonner";

interface SharedAnalysis {
  id: string;
  userId: string;
  title: string;
  description: string;
  pattern: string;
  testText: string;
  createdAt: string;
}

// Store shared analysis in local storage (in a real app, this would use a backend API)
export const saveSharedAnalysis = (
  userId: string,
  title: string,
  description: string,
  pattern: string,
  testText: string
): string => {
  const id = generateAnalysisId();
  const sharedAnalysis: SharedAnalysis = {
    id,
    userId,
    title,
    description,
    pattern,
    testText,
    createdAt: new Date().toISOString(),
  };
  
  // Get existing shared analyses or initialize new array
  const existingSharedKey = `shared_analyses_${userId}`;
  const existingShared = localStorage.getItem(existingSharedKey);
  const sharedAnalyses = existingShared ? JSON.parse(existingShared) : [];
  
  // Add new analysis
  sharedAnalyses.push(sharedAnalysis);
  
  // Save back to storage
  localStorage.setItem(existingSharedKey, JSON.stringify(sharedAnalyses));
  
  return id;
};

// Get a specific shared analysis
export const getSharedAnalysis = (userId: string, analysisId: string): SharedAnalysis | null => {
  try {
    const existingSharedKey = `shared_analyses_${userId}`;
    const existingShared = localStorage.getItem(existingSharedKey);
    
    if (!existingShared) {
      return null;
    }
    
    const sharedAnalyses: SharedAnalysis[] = JSON.parse(existingShared);
    const analysis = sharedAnalyses.find(a => a.id === analysisId);
    
    return analysis || null;
  } catch (error) {
    console.error("Error retrieving shared analysis:", error);
    return null;
  }
};

// Get all shared analyses for a user
export const getUserSharedAnalyses = (userId: string): SharedAnalysis[] => {
  try {
    const existingSharedKey = `shared_analyses_${userId}`;
    const existingShared = localStorage.getItem(existingSharedKey);
    
    if (!existingShared) {
      return [];
    }
    
    return JSON.parse(existingShared);
  } catch (error) {
    console.error("Error retrieving user shared analyses:", error);
    return [];
  }
};

// Delete a shared analysis
export const deleteSharedAnalysis = (userId: string, analysisId: string): boolean => {
  try {
    const existingSharedKey = `shared_analyses_${userId}`;
    const existingShared = localStorage.getItem(existingSharedKey);
    
    if (!existingShared) {
      return false;
    }
    
    const sharedAnalyses: SharedAnalysis[] = JSON.parse(existingShared);
    const filteredAnalyses = sharedAnalyses.filter(a => a.id !== analysisId);
    
    localStorage.setItem(existingSharedKey, JSON.stringify(filteredAnalyses));
    return true;
  } catch (error) {
    console.error("Error deleting shared analysis:", error);
    return false;
  }
};

// Generate a share link
export const generateShareLink = (userId: string, analysisId: string): string => {
  const baseUrl = window.location.origin;
  return `${baseUrl}/shared/${userId}/${analysisId}`;
};

// Share analysis and copy link to clipboard
export const shareAnalysis = (
  userId: string,
  title: string,
  description: string,
  pattern: string,
  testText: string
): string => {
  try {
    const analysisId = saveSharedAnalysis(userId, title, description, pattern, testText);
    const shareLink = generateShareLink(userId, analysisId);
    
    // Copy to clipboard
    navigator.clipboard.writeText(shareLink)
      .then(() => toast.success("Share link copied to clipboard"))
      .catch(() => toast.error("Failed to copy link to clipboard"));
    
    return shareLink;
  } catch (error) {
    toast.error("Failed to share analysis");
    console.error("Error sharing analysis:", error);
    return "";
  }
};

// Helper to generate a unique ID
const generateAnalysisId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};
