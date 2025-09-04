import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getCanonicalBaseUrl, buildCanonicalUrl, buildPasswordResetUrl } from '../../lib/utils/url';

describe('URL Utilities', () => {
	const originalEnv = process.env;

	beforeEach(() => {
		// Reset environment for each test
		vi.resetModules();
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	describe('getCanonicalBaseUrl', () => {
		it('should return configured CANONICAL_BASE_URL when set', () => {
			process.env.CANONICAL_BASE_URL = 'https://example.com/';
			expect(getCanonicalBaseUrl()).toBe('https://example.com');
		});

		it('should remove trailing slash from CANONICAL_BASE_URL', () => {
			process.env.CANONICAL_BASE_URL = 'https://example.com/';
			expect(getCanonicalBaseUrl()).toBe('https://example.com');
		});

		it('should return production fallback when NODE_ENV is production and no CANONICAL_BASE_URL', () => {
			process.env.NODE_ENV = 'production';
			delete process.env.CANONICAL_BASE_URL;
			expect(getCanonicalBaseUrl()).toBe('https://creatures-of-habit.app');
		});

		it('should return development fallback when NODE_ENV is not production', () => {
			process.env.NODE_ENV = 'development';
			delete process.env.CANONICAL_BASE_URL;
			expect(getCanonicalBaseUrl()).toBe('http://localhost:5175');
		});

		it('should handle missing NODE_ENV by using development fallback', () => {
			delete process.env.NODE_ENV;
			delete process.env.CANONICAL_BASE_URL;
			expect(getCanonicalBaseUrl()).toBe('http://localhost:5175');
		});
	});

	describe('buildCanonicalUrl', () => {
		beforeEach(() => {
			process.env.CANONICAL_BASE_URL = 'https://example.com';
		});

		it('should build URL with path starting with slash', () => {
			expect(buildCanonicalUrl('/reset-password')).toBe('https://example.com/reset-password');
		});

		it('should add leading slash if path does not start with one', () => {
			expect(buildCanonicalUrl('reset-password')).toBe('https://example.com/reset-password');
		});

		it('should append params when provided', () => {
			expect(buildCanonicalUrl('/reset-password', '?token=abc123')).toBe('https://example.com/reset-password?token=abc123');
		});

		it('should handle complex paths correctly', () => {
			expect(buildCanonicalUrl('/api/v1/users/123')).toBe('https://example.com/api/v1/users/123');
		});

		it('should not create double slashes', () => {
			process.env.CANONICAL_BASE_URL = 'https://example.com/';
			expect(buildCanonicalUrl('/reset-password')).toBe('https://example.com/reset-password');
		});
	});

	describe('buildPasswordResetUrl', () => {
		beforeEach(() => {
			process.env.CANONICAL_BASE_URL = 'https://example.com';
		});

		it('should build password reset URL with encoded token', () => {
			const token = 'abc123def456';
			expect(buildPasswordResetUrl(token)).toBe('https://example.com/reset-password/abc123def456');
		});

		it('should URL encode special characters in token', () => {
			const token = 'token+with/special=chars&more';
			const expected = 'https://example.com/reset-password/token%2Bwith%2Fspecial%3Dchars%26more';
			expect(buildPasswordResetUrl(token)).toBe(expected);
		});

		it('should handle tokens with spaces', () => {
			const token = 'token with spaces';
			const expected = 'https://example.com/reset-password/token%20with%20spaces';
			expect(buildPasswordResetUrl(token)).toBe(expected);
		});

		it('should work with production environment', () => {
			process.env.NODE_ENV = 'production';
			delete process.env.CANONICAL_BASE_URL;
			const token = 'secure-token-123';
			expect(buildPasswordResetUrl(token)).toBe('https://creatures-of-habit.app/reset-password/secure-token-123');
		});
	});

	describe('Security Properties', () => {
		it('should not be vulnerable to Host header injection', () => {
			// Even if an attacker controls the Host header, our canonical URL is fixed
			process.env.CANONICAL_BASE_URL = 'https://legitimate-site.com';
			
			// This simulates what would happen regardless of Host header value
			const resetUrl = buildPasswordResetUrl('token123');
			
			expect(resetUrl).toBe('https://legitimate-site.com/reset-password/token123');
			expect(resetUrl).not.toContain('evil-site.com');
			expect(resetUrl).not.toContain('attacker.com');
		});

		it('should always use configured canonical URL over any external input', () => {
			process.env.CANONICAL_BASE_URL = 'https://secure-app.com';
			
			// No matter what external input might be, we always use our configured URL
			const url1 = buildCanonicalUrl('/reset-password/token1');
			const url2 = buildCanonicalUrl('/reset-password/token2');
			
			expect(url1.startsWith('https://secure-app.com')).toBe(true);
			expect(url2.startsWith('https://secure-app.com')).toBe(true);
		});
	});
});
