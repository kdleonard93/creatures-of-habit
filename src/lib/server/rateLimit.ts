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
		rateLimitStore.set(key, {
			count: 1,
			resetTime: now + windowMs
		});
		return;
	}

	if (entry.count >= maxRequests) {
		const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
		event.setHeaders({
			'X-RateLimit-Limit': maxRequests.toString(),
			'X-RateLimit-Remaining': '0',
			'X-RateLimit-Reset': entry.resetTime.toString(),
			'Retry-After': retryAfter.toString()
		});

		throw error(statusCode, message);
	}

	entry.count++;
	rateLimitStore.set(key, entry);
	event.setHeaders({
		'X-RateLimit-Limit': maxRequests.toString(),
		'X-RateLimit-Remaining': (maxRequests - entry.count).toString(),
		'X-RateLimit-Reset': entry.resetTime.toString()
	});
}

function getClientIP(event: RequestEvent): string {
	const forwarded = event.request.headers.get('x-forwarded-for');
	if (forwarded) {
		return forwarded.split(',')[0].trim();
	}

	const realIP = event.request.headers.get('x-real-ip');
	if (realIP) {
		return realIP;
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
