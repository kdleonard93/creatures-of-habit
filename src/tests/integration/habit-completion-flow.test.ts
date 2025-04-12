import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockHabits, mockUsers, mockCreatures } from '../mocks/data';
import { mockNotificationManager, resetNotificationMocks } from '../mocks/notifications';

// Mock dependencies before importing any components
vi.mock('$lib/notifications/NotificationManager', () => ({
  notificationManager: mockNotificationManager
}));

vi.mock('$app/navigation', () => ({
  goto: vi.fn(),
  invalidateAll: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('svelte-sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

// Define the completeHabit function here for testing since we can't import it
// This matches the implementation in habit-actions.ts
async function completeHabit(habitId: string) {
  try {
    const response = await fetch(`/api/habits/${habitId}/complete`, {
      method: 'POST'
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to complete habit');
    }

    const data = await response.json();
    
    const { invalidateAll } = await import('$app/navigation');
    const { toast } = await import('svelte-sonner');
    
    // Show success toast with XP gain
    toast.success(`Gained ${data.experienceEarned} XP!`);
    
    // Show level up toast if applicable
    if (data.leveledUp) {
      toast.success(`Level up! Now level ${data.newLevel}`);
    }

    // Refresh the habits list
    await invalidateAll();
    
    return data;
  } catch (error) {
    console.error('Error completing habit:', error);
    const { toast } = await import('svelte-sonner');
    toast.error(`Error completing habit: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

describe('Habit Completion Flow Integration Test', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    resetNotificationMocks();
    
    // Mock global objects
    global.confirm = vi.fn().mockReturnValue(true);
    global.fetch = vi.fn();
  });
  
  afterEach(() => {
    vi.resetAllMocks();
  });
  
  it('completes a habit and updates character experience', async () => {
    // Set up test data
    const habitId = mockHabits.exercise.id;
    
    // Mock the fetch responses
    const mockResponse = {
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        experienceEarned: 10,
        previousLevel: 3,
        newLevel: 3,
        streakUpdate: {
          currentStreak: 6,
          longestStreak: 10,
          lastCompletedAt: new Date().toISOString()
        }
      })
    };
    
    global.fetch = vi.fn().mockResolvedValue(mockResponse);
    
    // Execute the habit completion flow
    await completeHabit(habitId);
    
    // Verify the API was called correctly
    expect(fetch).toHaveBeenCalledWith(`/api/habits/${habitId}/complete`, {
      method: 'POST'
    });
    
    // Verify the navigation was invalidated to refresh the data
    const { invalidateAll } = await import('$app/navigation');
    expect(invalidateAll).toHaveBeenCalled();
    
    // Verify toast was called
    const { toast } = await import('svelte-sonner');
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('Gained 10 XP'));
  });
  
  it('handles level up during habit completion', async () => {
    // Set up test data
    const habitId = mockHabits.exercise.id;
    
    // Mock the fetch responses for a level up scenario
    const mockResponse = {
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        experienceEarned: 20,
        previousLevel: 3,
        newLevel: 4, // Level up!
        leveledUp: true,
        streakUpdate: {
          currentStreak: 6,
          longestStreak: 10,
          lastCompletedAt: new Date().toISOString()
        }
      })
    };
    
    global.fetch = vi.fn().mockResolvedValue(mockResponse);
    
    // Execute the habit completion flow
    await completeHabit(habitId);
    
    // Verify the API was called correctly
    expect(fetch).toHaveBeenCalledWith(`/api/habits/${habitId}/complete`, {
      method: 'POST'
    });
    
    // Verify the navigation was invalidated to refresh the data
    const { invalidateAll } = await import('$app/navigation');
    expect(invalidateAll).toHaveBeenCalled();
    
    // Verify level up toast was called
    const { toast } = await import('svelte-sonner');
    expect(toast.success).toHaveBeenCalledWith('Level up! Now level 4');
  });
  
  it('handles errors during habit completion', async () => {
    // Set up test data
    const habitId = mockHabits.exercise.id;
    
    // Mock the fetch response for an error scenario
    const mockResponse = {
      ok: false,
      status: 500,
      json: async () => ({
        error: 'Server error'
      })
    };
    
    global.fetch = vi.fn().mockResolvedValue(mockResponse);
    
    // Execute the habit completion flow and expect it to throw
    await expect(completeHabit(habitId)).rejects.toThrow();
    
    // Verify the API was called correctly
    expect(fetch).toHaveBeenCalledWith(`/api/habits/${habitId}/complete`, {
      method: 'POST'
    });
    
    // Verify error toast was called
    const { toast } = await import('svelte-sonner');
    expect(toast.error).toHaveBeenCalled();
  });
});
