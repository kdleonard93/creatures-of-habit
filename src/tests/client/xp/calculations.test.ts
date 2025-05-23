import { describe, it, expect } from 'vitest';
import { 
  getXpRequiredForLevel, 
  getLevelFromXp, 
  getLevelProgress, 
  calculateHabitXp 
} from '$lib/server/xp/calculations';

describe('XP Calculations', () => {
  describe('getXpRequiredForLevel', () => {
    it('should return 0 for level 1', () => {
      expect(getXpRequiredForLevel(1)).toBe(0);
    });

    it('should return correct XP for each level', () => {
      expect(getXpRequiredForLevel(2)).toBe(25);
      expect(getXpRequiredForLevel(3)).toBe(50);
      expect(getXpRequiredForLevel(4)).toBe(75);
      expect(getXpRequiredForLevel(5)).toBe(100);
      expect(getXpRequiredForLevel(10)).toBe(300);
    });
  });

  describe('getLevelFromXp', () => {
    it('should return level 1 for 0 XP', () => {
      expect(getLevelFromXp(0)).toBe(1);
    });

    it('should return correct level for XP', () => {
      expect(getLevelFromXp(20)).toBe(1);  // Not enough for level 2
      expect(getLevelFromXp(25)).toBe(2);  // Just enough for level 2
      expect(getLevelFromXp(49)).toBe(2);  // Not enough for level 3
      expect(getLevelFromXp(50)).toBe(3);  // Just enough for level 3
      expect(getLevelFromXp(300)).toBe(10);  // Just enough for level 10
    });
  });

  describe('getLevelProgress', () => {
    it('should calculate progress for level 1', () => {
      const progress = getLevelProgress(15);
      expect(progress.currentLevel).toBe(1);
      expect(progress.currentLevelXp).toBe(0);
      expect(progress.nextLevelXp).toBe(25);
      expect(progress.xpProgress).toBe(15);
      expect(progress.progressPercentage).toBe(60);
    });

    it('should calculate progress for higher levels', () => {
      const progress = getLevelProgress(60);
      expect(progress.currentLevel).toBe(3);
      expect(progress.currentLevelXp).toBe(50);
      expect(progress.nextLevelXp).toBe(75);
      expect(progress.xpProgress).toBe(10);
      expect(progress.progressPercentage).toBe(40);
    });
  });

  describe('calculateHabitXp', () => {
    it('should return base XP for each difficulty', () => {
      expect(calculateHabitXp('easy')).toBe(10);
      expect(calculateHabitXp('medium')).toBe(20);
      expect(calculateHabitXp('hard')).toBe(40);
    });

    it('should apply streak bonuses', () => {
      expect(calculateHabitXp('medium', 2)).toBe(22); // 20 * (1 + 0.1)
      expect(calculateHabitXp('hard', 5)).toBe(50); // 40 * (1 + 0.25)
    });

    it('should cap streak bonuses at 50%', () => {
      expect(calculateHabitXp('medium', 20)).toBe(30); // 20 * 1.5 (capped)
    });

    it('should apply bonus multipliers', () => {
      expect(calculateHabitXp('medium', 0, 1.5)).toBe(30); // 20 * 1.5
      expect(calculateHabitXp('hard', 2, 1.5)).toBe(66); // 40 * (1 + 0.1) * 1.5
    });
  });
});