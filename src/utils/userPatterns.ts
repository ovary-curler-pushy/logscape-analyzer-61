
import { RegexPattern } from "@/components/regex/RegexManager";

// Get patterns for a specific user
export const getUserPatterns = (userId: string): RegexPattern[] => {
  const storedPatterns = localStorage.getItem(`user_patterns_${userId}`);
  if (storedPatterns) {
    try {
      return JSON.parse(storedPatterns);
    } catch (error) {
      console.error("Error parsing user patterns:", error);
    }
  }
  return [];
};

// Save patterns for a specific user
export const saveUserPatterns = (userId: string, patterns: RegexPattern[]) => {
  localStorage.setItem(`user_patterns_${userId}`, JSON.stringify(patterns));
};

// Check if pattern already exists for user
export const patternExistsForUser = (userId: string, patternName: string): boolean => {
  const userPatterns = getUserPatterns(userId);
  return userPatterns.some(p => p.name.toLowerCase() === patternName.toLowerCase());
};

// Add a new pattern for a user
export const addPatternForUser = (userId: string, pattern: RegexPattern): boolean => {
  if (patternExistsForUser(userId, pattern.name)) {
    return false;
  }
  
  const userPatterns = getUserPatterns(userId);
  userPatterns.push(pattern);
  saveUserPatterns(userId, userPatterns);
  return true;
};

// Delete a pattern for a user
export const deletePatternForUser = (userId: string, patternName: string): boolean => {
  const userPatterns = getUserPatterns(userId);
  const patternIndex = userPatterns.findIndex(p => p.name.toLowerCase() === patternName.toLowerCase());
  
  if (patternIndex === -1) {
    return false;
  }
  
  userPatterns.splice(patternIndex, 1);
  saveUserPatterns(userId, userPatterns);
  return true;
};

// Update a pattern for a user
export const updatePatternForUser = (userId: string, patternName: string, updatedPattern: RegexPattern): boolean => {
  const userPatterns = getUserPatterns(userId);
  const patternIndex = userPatterns.findIndex(p => p.name.toLowerCase() === patternName.toLowerCase());
  
  if (patternIndex === -1) {
    return false;
  }
  
  userPatterns[patternIndex] = updatedPattern;
  saveUserPatterns(userId, userPatterns);
  return true;
};
