import { describe, it, expect } from 'vitest';
import { escapeHtml } from '$lib/utils/html';

describe('escapeHtml', () => {
	it('should escape ampersands', () => {
		expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
	});

	it('should escape less-than signs', () => {
		expect(escapeHtml('5 < 10')).toBe('5 &lt; 10');
	});

	it('should escape greater-than signs', () => {
		expect(escapeHtml('10 > 5')).toBe('10 &gt; 5');
	});

	it('should escape double quotes', () => {
		expect(escapeHtml('Say "hello"')).toBe('Say &quot;hello&quot;');
	});

	it('should escape single quotes', () => {
		expect(escapeHtml("It's working")).toBe('It&#39;s working');
	});

	it('should escape script tags to prevent XSS', () => {
		const malicious = '<script>alert("xss")</script>';
		const escaped = escapeHtml(malicious);
		
		expect(escaped).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
		expect(escaped).not.toContain('<script>');
		expect(escaped).not.toContain('</script>');
	});

	it('should escape img tags with onerror to prevent XSS', () => {
		const malicious = '<img src=x onerror=alert(1)>';
		const escaped = escapeHtml(malicious);
		
		expect(escaped).toBe('&lt;img src=x onerror=alert(1)&gt;');
		expect(escaped).not.toContain('<img');
		expect(escaped).not.toContain('>');
	});

	it('should escape multiple special characters in one string', () => {
		const input = '<div class="test" data-value=\'5 & 10\'>Content</div>';
		const escaped = escapeHtml(input);
		
		expect(escaped).toContain('&lt;div');
		expect(escaped).toContain('&quot;test&quot;');
		expect(escaped).toContain('&#39;5 &amp; 10&#39;');
		expect(escaped).toContain('&gt;Content&lt;/div&gt;');
		expect(escaped).not.toContain('<');
		expect(escaped).not.toContain('>');
	});

	it('should handle strings with no special characters', () => {
		expect(escapeHtml('Hello World')).toBe('Hello World');
		expect(escapeHtml('12345')).toBe('12345');
	});

	it('should handle empty strings', () => {
		expect(escapeHtml('')).toBe('');
	});

	it('should escape URL with special characters', () => {
		const url = 'http://example.com/verify?token=abc&user=<test>';
		const escaped = escapeHtml(url);
		
		expect(escaped).toContain('&amp;');
		expect(escaped).toContain('&lt;test&gt;');
		expect(escaped).not.toContain('&user');
		expect(escaped).not.toContain('<test>');
	});
});
