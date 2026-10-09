import { describe, it, expect, beforeEach, vi } from 'vitest';

// Stub the Resend network boundary. The provider constructs a client in its
// constructor, so the mock must be hoisted above the import.
const { mockSend } = vi.hoisted(() => ({
	mockSend: vi.fn()
}));
vi.mock('resend', () => ({
	Resend: vi.fn().mockImplementation(() => ({ emails: { send: mockSend } }))
}));

import { ResendEmailProvider } from '$lib/server/services/email/ResendEmailProvider';

const options = {
	from: 'Creatures of Habit <onboarding@resend.dev>',
	to: 'player@example.com',
	subject: 'Test Subject',
	html: '<p>Hello</p>'
};

/**
 * Resend's SDK resolves with `{ data, error }` instead of throwing on API level
 * failures. The provider must not report success when `error` is present.
 * See docs/audit-backlog.md A-4.
 */
describe('ResendEmailProvider', () => {
	beforeEach(() => {
		mockSend.mockReset();
	});

	it('returns success when Resend resolves with data and no error', async () => {
		mockSend.mockResolvedValue({ data: { id: 'email-1' }, error: null });

		const provider = new ResendEmailProvider('test-key');
		const result = await provider.sendEmail(options);

		expect(result).toEqual({ success: true });
	});

	it('surfaces a resolved Resend error result as a failure', async () => {
		mockSend.mockResolvedValue({
			data: null,
			error: { message: 'Invalid `from` field', name: 'validation_error' }
		});

		const provider = new ResendEmailProvider('test-key');
		const result = await provider.sendEmail(options);

		expect(result.success).toBe(false);
		expect(result.error).toContain('Invalid `from` field');
	});

	it('returns a failure when Resend throws', async () => {
		mockSend.mockRejectedValue(new Error('network down'));

		const provider = new ResendEmailProvider('test-key');
		const result = await provider.sendEmail(options);

		expect(result.success).toBe(false);
		expect(result.error).toBe('Failed to send email');
	});

	it('returns a failure when no API key is configured', async () => {
		const provider = new ResendEmailProvider(undefined);
		const result = await provider.sendEmail(options);

		expect(result).toEqual({ success: false, error: 'Email service not configured' });
	});
});
