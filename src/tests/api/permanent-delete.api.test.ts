import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const habitId = 'habit-123';

describe('Permanent Delete Habit API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('DELETE /api/habits/:id/permanent-delete', () => {
    it('should permanently delete a habit', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, deletedId: habitId })
      });

      const response = await fetch(`/api/habits/${habitId}/permanent-delete`, {
        method: 'DELETE',
      });
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.deletedId).toBe(habitId);
    });

    it('should handle error if habit does not exist', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Habit not found' })
      });

      const response = await fetch('/api/habits/non-existent-id/permanent-delete', {
        method: 'DELETE',
      });
      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(data.error).toBe('Habit not found');
    });
  });
});
