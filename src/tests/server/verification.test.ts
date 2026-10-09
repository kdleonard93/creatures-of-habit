import { describe, it, expect } from 'vitest';
import { getVerificationGate } from '$lib/server/verification';

describe('getVerificationGate', () => {
	it('allows everything for a verified user', () => {
		expect(getVerificationGate('/dashboard', true)).toBe('allow');
		expect(getVerificationGate('/api/habits', true)).toBe('allow');
		expect(getVerificationGate('/settings/password', true)).toBe('allow');
	});

	it('protects app pages with a redirect for unverified users', () => {
		for (const path of [
			'/dashboard',
			'/habits',
			'/habits/new',
			'/quests',
			'/character/details',
			'/settings',
			'/settings/password',
			'/notifications',
			'/admin'
		]) {
			expect(getVerificationGate(path, false)).toBe('redirect');
		}
	});

	it('protects app APIs with a 403 for unverified users', () => {
		for (const path of [
			'/api/habits',
			'/api/habits/123/complete',
			'/api/quests/daily',
			'/api/character/boost-stat',
			'/api/notifications',
			'/api/categories/defaults'
		]) {
			expect(getVerificationGate(path, false)).toBe('api');
		}
	});

	it('exempts the verification flow and logout for unverified users', () => {
		for (const path of [
			'/verify-email',
			'/verify-email/abc123',
			'/verify-email-pending',
			'/logout',
			'/api/resend-verification',
			'/api/check-verification-status'
		]) {
			expect(getVerificationGate(path, false)).toBe('allow');
		}
	});

	it('allows public pages for unverified users', () => {
		for (const path of ['/', '/contact', '/faq', '/features', '/privacy', '/terms', '/waitlist']) {
			expect(getVerificationGate(path, false)).toBe('allow');
		}
	});
});
