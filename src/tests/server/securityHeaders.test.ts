import { describe, it, expect, vi } from 'vitest';

// HSTS is gated behind the production-only guard (`!dev`). Vitest runs with
// `dev === true`, so simulate a production build to exercise that path. This
// mocks the environment flag, not the code under test.
vi.mock('$app/environment', () => ({
	dev: false,
	building: false,
	browser: false,
	version: 'test'
}));

import { setSecurityHeaders } from '$lib/server/securityHeaders';
import { createRequestEvent } from '../helpers/requestEvent';

/**
 * Representative tests for the global security headers. Covers the A-5 items:
 * the cross-origin isolation headers (COOP, CORP) and the fix that emits HSTS
 * when the request is secure even behind a TLS-terminating proxy, where the
 * signal is `x-forwarded-proto: https` rather than `event.url.protocol`.
 * See docs/audit-backlog.md A-5 and docs/reports/04-auth-security.md.
 */
describe('setSecurityHeaders', () => {
	it('sets cross-origin isolation and HSTS for a secure request', () => {
		const event = createRequestEvent({ url: 'https://example.com/dashboard' });

		setSecurityHeaders(event);

		expect(event.capturedHeaders.get('Cross-Origin-Opener-Policy')).toBe('same-origin');
		expect(event.capturedHeaders.get('Cross-Origin-Resource-Policy')).toBe('same-origin');
		expect(event.capturedHeaders.get('Strict-Transport-Security')).toContain('max-age=');
	});

	it('omits HSTS but keeps cross-origin isolation for an insecure request', () => {
		const event = createRequestEvent({ url: 'http://example.com/dashboard' });

		setSecurityHeaders(event);

		expect(event.capturedHeaders.get('Strict-Transport-Security')).toBeNull();
		expect(event.capturedHeaders.get('Cross-Origin-Opener-Policy')).toBe('same-origin');
		expect(event.capturedHeaders.get('Cross-Origin-Resource-Policy')).toBe('same-origin');
	});

	it('treats x-forwarded-proto: https as secure and emits HSTS behind a proxy', () => {
		// The proxy terminates TLS and forwards plain HTTP, so event.url.protocol
		// is http. The x-forwarded-proto header is the trusted signal.
		const event = createRequestEvent({
			url: 'http://example.com/dashboard',
			headers: { 'x-forwarded-proto': 'https' }
		});

		setSecurityHeaders(event);

		expect(event.capturedHeaders.get('Strict-Transport-Security')).toContain('max-age=');
	});

	it('does not emit HSTS when x-forwarded-proto reports http', () => {
		const event = createRequestEvent({
			url: 'https://example.com/dashboard',
			headers: { 'x-forwarded-proto': 'http' }
		});

		setSecurityHeaders(event);

		expect(event.capturedHeaders.get('Strict-Transport-Security')).toBeNull();
	});
});
