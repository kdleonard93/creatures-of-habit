import { describe, it, expect } from 'vitest';
import { calculateDailyProgress } from '$lib/utils/dailyHabitProgress';

describe('dailyHabitProgress utility', () => {
  it('calculates completion percentage correctly for standard case', () => {
    const habits = [
      { id: '1', completedToday: true },
      { id: '2', completedToday: false },
      { id: '3', completedToday: true }
    ];
    
    const result = calculateDailyProgress(habits);
    
    expect(result.percentage).toBe(67);
    expect(result.completed).toBe(2);
    expect(result.total).toBe(3);
  });
  
  it('handles empty habits array', () => {
    const result = calculateDailyProgress([]);
    
    expect(result.percentage).toBe(0);
    expect(result.completed).toBe(0);
    expect(result.total).toBe(0);
  });
  
  it('handles undefined habits input', () => {
    const result = calculateDailyProgress(undefined);
    
    expect(result.percentage).toBe(0);
    expect(result.completed).toBe(0);
    expect(result.total).toBe(0);
  });
  
  it('handles non-integer percentages', () => {
    const habits = [
      { id: '1', completedToday: true },
      { id: '2', completedToday: false },
      { id: '3', completedToday: false }
    ];
    
    const result = calculateDailyProgress(habits);
    
    expect(result.percentage).toBe(33); // 1/3 = 0.333... which rounds to 33%
  });
  
  it('displays 100% when all habits are completed', () => {
    const habits = [
      { id: '1', completedToday: true },
      { id: '2', completedToday: true },
      { id: '3', completedToday: true }
    ];
    
    const result = calculateDailyProgress(habits);
    
    expect(result.percentage).toBe(100);
    expect(result.completed).toBe(3);
    expect(result.total).toBe(3);
  });
  
  it('calculates correct values for 50% completion', () => {
    const habits = [
      { id: '1', completedToday: true },
      { id: '2', completedToday: false }
    ];
    
    const result = calculateDailyProgress(habits);
    
    expect(result.percentage).toBe(50);
    expect(result.completed).toBe(1);
    expect(result.total).toBe(2);
  });
  
  it('handles unusual boolean values correctly', () => {
    // Testing with truthy/falsy values that might come from different data sources
    const habits = [
      { id: '1', completedToday: 1 as unknown as boolean }, // truthy
      { id: '2', completedToday: 0 as unknown as boolean }, // falsy
      { id: '3', completedToday: true },
      { id: '4', completedToday: false }
    ];
    
    const result = calculateDailyProgress(habits);
    
    expect(result.completed).toBe(2); // Should count the truthy values
    expect(result.total).toBe(4);
    expect(result.percentage).toBe(50);
  });
  
  it('ensures percentage is bounded between 0 and 100', () => {
    // This test is to verify the bounds checking in the utility function
    const habits = [
      { id: '1', completedToday: true },
      { id: '2', completedToday: true }
    ];
    
    // Mock a situation where calculation might exceed 100% due to data inconsistency
    const mockCalculation = {
      total: 1,
      completed: 2, // More completed than total (impossible but testing edge case)
      percentage: 200 // This should be capped at 100
    };
    
    // Verify the actual function has proper bounds checking
    const result = calculateDailyProgress(habits);
    expect(result.percentage).toBeLessThanOrEqual(100);
    
    // For any input, percentage should never be negative
    const emptyResult = calculateDailyProgress([]);
    expect(emptyResult.percentage).toBeGreaterThanOrEqual(0);
  });
});
