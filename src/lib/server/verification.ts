/**
 * Email verification gate.
 *
 * Unverified accounts may only use the verification flow, logout, the
 * verification status check, and public pages. Protected pages redirect to the
 * pending screen; protected APIs return 403. See docs/audit-backlog.md A-6.
 */

const EXEMPT_PREFIXES = [
	'/verify-email',
	'/verify-email-pending',
	'/logout',
	'/api/resend-verification',
	'/api/check-verification-status'
];

const PROTECTED_API_PREFIXES = [
	'/api/habits',
	'/api/quests',
	'/api/character',
	'/api/notifications',
	'/api/categories'
];

const PROTECTED_PAGE_PREFIXES = [
	'/dashboard',
	'/habits',
	'/quests',
	'/character',
	'/settings',
	'/notifications',
	'/admin'
];

export type VerificationGate = 'allow' | 'api' | 'redirect';

export function getVerificationGate(pathname: string, emailVerified: boolean): VerificationGate {
	if (emailVerified) {
		return 'allow';
	}

	if (EXEMPT_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
		return 'allow';
	}

	if (PROTECTED_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
		return 'api';
	}

	if (PROTECTED_PAGE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
		return 'redirect';
	}

	return 'allow';
}
