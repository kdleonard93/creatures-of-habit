import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getCanonicalBaseUrl, buildPasswordResetUrl } from '../../lib/utils/url';

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
			expect(getCanonicalBaseUrl()).toBe('https://creatures-of-habit-production.up.railway.app');
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
			expect(buildPasswordResetUrl(token)).toBe('https://creatures-of-habit-production.up.railway.app/reset-password/secure-token-123');
		});
	});

	describe('Security Properties', () => {
		it('should not be vulnerable to Host header injection', () => {
			process.env.CANONICAL_BASE_URL = 'https://legitimate-site.com';
			
			const resetUrl = buildPasswordResetUrl('token123');
			
			expect(resetUrl).toBe('https://legitimate-site.com/reset-password/token123');
		});

		it('should always use configured canonical URL over any external input', () => {
			process.env.CANONICAL_BASE_URL = 'https://secure-app.com';
			
			const url1 = buildPasswordResetUrl('token1');
			const url2 = buildPasswordResetUrl('token2');
			
			const parsedUrl1 = new URL(url1);
			const parsedUrl2 = new URL(url2);
			
			expect(parsedUrl1.origin).toBe('https://secure-app.com');
			expect(parsedUrl2.origin).toBe('https://secure-app.com');
			expect(parsedUrl1.hostname).toBe('secure-app.com');
			expect(parsedUrl2.hostname).toBe('secure-app.com');
		});
	});
});
