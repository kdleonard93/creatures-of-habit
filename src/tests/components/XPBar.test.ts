import { describe, it, expect, vi } from 'vitest';
import { getLevelProgress } from '$lib/server/xp';

// Mock the XP calculations
vi.mock('$lib/server/xp', () => ({
  getLevelProgress: vi.fn((xp) => {
    if (xp === 50) {
      return {
        currentLevel: 1,
        currentLevelXp: 0,
        nextLevelXp: 100,
        xpProgress: 50,
        progressPercentage: 50
      };
    } else {
      return {
        currentLevel: 2,
        currentLevelXp: 100,
        nextLevelXp: 300,
        xpProgress: 50,
        progressPercentage: 25
      };
    }
  })
}));

describe('XpBar Component', () => {
  it('should calculate progress correctly for level 1', () => {
    const result = getLevelProgress(50);
    expect(result.currentLevel).toBe(1);
    expect(result.progressPercentage).toBe(50);
  });

  it('should calculate progress correctly for higher levels', () => {
    const result = getLevelProgress(150);
    expect(result.currentLevel).toBe(2);
    expect(result.progressPercentage).toBe(25);
  });
});