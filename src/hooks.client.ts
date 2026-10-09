import posthog from 'posthog-js';
import type { HandleClientError } from '@sveltejs/kit';
import { getPostHogKey, posthogConfig } from '$lib/plugins/PostHog';

// Initialize PostHog on the client side
let posthogReady = false;
const release = import.meta.env.VITE_APP_RELEASE as string | undefined;
const environment = import.meta.env.MODE;
if (typeof window !== 'undefined') {
	const posthogKey = getPostHogKey();
	if (posthogKey) {
		posthog.init(posthogKey, {
			...posthogConfig,
			debug: false
		});
		posthogReady = true;
		posthog.register({
			environment,
			...(release ? { release } : {})
		});
	}
}

function captureException(error: unknown, properties: Record<string, unknown>): void {
	if (!posthogReady) return;
	posthog.captureException(error, properties);
}

// SvelteKit client errors. Only unexpected 5xx failures are captured.
// Expected 4xx responses are not errors and only add noise. We emit a single
// event per failure: the previous implementation also emitted `client_error`
// and `user_impact`, tripling the volume. See docs/audit-backlog.md O-2.
export const handleError: HandleClientError = ({ error, status, event }) => {
	if (status < 500) {
		return;
	}

	console.error('🚨 Client error captured:', error);

	captureException(error, {
		status_code: status,
		environment,
		...(release ? { release } : {}),
		url: typeof window !== 'undefined' ? window.location.href : event?.url?.pathname,
		route: event?.route?.id,
		timestamp: new Date().toISOString()
	});
};

// Global handlers for genuinely uncaught failures. The SDK exception
// autocapture may also see these; keep them as a single captureException each
// rather than custom events, so failures stay grouped in error tracking.
if (typeof window !== 'undefined') {
	window.addEventListener('unhandledrejection', (event) => {
		captureException(event.reason ?? new Error('Unhandled promise rejection'), {
			source: 'unhandledrejection',
			timestamp: new Date().toISOString()
		});
	});

	window.addEventListener('error', (event) => {
		captureException(event.error ?? new Error(event.message), {
			source: 'window.onerror',
			filename: event.filename,
			lineno: event.lineno,
			colno: event.colno,
			timestamp: new Date().toISOString()
		});
	});

	// Performance monitoring: page load timing.
	if ('performance' in window) {
		window.addEventListener('load', () => {
			setTimeout(() => {
				const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
				if (navigation) {
					posthog.capture('page_performance', {
						load_time: navigation.loadEventEnd - navigation.loadEventStart,
						dom_complete: navigation.domComplete,
						response_end: navigation.responseEnd,
						timestamp: new Date().toISOString()
					});
				}
			}, 0);
		});
	}
}
