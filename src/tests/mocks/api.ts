// Mock API implementations for testing
import { getMockData, mockHabits, mockHabitCompletions, mockHabitStreaks, mockUsers } from './data';
import type { StreakUpdateResult } from '$lib/server/streaks/calculations';

// Mock API responses
export const mockApiResponses = {
  // Habit API responses
  getHabits: () => {
    return {
      status: 200,
      body: { habits: Object.values(getMockData(mockHabits)) }
    };
  },
  
  getHabit: (id: string) => {
    const habit = Object.values(getMockData(mockHabits)).find(h => h.id === id);
    if (!habit) {
      return { status: 404, body: { error: 'Habit not found' } };
    }
    return { status: 200, body: { habit } };
  },
  
  createHabit: (data: any) => {
    const newId = `habit-${Date.now()}`;
    const newHabit = {
      id: newId,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    return { status: 201, body: { habit: newHabit } };
  },
  
  updateHabit: (id: string, data: any) => {
    const habit = Object.values(getMockData(mockHabits)).find(h => h.id === id);
    if (!habit) {
      return { status: 404, body: { error: 'Habit not found' } };
    }
    const updatedHabit = { ...habit, ...data, updatedAt: new Date().toISOString() };
    return { status: 200, body: { habit: updatedHabit } };
  },
  
  deleteHabit: (id: string) => {
    const habit = Object.values(getMockData(mockHabits)).find(h => h.id === id);
    if (!habit) {
      return { status: 404, body: { error: 'Habit not found' } };
    }
    return { status: 200, body: { success: true } };
  },
  
  completeHabit: (id: string) => {
    const habit = Object.values(getMockData(mockHabits)).find(h => h.id === id);
    if (!habit) {
      return { status: 404, body: { error: 'Habit not found' } };
    }
    
    // Calculate experience based on difficulty
    const baseXp = habit.baseExperience || 10;
    const experienceEarned = baseXp;
    
    // Mock level progression
    const previousLevel = 1;
    const newLevel = 2;
    
    // Mock streak update
    const streakUpdate: StreakUpdateResult = {
      currentStreak: 1,
      longestStreak: 1,
      lastCompletedAt: new Date().toISOString()
    };
    
    return { 
      status: 200, 
      body: { 
        success: true, 
        experienceEarned,
        previousLevel,
        newLevel,
        streakUpdate
      } 
    };
  },
  
  // User API responses
  getUser: (id: string) => {
    const user = Object.values(getMockData(mockUsers)).find(u => u.id === id);
    if (!user) {
      return { status: 404, body: { error: 'User not found' } };
    }
    // Remove sensitive data
    const { passwordHash, ...safeUser } = user;
    return { status: 200, body: { user: safeUser } };
  },
  
  // Habit completion API responses
  getHabitCompletions: (habitId: string) => {
    const completions = mockHabitCompletions.exercise
      .concat(mockHabitCompletions.reading)
      .filter(c => c.habitId === habitId);
      
    return { status: 200, body: { completions } };
  },
  
  // Streak API responses
  getHabitStreak: (habitId: string) => {
    const streak = Object.values(getMockData(mockHabitStreaks)).find(s => s.habitId === habitId);
    if (!streak) {
      return { status: 404, body: { error: 'Streak not found' } };
    }
    return { status: 200, body: { streak } };
  }
};

// Mock fetch function for testing API calls
export function createMockFetch() {
  return async (url: string, options: RequestInit = {}) => {
    const method = options.method || 'GET';
    const urlParts = url.split('/');
    const endpoint = urlParts[urlParts.length - 1];
    const parentEndpoint = urlParts[urlParts.length - 2];
    
    // Parse request body if present
    let requestBody = {};
    if (options.body) {
      try {
        requestBody = JSON.parse(options.body.toString());
      } catch (e) {
        // Ignore parsing errors
      }
    }
    
    // Handle different API endpoints
    let response;
    
    // Habits API
    if (parentEndpoint === 'habits') {
      if (method === 'GET') {
        response = mockApiResponses.getHabit(endpoint);
      } else if (method === 'PUT' || method === 'PATCH') {
        response = mockApiResponses.updateHabit(endpoint, requestBody);
      } else if (method === 'DELETE') {
        response = mockApiResponses.deleteHabit(endpoint);
      }
    } else if (endpoint === 'habits') {
      if (method === 'GET') {
        response = mockApiResponses.getHabits();
      } else if (method === 'POST') {
        response = mockApiResponses.createHabit(requestBody);
      }
    } else if (endpoint === 'complete' && parentEndpoint !== 'api') {
      // Handle habit completion
      const habitId = urlParts[urlParts.length - 3];
      response = mockApiResponses.completeHabit(habitId);
    } else if (endpoint === 'users') {
      if (method === 'GET') {
        const userId = requestBody.id || 'user-1';
        response = mockApiResponses.getUser(userId);
      }
    } else {
      // Default 404 response
      response = { status: 404, body: { error: 'Not found' } };
    }
    
    // Create mock Response object
    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      json: async () => response.body,
      text: async () => JSON.stringify(response.body)
    };
  };
}

// Mock fetch for testing
export const mockFetch = createMockFetch();
