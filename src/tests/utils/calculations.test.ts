import { describe, it, expect } from 'vitest';
import { 
  getXpRequiredForLevel, 
  getLevelFromXp, 
  getLevelProgress, 
  calculateHabitXp,
  getXpForLevelUp
} from '$lib/server/xp/calculations';

/**
 * XP Progression Table (for reference)
 * Formula: 25 * (level - 1)^1.8
 * 
 * Level | Total XP | XP Gap (to reach this level)
 * ------+----------+-----------------------------
 *   1   |     0    |  -
 *   2   |    25    |  25
 *   3   |    87    |  62
 *   4   |   180    |  93
 *   5   |   303    | 123
 *  10   | 1,304    | 249
 *  15   | 2,890    | 361
 *  20   | 5,008    | 465
 *  30   | 10,721   | 619
 *  50   | 27,560   | 688
 */

describe('XP Calculations', () => {
  describe('getXpRequiredForLevel', () => {
    it('should return 0 for level 1', () => {
      expect(getXpRequiredForLevel(1)).toBe(0);
    });

    it('should return 0 for invalid levels', () => {
      expect(getXpRequiredForLevel(0)).toBe(0);
      expect(getXpRequiredForLevel(-1)).toBe(0);
    });

    it('should return correct XP for early levels (polynomial curve)', () => {
      // Formula: 25 * (level - 1)^1.8
      expect(getXpRequiredForLevel(2)).toBe(25);   // 25 * 1^1.8 = 25
      expect(getXpRequiredForLevel(3)).toBe(87);   // 25 * 2^1.8 = 87
      expect(getXpRequiredForLevel(4)).toBe(180);  // 25 * 3^1.8 = 180
      expect(getXpRequiredForLevel(5)).toBe(303);  // 25 * 4^1.8 = 303
    });

    it('should return correct XP for mid-game levels', () => {
      expect(getXpRequiredForLevel(10)).toBe(1304);  // 25 * 9^1.8
      expect(getXpRequiredForLevel(15)).toBe(2890);  // 25 * 14^1.8
      expect(getXpRequiredForLevel(20)).toBe(5008);  // 25 * 19^1.8
    });

    it('should return correct XP for high levels', () => {
      expect(getXpRequiredForLevel(30)).toBe(10721);  // 25 * 29^1.8
      expect(getXpRequiredForLevel(50)).toBe(27560);  // 25 * 49^1.8
    });

    it('should have progressively increasing XP gaps between levels', () => {
      // Verify the XP gap increases as levels increase (no plateaus)
      const gap2to3 = getXpRequiredForLevel(3) - getXpRequiredForLevel(2);
      const gap10to11 = getXpRequiredForLevel(11) - getXpRequiredForLevel(10);
      const gap20to21 = getXpRequiredForLevel(21) - getXpRequiredForLevel(20);
      
      expect(gap10to11).toBeGreaterThan(gap2to3);
      expect(gap20to21).toBeGreaterThan(gap10to11);
    });
  });

  describe('getXpForLevelUp', () => {
    it('should return the XP gap to reach the next level', () => {
      expect(getXpForLevelUp(1)).toBe(25);  // 25 - 0
      expect(getXpForLevelUp(2)).toBe(62);  // 87 - 25
      expect(getXpForLevelUp(3)).toBe(93);  // 180 - 87
    });

    it('should always return positive values', () => {
      for (let level = 1; level <= 50; level++) {
        expect(getXpForLevelUp(level)).toBeGreaterThan(0);
      }
    });
  });

  describe('getLevelFromXp', () => {
    it('should return level 1 for 0 XP', () => {
      expect(getLevelFromXp(0)).toBe(1);
    });

    it('should return level 1 for negative XP', () => {
      expect(getLevelFromXp(-100)).toBe(1);
    });

    it('should return correct level for XP thresholds', () => {
      expect(getLevelFromXp(24)).toBe(1);    // Not enough for level 2
      expect(getLevelFromXp(25)).toBe(2);    // Just enough for level 2
      expect(getLevelFromXp(86)).toBe(2);    // Not enough for level 3
      expect(getLevelFromXp(87)).toBe(3);    // Just enough for level 3
      expect(getLevelFromXp(1304)).toBe(10); // Just enough for level 10
    });

    it('should handle mid-progress XP correctly', () => {
      expect(getLevelFromXp(50)).toBe(2);    // Between level 2 and 3
      expect(getLevelFromXp(500)).toBe(6);   // Between level 6 and 7
      expect(getLevelFromXp(2000)).toBe(12); // Between level 12 and 13
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
      const progress = getLevelProgress(100);
      expect(progress.currentLevel).toBe(3);
      expect(progress.currentLevelXp).toBe(87);
      expect(progress.nextLevelXp).toBe(180);
      expect(progress.xpProgress).toBe(13);  // 100 - 87
      expect(progress.progressPercentage).toBe(13); // 13 / 93 ≈ 13%
    });

    it('should cap progress percentage at 100', () => {
      // Edge case: if somehow XP exceeds next level threshold
      const progress = getLevelProgress(25);
      expect(progress.progressPercentage).toBeLessThanOrEqual(100);
    });
  });

  describe('calculateHabitXp', () => {
    it('should return base XP for each difficulty', () => {
      expect(calculateHabitXp('easy', 0, 1)).toBe(10);
      expect(calculateHabitXp('medium', 0, 1)).toBe(20);
      expect(calculateHabitXp('hard', 0, 1)).toBe(40);
    });

    it('should apply streak bonuses', () => {
      expect(calculateHabitXp('medium', 2, 1)).toBe(22); // 20 * (1 + 0.1)
      expect(calculateHabitXp('hard', 5, 1)).toBe(50); // 40 * (1 + 0.25)
    });

    it('should cap streak bonuses at 50%', () => {
      expect(calculateHabitXp('medium', 20, 1)).toBe(30); // 20 * 1.5 (capped)
    });

    it('should apply bonus multipliers', () => {
      expect(calculateHabitXp('medium', 0, 1.5)).toBe(30); // 20 * 1.5
      expect(calculateHabitXp('hard', 2, 1.5)).toBe(66); // 40 * (1 + 0.1) * 1.5
    });
  });
});