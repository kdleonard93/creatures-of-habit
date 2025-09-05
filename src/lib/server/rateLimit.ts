import type { RequestEvent } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';

interface RateLimitEntry {
	count: number;
	resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
setInterval(() => {
	const now = Date.now();
	for (const [key, entry] of rateLimitStore.entries()) {
		if (now > entry.resetTime) {
			rateLimitStore.delete(key);
		}
	}
}, 5 * 60 * 1000);

// Export for testing purposes
export function clearRateLimitStore(): void {
	rateLimitStore.clear();
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
	keyGenerator?: (event: RequestEvent) => string
): Promise<void> {
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
	const entry = rateLimitStore.get(key);

	if (!entry || now > entry.resetTime) {
		const resetTime = now + windowMs;
		rateLimitStore.set(key, { count: 1, resetTime });
		setRateLimitHeaders(event, maxRequests, maxRequests - 1, resetTime);
		return;
	}

	if (entry.count >= maxRequests) {
		const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
		setRateLimitHeaders(event, maxRequests, 0, entry.resetTime, retryAfter);
		throw error(statusCode, message);
	}

	entry.count++;
	rateLimitStore.set(key, entry);
	setRateLimitHeaders(event, maxRequests, maxRequests - entry.count, entry.resetTime);
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
import { isIP } from 'node:net';
function getClientIP(event: RequestEvent): string {
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
		message: 'Too many authentication attempts. Please try again in 15 minutes.'
	},
	PASSWORD_RESET: {
		maxRequests: 3,
		windowMs: 60 * 60 * 1000,
		message: 'Too many password reset requests. Please try again in 1 hour.'
	},
	API: {
		maxRequests: 100,
		windowMs: 15 * 60 * 1000,
		message: 'Rate limit exceeded. Please try again later.'
	}
} as const;
