/**
 * Server-side URL utilities for safe canonical URL construction
 */

/**
 * Gets the canonical base URL from environment or falls back to safe default
 * This prevents Host header injection attacks by using a configured canonical URL
 */
export function getCanonicalBaseUrl(): string {
	// Try to get from environment first
	const canonicalUrl = process.env.CANONICAL_BASE_URL;
	
	if (canonicalUrl) {
		// Remove trailing slash to ensure consistent URL construction
		return canonicalUrl.replace(/\/$/, '');
	}
	
	// Safe fallback for development/testing
	// In production, CANONICAL_BASE_URL should always be set
	const fallback = process.env.NODE_ENV === 'production' 
		? 'https://creatures-of-habit.app' // Replace with your actual domain
		: 'http://localhost:5175';
	
	return fallback.replace(/\/$/, '');
}

/**
 * Safely constructs a full URL using the canonical base URL
 * @param path - The path to append (should start with /)
 * @param params - Optional query parameters or URL fragments
 */
export function buildCanonicalUrl(path: string, params?: string): string {
	const baseUrl = getCanonicalBaseUrl();
	
	// Ensure path starts with / and doesn't have double slashes
	const cleanPath = path.startsWith('/') ? path : `/${path}`;
	
	const url = `${baseUrl}${cleanPath}`;
	
	return params ? `${url}${params}` : url;
}

/**
 * Constructs a password reset URL safely using canonical base URL
 * @param token - The password reset token (will be URL encoded)
 */
export function buildPasswordResetUrl(token: string): string {
	return buildCanonicalUrl(`/reset-password/${encodeURIComponent(token)}`);
}
