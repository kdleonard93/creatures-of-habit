/**
 * Calculates XP required for a given level
 */
export function getXpRequiredForLevel(level: number): number {
  const baseXp = 25;
  
  if (level <= 1) return 0;
  if (level === 2) return baseXp;            
  if (level === 3) return baseXp * 2;
  if (level === 4) return baseXp * 3;
  if (level === 5) return baseXp * 4;
  if (level === 6) return baseXp * 5;
  if (level === 7) return baseXp * 6;
  if (level === 8) return baseXp * 8;
  if (level === 9) return baseXp * 10;
  if (level === 10) return baseXp * 12;
  if (level === 11) return baseXp * 14;
  if (level === 12) return baseXp * 16;
  if (level === 13) return baseXp * 18;
  if (level === 14) return baseXp * 20;
  if (level === 15) return baseXp * 24;
  if (level < 30) {
    // Medium curve for levels 16-29
    return Math.floor(baseXp * (level * 2));
  }
  
  // Steeper but still achievable curve for level 30+
  // Level 30 will require 1,600 XP instead of 10,292 XP
  return Math.floor(baseXp * (level * 2.5));
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
