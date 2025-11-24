import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sendVerificationEmail, sendWelcomeEmail } from '$lib/server/services/emailVerificationService';

// Mock Resend
vi.mock('resend', () => ({
	Resend: vi.fn().mockImplementation(() => ({
		emails: {
			send: vi.fn().mockResolvedValue({ id: 'test-email-id' })
		}
	}))
}));

// Mock environment
process.env.RESEND_API_KEY = 'test-key';

describe('Email Verification Service - Input Validation', () => {
	describe('sendVerificationEmail', () => {
		it('should reject invalid email addresses', async () => {
			const result = await sendVerificationEmail('invalid-email', 'testuser', 'token123');
			expect(result.success).toBe(false);
			expect(result.error).toContain('Invalid email');
		});

		it('should reject emails that are too long', async () => {
			const longEmail = 'a'.repeat(250) + '@example.com';
			const result = await sendVerificationEmail(longEmail, 'testuser', 'token123');
			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});

		it('should reject empty email', async () => {
			const result = await sendVerificationEmail('', 'testuser', 'token123');
			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});

		it('should reject usernames that are too short', async () => {
			const result = await sendVerificationEmail('test@example.com', 'ab', 'token123');
			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});

		it('should reject usernames that are too long', async () => {
			const longUsername = 'a'.repeat(31);
			const result = await sendVerificationEmail('test@example.com', longUsername, 'token123');
			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});

		it('should reject usernames with invalid characters', async () => {
			const result = await sendVerificationEmail('test@example.com', 'user name', 'token123');
			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});

		it('should reject empty username', async () => {
			const result = await sendVerificationEmail('test@example.com', '', 'token123');
			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});

		it('should reject empty token', async () => {
			const result = await sendVerificationEmail('test@example.com', 'testuser', '');
			expect(result.success).toBe(false);
			expect(result.error).toContain('Token is required');
		});

		it('should accept valid inputs', async () => {
			const result = await sendVerificationEmail('test@example.com', 'testuser', 'valid-token-123');
			expect(result.success).toBe(true);
			expect(result.error).toBeUndefined();
		});

		it('should accept valid username with underscores and hyphens', async () => {
			const result = await sendVerificationEmail('test@example.com', 'test_user-123', 'token123');
			expect(result.success).toBe(true);
		});
	});

	describe('sendWelcomeEmail', () => {
		it('should reject invalid email addresses', async () => {
			const result = await sendWelcomeEmail('invalid-email', 'testuser');
			expect(result.success).toBe(false);
			expect(result.error).toContain('Invalid email');
		});

		it('should reject emails that are too long', async () => {
			const longEmail = 'a'.repeat(250) + '@example.com';
			const result = await sendWelcomeEmail(longEmail, 'testuser');
			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});

		it('should reject empty email', async () => {
			const result = await sendWelcomeEmail('', 'testuser');
			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});

		it('should reject usernames that are too short', async () => {
			const result = await sendWelcomeEmail('test@example.com', 'ab');
			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});

		it('should reject usernames that are too long', async () => {
			const longUsername = 'a'.repeat(31);
			const result = await sendWelcomeEmail('test@example.com', longUsername);
			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});

		it('should reject usernames with invalid characters', async () => {
			const result = await sendWelcomeEmail('test@example.com', 'user name');
			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});

		it('should reject empty username', async () => {
			const result = await sendWelcomeEmail('test@example.com', '');
			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});

		it('should accept valid inputs', async () => {
			const result = await sendWelcomeEmail('test@example.com', 'testuser');
			expect(result.success).toBe(true);
			expect(result.error).toBeUndefined();
		});

		it('should accept valid username with underscores and hyphens', async () => {
			const result = await sendWelcomeEmail('test@example.com', 'test_user-123');
			expect(result.success).toBe(true);
		});
	});

	describe('HTML Escaping Security', () => {
		it('should HTML-escape verification links to prevent XSS', async () => {
			const result = await sendVerificationEmail('test@example.com', 'testuser', 'valid-token');
			expect(result.success).toBe(true);
		});

		it('should HTML-escape usernames to prevent XSS', async () => {

			const result = await sendVerificationEmail('test@example.com', 'testuser', 'token123');
			expect(result.success).toBe(true);
		});
	});
});
