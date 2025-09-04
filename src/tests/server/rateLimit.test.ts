import { describe, it, expect, beforeEach, vi } from 'vitest';
import { rateLimit, RateLimitPresets, clearRateLimitStore } from '../../lib/server/rateLimit';
import type { RequestEvent } from '@sveltejs/kit';

// Mock SvelteKit error function
vi.mock('@sveltejs/kit', () => ({
	error: vi.fn((status: number, message: string) => {
		const err = new Error(message) as any;
		err.status = status;
		throw err;
	})
}));

// Create a mock RequestEvent
function createMockEvent(
	pathname = '/test',
	clientIP = '127.0.0.1',
	headers: Record<string, string> = {}
): RequestEvent {
	const mockHeaders = new Map(Object.entries(headers));
	
	return {
		url: new URL(`http://localhost:5173${pathname}`),
		request: {
			headers: {
				get: (name: string) => mockHeaders.get(name.toLowerCase()) || null
			}
		} as any,
		getClientAddress: () => clientIP,
		setHeaders: vi.fn(),
		cookies: {} as any,
		fetch: {} as any,
		locals: {} as any,
		params: {} as any,
		platform: {} as any,
		route: {} as any,
		isDataRequest: false,
		isSubRequest: false
	} as unknown as RequestEvent;
}

describe('Rate Limiting Middleware', () => {
	beforeEach(() => {
		// Clear any existing rate limit entries between tests
		vi.clearAllMocks();
		clearRateLimitStore();
	});

	describe('rateLimit function', () => {
		it('should allow requests within rate limit', async () => {
			const event = createMockEvent();
			const config = { maxRequests: 5, windowMs: 60000 };

			await expect(rateLimit(event, config)).resolves.not.toThrow();
			
			expect(event.setHeaders).toHaveBeenCalledWith(
				expect.objectContaining({
					'X-RateLimit-Limit': '5',
					'X-RateLimit-Remaining': '4'
				})
			);
		});

		it('should block requests exceeding rate limit', async () => {
			const event = createMockEvent();
			const config = { maxRequests: 2, windowMs: 60000 };

			// First two requests should pass
			await expect(rateLimit(event, config)).resolves.not.toThrow();
			await expect(rateLimit(event, config)).resolves.not.toThrow();

			// Third request should be blocked
			await expect(rateLimit(event, config)).rejects.toThrow();
			
			expect(event.setHeaders).toHaveBeenLastCalledWith(
				expect.objectContaining({
					'X-RateLimit-Remaining': '0',
					'Retry-After': expect.any(String)
				})
			);
		});

		it('should use custom key generator when provided', async () => {
			const event1 = createMockEvent('/test', '192.168.1.1');
			const event2 = createMockEvent('/test', '192.168.1.2');
			const config = { maxRequests: 1, windowMs: 60000 };
			
			// Custom key generator that returns same key for both events
			const keyGenerator = () => 'shared-key';

			await expect(rateLimit(event1, config, keyGenerator)).resolves.not.toThrow();
			// Second request with different IP but same key should be blocked
			await expect(rateLimit(event2, config, keyGenerator)).rejects.toThrow();
		});

		it('should reset rate limit after window expires', async () => {
			const event = createMockEvent();
			const config = { maxRequests: 1, windowMs: 100 }; // 100ms window

			// First request should pass
			await expect(rateLimit(event, config)).resolves.not.toThrow();
			
			// Second request should be blocked
			await expect(rateLimit(event, config)).rejects.toThrow();

			// Wait for window to expire
			await new Promise(resolve => setTimeout(resolve, 150));

			// Request after window expiry should pass again
			await expect(rateLimit(event, config)).resolves.not.toThrow();
		});

		it('should use custom error message and status code', async () => {
			const event = createMockEvent();
			const config = {
				maxRequests: 1,
				windowMs: 60000,
				message: 'Custom rate limit message',
				statusCode: 503
			};

			await expect(rateLimit(event, config)).resolves.not.toThrow();
			
			try {
				await rateLimit(event, config);
			} catch (error: any) {
				expect(error.message).toBe('Custom rate limit message');
				expect(error.status).toBe(503);
			}
		});
	});

	describe('getClientIP function', () => {
		it('should extract IP from x-forwarded-for header when TRUST_PROXY is true', async () => {
			// Mock environment variable
			const originalEnv = process.env.TRUST_PROXY;
			process.env.TRUST_PROXY = 'true';

			const event1 = createMockEvent('/test', '127.0.0.1', {
				'x-forwarded-for': '192.168.1.100, 10.0.0.1'
			});
			const event2 = createMockEvent('/test', '127.0.0.1', {
				'x-forwarded-for': '192.168.1.200, 10.0.0.1'
			});
			
			const config = { maxRequests: 1, windowMs: 60000 };

			await expect(rateLimit(event1, config)).resolves.not.toThrow();
			// Different forwarded IP should be treated as different client
			await expect(rateLimit(event2, config)).resolves.not.toThrow();

			// Restore environment
			process.env.TRUST_PROXY = originalEnv;
		});

		it('should use x-real-ip header when x-forwarded-for is not available', async () => {
			const originalEnv = process.env.TRUST_PROXY;
			process.env.TRUST_PROXY = 'true';

			const event = createMockEvent('/test', '127.0.0.1', {
				'x-real-ip': '192.168.1.100'
			});
			
			const config = { maxRequests: 1, windowMs: 60000 };
			await expect(rateLimit(event, config)).resolves.not.toThrow();

			process.env.TRUST_PROXY = originalEnv;
		});

		it('should fall back to getClientAddress when proxy headers unavailable', async () => {
			const originalEnv = process.env.TRUST_PROXY;
			process.env.TRUST_PROXY = 'true';

			const event = createMockEvent('/test', '192.168.1.100');
			const config = { maxRequests: 1, windowMs: 60000 };
			
			await expect(rateLimit(event, config)).resolves.not.toThrow();

			process.env.TRUST_PROXY = originalEnv;
		});

		it('should ignore proxy headers when TRUST_PROXY is false', async () => {
			const originalEnv = process.env.TRUST_PROXY;
			process.env.TRUST_PROXY = 'false';

			const event1 = createMockEvent('/test', '127.0.0.1', {
				'x-forwarded-for': '192.168.1.100'
			});
			const event2 = createMockEvent('/test', '127.0.0.1', {
				'x-forwarded-for': '192.168.1.200'
			});
			
			const config = { maxRequests: 1, windowMs: 60000 };

			await expect(rateLimit(event1, config)).resolves.not.toThrow();
			// Same client IP should be rate limited despite different forwarded headers
			await expect(rateLimit(event2, config)).rejects.toThrow();

			process.env.TRUST_PROXY = originalEnv;
		});
	});

	describe('RateLimitPresets', () => {
		it('should have correct AUTH preset configuration', () => {
			expect(RateLimitPresets.AUTH).toEqual({
				maxRequests: 5,
				windowMs: 15 * 60 * 1000,
				message: 'Too many authentication attempts. Please try again in 15 minutes.'
			});
		});

		it('should have correct PASSWORD_RESET preset configuration', () => {
			expect(RateLimitPresets.PASSWORD_RESET).toEqual({
				maxRequests: 3,
				windowMs: 60 * 60 * 1000,
				message: 'Too many password reset requests. Please try again in 1 hour.'
			});
		});

		it('should have correct API preset configuration', () => {
			expect(RateLimitPresets.API).toEqual({
				maxRequests: 100,
				windowMs: 15 * 60 * 1000,
				message: 'Rate limit exceeded. Please try again later.'
			});
		});
	});
});
