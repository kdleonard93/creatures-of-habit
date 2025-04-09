// Mock API implementations for testing
import { getMockData, mockHabits, mockHabitCompletions, mockHabitStreaks, mockUsers } from './data';
import type { StreakUpdateResult } from '$lib/server/streaks/calculations';
import type { HabitData } from '$lib/types';

// Mock API response type
interface MockApiResponse {
  status: number;
  body: Record<string, unknown>;
}

// Define function signatures for type safety
type GetHabitsFunc = () => MockApiResponse;
type GetHabitFunc = (id: string) => MockApiResponse;
type CreateHabitFunc = (data: HabitData) => MockApiResponse;
type UpdateHabitFunc = (id: string, data: HabitData) => MockApiResponse;
type DeleteHabitFunc = (id: string) => MockApiResponse;
type CompleteHabitFunc = (id: string) => MockApiResponse;
type GetUserFunc = (id: string) => MockApiResponse;
type GetHabitCompletionsFunc = (habitId: string) => MockApiResponse;
type GetHabitStreakFunc = (habitId: string) => MockApiResponse;

// Mock API responses
export const mockApiResponses = {
  // Habit API responses
  getHabits: (() => {
    return {
      status: 200,
      body: { habits: Object.values(getMockData(mockHabits)) }
    };
  }) as GetHabitsFunc,
  
  getHabit: ((id: string) => {
    const habit = Object.values(getMockData(mockHabits)).find(h => h.id === id);
    if (!habit) {
      return { status: 404, body: { error: 'Habit not found' } };
    }
    return { status: 200, body: { habit } };
  }) as GetHabitFunc,
  
  createHabit: ((data: HabitData) => {
    const newId = `habit-${Date.now()}`;
    const newHabit = {
      id: newId,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    return { status: 201, body: { habit: newHabit } };
  }) as CreateHabitFunc,
  
  updateHabit: ((id: string, data: HabitData) => {
    const habit = Object.values(getMockData(mockHabits)).find(h => h.id === id);
    if (!habit) {
      return { status: 404, body: { error: 'Habit not found' } };
    }
    const updatedHabit = { ...habit, ...data, updatedAt: new Date().toISOString() };
    return { status: 200, body: { habit: updatedHabit } };
  }) as UpdateHabitFunc,
  
  deleteHabit: ((id: string) => {
    const habit = Object.values(getMockData(mockHabits)).find(h => h.id === id);
    if (!habit) {
      return { status: 404, body: { error: 'Habit not found' } };
    }
    return { status: 200, body: { success: true } };
  }) as DeleteHabitFunc,
  
  completeHabit: ((id: string) => {
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
  }) as CompleteHabitFunc,
  
  // User API responses
  getUser: ((id: string) => {
    const user = Object.values(getMockData(mockUsers)).find(u => u.id === id);
    if (!user) {
      return { status: 404, body: { error: 'User not found' } };
    }
    // Remove sensitive data
    const { passwordHash, ...safeUser } = user;
    return { status: 200, body: { user: safeUser } };
  }) as GetUserFunc,
  
  // Habit completion API responses
  getHabitCompletions: ((habitId: string) => {
    const completions = mockHabitCompletions.exercise
      .concat(mockHabitCompletions.reading)
      .filter(c => c.habitId === habitId);
      
    return { status: 200, body: { completions } };
  }) as GetHabitCompletionsFunc,
  
  // Streak API responses
  getHabitStreak: ((habitId: string) => {
    const streak = Object.values(getMockData(mockHabitStreaks)).find(s => s.habitId === habitId);
    if (!streak) {
      return { status: 404, body: { error: 'Streak not found' } };
    }
    return { status: 200, body: { streak } };
  }) as GetHabitStreakFunc
};

// Mock fetch function for testing API calls
export function createMockFetch() {
  return async (url: string, options: RequestInit = {}) => {
    const method = options.method || 'GET';
    const urlParts = url.split('/');
    const endpoint = urlParts[urlParts.length - 1];
    const parentEndpoint = urlParts[urlParts.length - 2];
    
    // Parse request body if present
    let requestBody: Record<string, unknown> = {};
    if (options.body) {
      try {
        requestBody = JSON.parse(options.body.toString());
      } catch (e) {
        // Ignore parsing errors
      }
    }
    
    // Handle different API endpoints
    let response: MockApiResponse = {
      status: 404,
      body: { error: 'Not found' }
    };
    
    // Habits API
    if (parentEndpoint === 'habits') {
      if (method === 'GET') {
        response = mockApiResponses.getHabit(endpoint);
      } else if (method === 'PUT' || method === 'PATCH') {
        // Validate and convert the data to ensure it matches HabitData structure
        const habitData: HabitData = {
          title: String(requestBody.title || ''),
          description: requestBody.description as string | undefined,
          categoryId: requestBody.categoryId as string | undefined,
          frequency: (requestBody.frequency as string || 'daily') as HabitData['frequency'],
          difficulty: (requestBody.difficulty as string || 'medium') as HabitData['difficulty'],
          startDate: String(requestBody.startDate || new Date().toISOString()),
          endDate: requestBody.endDate as string | undefined,
          days: requestBody.days as number[] | undefined
        };
        response = mockApiResponses.updateHabit(endpoint, habitData);
      } else if (method === 'DELETE') {
        response = mockApiResponses.deleteHabit(endpoint);
      }
    } else if (endpoint === 'habits') {
      if (method === 'GET') {
        response = mockApiResponses.getHabits();
      } else if (method === 'POST') {
        // Validate and convert the data to ensure it matches HabitData structure
        const habitData: HabitData = {
          title: String(requestBody.title || ''),
          description: requestBody.description as string | undefined,
          categoryId: requestBody.categoryId as string | undefined,
          frequency: (requestBody.frequency as string || 'daily') as HabitData['frequency'],
          difficulty: (requestBody.difficulty as string || 'medium') as HabitData['difficulty'],
          startDate: String(requestBody.startDate || new Date().toISOString()),
          endDate: requestBody.endDate as string | undefined,
          days: requestBody.days as number[] | undefined
        };
        response = mockApiResponses.createHabit(habitData);
      }
    } else if (endpoint === 'complete' && parentEndpoint !== 'api') {
      // Handle habit completion
      const habitId = urlParts[urlParts.length - 3];
      response = mockApiResponses.completeHabit(habitId);
    } else if (endpoint === 'user') {
      // Handle user endpoints
      const userId = requestBody.userId as string || 'user-1';
      response = mockApiResponses.getUser(userId);
    } else if (endpoint === 'completions') {
      // Handle completions endpoints
      const habitId = urlParts[urlParts.length - 3];
      response = mockApiResponses.getHabitCompletions(habitId);
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
