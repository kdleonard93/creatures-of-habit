import type { RequestEvent } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { isIP } from 'node:net';
import type { Cache } from '$lib/types';
import { MemoryCache } from './cache/MemoryCache';

interface RateLimitEntry {
	count: number;
	resetTime: number;
}

// Default cache implementation (In-Memory).
//
// The store is per process instance. On a single-instance deploy this is
// correct, but under horizontal scaling each instance keeps its own counters,
// so the effective limit is multiplied by the number of instances, and every
// counter resets on deploy or restart. For multi-instance deployments, back
// this with a shared store (for example Redis, or a Turso-backed counter)
// keyed by the same client IP plus route, and keep the in-memory cache only as
// a fallback. The `cache` parameter already accepts any `Cache` implementation
// (see src/lib/types.ts), so swapping it is a wiring change, not a rewrite.
// See docs/audit-backlog.md A-2.
const defaultCache: Cache = new MemoryCache();

// Export for testing purposes
export function clearRateLimitStore(): void {
	defaultCache.clear();
}

export interface RateLimitConfig {
	maxRequests: number;
	windowMs: number;
	message?: string;
	statusCode?: number;
}

export async function rateLimit(
	event: RequestEvent,
	config: RateLimitConfig,
	keyGenerator?: (event: RequestEvent) => string,
    cache: Cache = defaultCache
): Promise<void> {
	// Dev convenience: allow disabling the limiter locally. This never applies
	// in production (dev is false) or in tests (dev is also false).
	if (dev && process.env.DISABLE_RATE_LIMIT === 'true') {
		return;
	}

	const {
		maxRequests,
		windowMs,
		message = 'Too many requests. Please try again later.',
		statusCode = 429
	} = config;

	const key = keyGenerator 
		? keyGenerator(event) 
		: `${getClientIP(event)}:${event.url.pathname}`;

	const now = Date.now();
    
    // Retrieve from cache
	let entry = await cache.get<RateLimitEntry>(key);

	if (!entry || now > entry.resetTime) {
		const resetTime = now + windowMs;
        entry = { count: 1, resetTime };
        // Set with TTL equal to the window
		await cache.set(key, entry, windowMs);
		setRateLimitHeaders(event, maxRequests, maxRequests - 1, resetTime);
		return;
	}

	if (entry.count >= maxRequests) {
		const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
		setRateLimitHeaders(event, maxRequests, 0, entry.resetTime, retryAfter);
		throw error(statusCode, `${message} Try again in ${formatRetryAfter(retryAfter)}.`);
	}

	entry.count++;
    // Update cache
    // We calculate remaining TTL to keep the original reset time
    const remainingTtl = Math.max(0, entry.resetTime - now);
	await cache.set(key, entry, remainingTtl);
    
	setRateLimitHeaders(event, maxRequests, maxRequests - entry.count, entry.resetTime);
}

/** Human readable retry window, for example "7 minutes" or "1 hour". */
export function formatRetryAfter(seconds: number): string {
	if (seconds < 60) return `${seconds} second${seconds === 1 ? '' : 's'}`;
	const minutes = Math.ceil(seconds / 60);
	if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
	const hours = Math.ceil(minutes / 60);
	return `${hours} hour${hours === 1 ? '' : 's'}`;
}

function setRateLimitHeaders(
	event: RequestEvent, 
	limit: number, 
	remaining: number, 
	resetTime: number, 
	retryAfter?: number
): void {
	const headers: Record<string, string> = {
		'X-RateLimit-Limit': limit.toString(),
		'X-RateLimit-Remaining': remaining.toString(),
		'X-RateLimit-Reset': resetTime.toString()
	};
	
	if (retryAfter !== undefined) {
		headers['Retry-After'] = retryAfter.toString();
	}
	
	event.setHeaders(headers);
}

/**
 * Derive the client IP behind a trusted proxy (Railway) when TRUST_PROXY is
 * true, falling back to the socket address. Exported so the waitlist endpoint
 * and the limiter agree on the same client. See docs/reports/06-abuse.md P-2.
 */
export function getClientIP(event: RequestEvent): string {
	const trustProxy = process.env.TRUST_PROXY === 'true';
	if (trustProxy) {
		const forwarded = event.request.headers.get('x-forwarded-for');
		if (forwarded) {
			const firstIP = forwarded.split(',')[0]?.trim();
			if (firstIP && isIP(firstIP)) return firstIP;
		}
		const realIP = event.request.headers.get('x-real-ip');
		if (realIP && isIP(realIP)) return realIP;
	}
	return event.getClientAddress();
}

export const RateLimitPresets = {
	AUTH: {
		maxRequests: 5,
		windowMs: 15 * 60 * 1000,
		message: 'Too many authentication attempts.'
	},
	PASSWORD_RESET: {
		maxRequests: 3,
		windowMs: 60 * 60 * 1000,
		message: 'Too many password reset requests.'
	},
	API: {
		maxRequests: 100,
		windowMs: 15 * 60 * 1000,
		message: 'Rate limit exceeded.'
	},
	CONTACT: {
		maxRequests: 3,
		windowMs: 60 * 60 * 1000,
		message: 'Too many messages sent.'
	},
	WAITLIST: {
		maxRequests: 5,
		windowMs: 60 * 60 * 1000,
		message: 'Too many waitlist submissions.'
	}
} as const;

