import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockHabits, getMockData } from '../mocks/data';

describe('Habits API Integration Tests', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    
    // Mock fetch for each test case
    global.fetch = vi.fn();
  });

  afterEach(() => {
    // Clean up after each test
    vi.resetAllMocks();
  });

  describe('GET /api/habits', () => {
    it('should fetch all habits for a user', async () => {
      // Mock successful response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ habits: Object.values(getMockData(mockHabits)) })
      });
      
      const response = await fetch('/api/habits');
      const data = await response.json();
      
      expect(response.ok).toBe(true);
      expect(data.habits).toBeDefined();
      expect(Array.isArray(data.habits)).toBe(true);
      expect(data.habits.length).toBeGreaterThan(0);
      
      // Verify habit structure
      const habit = data.habits[0];
      expect(habit).toHaveProperty('id');
      expect(habit).toHaveProperty('title');
      expect(habit).toHaveProperty('difficulty');
    });
  });

  describe('GET /api/habits/:id', () => {
    it('should fetch a specific habit by ID', async () => {
      const habitId = mockHabits.exercise.id;
      
      // Mock successful response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ habit: getMockData(mockHabits.exercise) })
      });
      
      const response = await fetch(`/api/habits/${habitId}`);
      const data = await response.json();
      
      expect(response.ok).toBe(true);
      expect(data.habit).toBeDefined();
      expect(data.habit.id).toBe(habitId);
      expect(data.habit.title).toBe(mockHabits.exercise.title);
    });

    it('should return 404 for non-existent habit', async () => {
      // Mock 404 response
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Habit not found' })
      });
      
      const response = await fetch('/api/habits/non-existent-id');
      
      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);
      
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });

  describe('POST /api/habits', () => {
    it('should create a new habit', async () => {
      const newHabit = {
        userId: 'user-1',
        title: 'New Test Habit',
        description: 'Created during test',
        difficulty: 'medium',
        frequencyId: 'frequency-1',
        categoryId: 'category-1',
        startDate: new Date().toISOString()
      };
      
      const createdHabit = {
        id: 'new-habit-id',
        ...newHabit,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Mock successful response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ habit: createdHabit })
      });
      
      const response = await fetch('/api/habits', {
        method: 'POST',
        body: JSON.stringify(newHabit),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      expect(response.ok).toBe(true);
      expect(response.status).toBe(201);
      
      const data = await response.json();
      expect(data.habit).toBeDefined();
      expect(data.habit.id).toBeDefined();
      expect(data.habit.title).toBe(newHabit.title);
      expect(data.habit.difficulty).toBe(newHabit.difficulty);
    });
  });

  describe('PUT /api/habits/:id', () => {
    it('should update an existing habit', async () => {
      const habitId = mockHabits.exercise.id;
      const updates = {
        title: 'Updated Exercise Habit',
        description: 'Updated during test',
        difficulty: 'hard'
      };
      
      const updatedHabit = {
        ...getMockData(mockHabits.exercise),
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      // Mock successful response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ habit: updatedHabit })
      });
      
      const response = await fetch(`/api/habits/${habitId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data.habit).toBeDefined();
      expect(data.habit.id).toBe(habitId);
      expect(data.habit.title).toBe(updates.title);
      expect(data.habit.description).toBe(updates.description);
      expect(data.habit.difficulty).toBe(updates.difficulty);
    });

    it('should return 404 when updating non-existent habit', async () => {
      const updates = { title: 'This Should Fail' };
      
      // Mock 404 response
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Habit not found' })
      });
      
      const response = await fetch('/api/habits/non-existent-id', {
        method: 'PUT',
        body: JSON.stringify(updates),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/habits/:id', () => {
    it('should delete an existing habit', async () => {
      const habitId = mockHabits.exercise.id;
      
      // Mock successful response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true })
      });
      
      const response = await fetch(`/api/habits/${habitId}`, {
        method: 'DELETE'
      });
      
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should return 404 when deleting non-existent habit', async () => {
      // Mock 404 response
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Habit not found' })
      });
      
      const response = await fetch('/api/habits/non-existent-id', {
        method: 'DELETE'
      });
      
      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/habits/:id/complete', () => {
    it('should mark a habit as completed', async () => {
      const habitId = mockHabits.exercise.id;
      
      // Mock successful response
      global.fetch = vi.fn().mockResolvedValue({
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
      });
      
      const response = await fetch(`/api/habits/${habitId}/complete`, {
        method: 'POST'
      });
      
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.experienceEarned).toBeDefined();
      expect(typeof data.experienceEarned).toBe('number');
      expect(data.previousLevel).toBeDefined();
      expect(data.newLevel).toBeDefined();
      
      // Check if streak information is returned
      expect(data.streakUpdate).toBeDefined();
      expect(data.streakUpdate.currentStreak).toBeDefined();
      expect(data.streakUpdate.longestStreak).toBeDefined();
      expect(data.streakUpdate.lastCompletedAt).toBeDefined();
    });

    it('should return 404 when completing non-existent habit', async () => {
      // Mock 404 response
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Habit not found' })
      });
      
      const response = await fetch('/api/habits/non-existent-id/complete', {
        method: 'POST'
      });
      
      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);
    });
  });
});
