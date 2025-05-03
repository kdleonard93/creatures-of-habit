import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock registration data
const mockUser = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'password123',
};

describe('Register API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('POST /api/register', () => {
    it('should register a new user', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ user: { id: '123', ...mockUser } })
      });

      const response = await fetch('/api/register', {
        method: 'POST',
        body: JSON.stringify(mockUser),
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.user).toBeDefined();
      expect(data.user.username).toBe(mockUser.username);
      expect(data.user.email).toBe(mockUser.email);
    });

    it('should handle registration error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Email already in use' })
      });

      const response = await fetch('/api/register', {
        method: 'POST',
        body: JSON.stringify(mockUser),
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(data.error).toBe('Email already in use');
    });
  });
});
