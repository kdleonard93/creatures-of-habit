import { describe, it, expect } from 'vitest';
import { allocateStatPoints, createInitialStats, INITIAL_STAT_POINTS, getTotalStatPoints } from '../lib/client/xp/stats';
import type { CreatureStats } from '../lib/types';

describe('Stat Allocation', () => {
  it('should correctly allocate stat points when increasing stats', () => {
    const initialStats = createInitialStats();
    
    // All stats start at 8, which costs 0 points each
    // So we should have all 27 points remaining
    let result = allocateStatPoints(initialStats, 'strength', true);
    
    // Increasing strength from 8 to 9 should cost 1 point
    expect(result.stats.strength).toBe(9);
    expect(result.remainingPoints).toBe(INITIAL_STAT_POINTS - 1);
    
    // Increasing strength from 9 to 10 should cost 1 more point
    result = allocateStatPoints(result.stats, 'strength', true);
    expect(result.stats.strength).toBe(10);
    expect(result.remainingPoints).toBe(INITIAL_STAT_POINTS - 2);
  });
  
  it('should correctly allocate stat points when decreasing stats', () => {
    const initialStats: CreatureStats = {
      strength: 10,
      dexterity: 8,
      constitution: 8,
      intelligence: 8,
      wisdom: 8,
      charisma: 8
    };
    
    // Initial cost: (10-8) + (8-8)*5 = 2 points
    const initialCost = 2;
    let result = allocateStatPoints(initialStats, 'strength', false);
    
    // Decreasing strength from 10 to 9 should refund 1 point
    expect(result.stats.strength).toBe(9);
    expect(result.remainingPoints).toBe(INITIAL_STAT_POINTS - initialCost + 1);
    
    // Decreasing strength from 9 to 8 should refund 1 point
    const currentCost = 1; // (9-8) + (8-8)*5 = 1 point
    result = allocateStatPoints(result.stats, 'strength', false);
    expect(result.stats.strength).toBe(8);
    expect(result.remainingPoints).toBe(INITIAL_STAT_POINTS - currentCost + 1);
  });
  
  it('should not change stats when hitting limits', () => {
    // Test max limit
    const maxStats: CreatureStats = {
      strength: 15, // Max stat
      dexterity: 8,
      constitution: 8,
      intelligence: 8,
      wisdom: 8,
      charisma: 8
    };
    
    // Try to increase strength at max (should not change)
    let result = allocateStatPoints(maxStats, 'strength', true);
    
    // Should not change
    expect(result.stats.strength).toBe(15);
    expect(result.remainingPoints).toBe(INITIAL_STAT_POINTS - 7); // (15-8) = 7 points spent
    
    // Test min limit
    const minStats: CreatureStats = {
      strength: 8, // Min stat
      dexterity: 8,
      constitution: 8,
      intelligence: 8,
      wisdom: 8,
      charisma: 8
    };
    
    result = allocateStatPoints(minStats, 'strength', false);
    
    // Should not change
    expect(result.stats.strength).toBe(8);
    expect(result.remainingPoints).toBe(INITIAL_STAT_POINTS); // All 27 points remaining
  });
  
  it('should handle stat allocation correctly with simplified system', () => {
    const initialStats: CreatureStats = {
      strength: 13,
      dexterity: 8,
      constitution: 8,
      intelligence: 8,
      wisdom: 8,
      charisma: 8
    };
    
    // Initial cost: (13-8) + (8-8)*5 = 5 points
    const initialCost = 5;
    
    // Increasing from 13 to 14 should cost 1 point
    let result = allocateStatPoints(initialStats, 'strength', true);
    expect(result.stats.strength).toBe(14);
    expect(result.remainingPoints).toBe(INITIAL_STAT_POINTS - initialCost - 1);
    
    // Increasing from 14 to 15 should cost 1 point
    result = allocateStatPoints(result.stats, 'strength', true);
    expect(result.stats.strength).toBe(15);
    expect(result.remainingPoints).toBe(INITIAL_STAT_POINTS - initialCost - 2);
  });
});
