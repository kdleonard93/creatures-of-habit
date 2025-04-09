/**
 * Client-side actions for habit management
 */
import { invalidateAll } from '$app/navigation';
import { toast } from 'svelte-sonner';
import type { StreakUpdateResult } from '$lib/server/streaks/calculations';

/**
 * Interface for habit completion response
 */
export interface HabitCompletionResponse {
  success: boolean;
  experienceEarned: number;
  previousLevel: number;
  newLevel: number;
  streakUpdate: StreakUpdateResult;
}

/**
 * Complete a habit and update the user's experience
 * @param habitId The ID of the habit to complete
 * @returns Promise with the completion result
 */
export async function completeHabit(habitId: string): Promise<HabitCompletionResponse> {
  try {
    const response = await fetch(`/api/habits/${habitId}/complete`, {
      method: 'POST'
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to complete habit');
    }

    const data: HabitCompletionResponse = await response.json();
    
    // Show success toast with XP gain
    toast.success(`Gained ${data.experienceEarned} XP!`);
    
    // Show level up toast if applicable
    if (data.newLevel > data.previousLevel) {
      toast.success(`Level up! Now level ${data.newLevel}`);
    }

    // Refresh the habits list
    await invalidateAll();
    
    return data;
  } catch (error) {
    console.error('Error completing habit:', error);
    toast.error(`Error completing habit: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

/**
 * Delete a habit
 * @param habitId The ID of the habit to delete
 * @returns Promise indicating success
 */
export async function deleteHabit(habitId: string): Promise<boolean> {
  // Confirm deletion
  if (!confirm('Are you sure you want to delete this habit?')) {
    return false;
  }
  
  try {
    const response = await fetch(`/api/habits/${habitId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete habit');
    }

    toast.success(`Habit deleted successfully`);
    await invalidateAll();
    return true;
  } catch (error) {
    console.error('Error deleting habit:', error);
    toast.error(`Error deleting habit: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}

/**
 * Create a new habit
 * @param habitData The habit data to create
 * @returns Promise with the created habit
 */
export async function createHabit(habitData: any): Promise<any> {
  try {
    const response = await fetch('/api/habits', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(habitData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create habit');
    }
    
    const data = await response.json();
    toast.success('Habit created successfully');
    return data.habit;
  } catch (error) {
    console.error('Error creating habit:', error);
    toast.error(`Error creating habit: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

/**
 * Update an existing habit
 * @param habitId The ID of the habit to update
 * @param habitData The updated habit data
 * @returns Promise with the updated habit
 */
export async function updateHabit(habitId: string, habitData: any): Promise<any> {
  try {
    const response = await fetch(`/api/habits/${habitId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(habitData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update habit');
    }
    
    const data = await response.json();
    toast.success('Habit updated successfully');
    return data.habit;
  } catch (error) {
    console.error('Error updating habit:', error);
    toast.error(`Error updating habit: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}
