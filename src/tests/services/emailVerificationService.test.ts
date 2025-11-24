import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
	sendVerificationEmail, 
	sendWelcomeEmail,
	createVerificationEmailTemplate,
	createWelcomeEmailTemplate
} from '$lib/server/services/emailVerificationService';

// Mock Resend with a factory function to avoid hoisting issues
vi.mock('resend', () => {
	const mockSend = vi.fn().mockResolvedValue({ id: 'test-email-id' });
	return {
		Resend: vi.fn().mockImplementation(() => ({
			emails: {
				send: mockSend
			}
		})),
		// Export mockSend so we can access it in tests
		__mockSend: mockSend
	};
});

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
});

describe('HTML Escaping Security - Template Testing', () => {
	it('should HTML-escape malicious script tags in verification links', () => {
		// Test with a malicious link containing script tags
		const maliciousLink = 'http://example.com/verify?token=<script>alert("xss")</script>';
		const html = createVerificationEmailTemplate('testuser', maliciousLink);
		
		// Verify script tags are escaped
		expect(html).not.toContain('<script>');
		expect(html).not.toContain('</script>');
		expect(html).toContain('&lt;script&gt;');
		expect(html).toContain('&lt;/script&gt;');
	});

	it('should HTML-escape ampersands in verification links', () => {
		// Test with a link containing ampersands (common in query strings)
		const linkWithAmpersand = 'http://example.com/verify?token=abc&user=test&redirect=home';
		const html = createVerificationEmailTemplate('testuser', linkWithAmpersand);
		
		// Verify ampersands are escaped in href attributes
		expect(html).toContain('&amp;user=');
		expect(html).toContain('&amp;redirect=');
	});

	it('should HTML-escape quotes in verification links', () => {
		// Test with a link containing quotes
		const linkWithQuotes = 'http://example.com/verify?msg="hello"&data=\'test\'';
		const html = createVerificationEmailTemplate('testuser', linkWithQuotes);
		
		// Verify quotes are escaped
		expect(html).toContain('&quot;');
		expect(html).toContain('&#39;');
		expect(html).not.toContain('msg="hello"');
	});

	it('should HTML-escape usernames in verification email', () => {
		// Even though validation prevents this, test the escaping works
		const html = createVerificationEmailTemplate('test<user>', 'http://example.com/verify');
		
		// Verify angle brackets are escaped
		expect(html).toContain('test&lt;user&gt;');
		expect(html).not.toContain('test<user>');
	});

	it('should HTML-escape usernames in welcome email', () => {
		const html = createWelcomeEmailTemplate('test<user>');
		
		// Verify angle brackets are escaped
		expect(html).toContain('test&lt;user&gt;');
		expect(html).not.toContain('test<user>');
	});

	it('should escape img tags with onerror in links', () => {
		const maliciousLink = 'http://example.com/"><img src=x onerror=alert(1)><"';
		const html = createVerificationEmailTemplate('testuser', maliciousLink);
		
		// Verify the malicious payload is escaped (the link contains escaped HTML)
		expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
		// Verify the onerror attribute is not executable
		expect(html).not.toContain('src=x onerror=alert(1)>');
	});

	it('should preserve safe URLs without modification', () => {
		const safeLink = 'http://localhost:5175/verify-email/abc123def456';
		const html = createVerificationEmailTemplate('testuser', safeLink);
		
		// Safe URLs should still be present (though they may have some chars escaped)
		expect(html).toContain('verify-email');
		expect(html).toContain('abc123def456');
	});
});
