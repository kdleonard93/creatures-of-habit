/**
 * XP Progression Constants
 * 
 * Formula: baseXp * (level - 1)^exponent
 */
const BASE_XP = 25;
const GROWTH_EXPONENT = 1.8;

export function getXpRequiredForLevel(level: number): number {
  if (level <= 1) return 0;
  
  return Math.floor(BASE_XP * (level - 1) ** GROWTH_EXPONENT);
}

export function getXpForLevelUp(level: number): number {
  return getXpRequiredForLevel(level + 1) - getXpRequiredForLevel(level);
}

/**
* Calculates the current level based on XP total
*/
export function getLevelFromXp(xp: number): number {
  if (xp <= 0) return 1;
  
  let level = 1;
  while (getXpRequiredForLevel(level + 1) <= xp) {
      level++;
  }
  
  return level;
}

/**
* Calculates XP progress towards the next level
* @returns Object with current level XP, XP needed for next level, and percentage progress
*/
export function getLevelProgress(xp: number): { 
  currentLevel: number; 
  currentLevelXp: number; 
  nextLevelXp: number; 
  xpProgress: number;
  progressPercentage: number;
} {
  const currentLevel = getLevelFromXp(xp);
  const currentLevelXp = getXpRequiredForLevel(currentLevel);
  const nextLevelXp = getXpRequiredForLevel(currentLevel + 1);
  const xpProgress = xp - currentLevelXp;
  const progressPercentage = Math.min(100, Math.floor((xpProgress / (nextLevelXp - currentLevelXp)) * 100));
  
  return {
      currentLevel,
      currentLevelXp,
      nextLevelXp,
      xpProgress,
      progressPercentage
  };
}

/**
* Calculate XP reward based on habit difficulty and other factors
*/
export function calculateHabitXp(
  difficulty: 'easy' | 'medium' | 'hard',
  streak = 0,
  bonusMultiplier = 1.0
): number {
  const baseXp = {
      'easy': 10,
      'medium': 20,
      'hard': 40
  };
  
  const streakMultiplier = Math.min(1 + (streak * 0.05), 1.5);
  
  const xp = Math.floor(baseXp[difficulty] * streakMultiplier * bonusMultiplier);
  
  return xp;
}
