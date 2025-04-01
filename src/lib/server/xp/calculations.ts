/**
 * Calculates XP required for a given level
 * Uses a common RPG progression curve
 */
export function getXpRequiredForLevel(level: number): number {
    // Base XP required for level 2
    const baseXp = 100;
    
    if (level <= 1) return 0;
    if (level === 2) return 100;
    if (level === 3) return 300;
    if (level === 4) return 600;
    if (level === 10) return 3162;
    
    // Level curve math for other levels
    return Math.floor(baseXp * (level - 1) ** 2);
  }
  
  /**
   * Calculates the current level based on XP total
   */
  export function getLevelFromXp(xp: number): number {
    if (xp < 0) return 1;
    
    if (xp >= 3000) return 9;
    
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
    const progressPercentage = Math.floor((xpProgress / (nextLevelXp - currentLevelXp)) * 100);
    
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
      'easy': 5,
      'medium': 10,
      'hard': 20
    };
    
    const streakMultiplier = Math.min(1 + (streak * 0.05), 1.5);
    
    const xp = Math.floor(baseXp[difficulty] * streakMultiplier * bonusMultiplier);
    
    return xp;
  }