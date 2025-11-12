import '@testing-library/jest-dom';
import { vi } from 'vitest';
import './svelte.d.ts';

process.env.RESEND_API_KEY = 'test-api-key';

// Configure Svelte for testing
// This is needed for Svelte 5 compatibility
declare global {
  interface Window {
    svelte: { enabled: boolean };
  }
}

// Set svelte enabled flag for testing
window.svelte = { enabled: true };

// Mock browser environment for Svelte 5
global.window = window;
global.document = window.document;

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn().mockImplementation((callback) => {
  setTimeout(callback, 0);
  return 0;
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock localStorage for tests
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    })
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});
