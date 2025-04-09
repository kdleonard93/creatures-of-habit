// Mock notification manager for testing
import { vi } from 'vitest';

export const mockNotificationManager = {
  scheduleNotification: vi.fn(),
  clearNotification: vi.fn(),
  showNotification: vi.fn(),
  init: vi.fn(),
  getPermission: vi.fn().mockResolvedValue('granted'),
  requestPermission: vi.fn().mockResolvedValue('granted')
};

// Reset all mocks
export function resetNotificationMocks() {
  vi.clearAllMocks();
  mockNotificationManager.scheduleNotification.mockReset();
  mockNotificationManager.clearNotification.mockReset();
  mockNotificationManager.showNotification.mockReset();
  mockNotificationManager.init.mockReset();
  mockNotificationManager.getPermission.mockReset().mockResolvedValue('granted');
  mockNotificationManager.requestPermission.mockReset().mockResolvedValue('granted');
}
