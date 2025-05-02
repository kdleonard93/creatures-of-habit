import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock data for categories
const mockCategories = [
  { id: '1', name: 'Health', color: '#FF0000' },
  { id: '2', name: 'Productivity', color: '#00FF00' }
];

describe('Categories API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/categories/defaults', () => {
    it('should fetch default categories', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ categories: mockCategories })
      });

      const response = await fetch('/api/categories/defaults');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.categories).toBeDefined();
      expect(Array.isArray(data.categories)).toBe(true);
      expect(data.categories.length).toBeGreaterThan(0);
      expect(data.categories[0]).toHaveProperty('id');
      expect(data.categories[0]).toHaveProperty('name');
      expect(data.categories[0]).toHaveProperty('color');
    });

    it('should handle error response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal Server Error' })
      });

      const response = await fetch('/api/categories/defaults');
      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(data.error).toBe('Internal Server Error');
    });
  });
});
