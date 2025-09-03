#!/usr/bin/env tsx

/**
 * Rate Limiting Test Script
 * 
 * This script tests the rate limiting functionality by making multiple requests
 * to authentication endpoints and verifying that rate limits are enforced.
 */

const BASE_URL = 'http://localhost:5175';

interface RequestResult {
	status: number;
	headers: Record<string, string>;
	body: string;
}

interface RequestError {
	error: string;
}

type ApiResponse = RequestResult | RequestError;

interface LoginData {
	username: string;
	password: string;
}

interface RegistrationData {
	email: string;
	username: string;
	password: string;
	confirmPassword: string;
	age: number;
	creature: {
		name: string;
		class: string;
		race: string;
	};
}

interface ResetData {
	username: string;
}

async function makeRequest(
	endpoint: string,
	method: 'GET' | 'POST' = 'POST',
	body: LoginData | RegistrationData | ResetData | null = null,
	isFormData = false
): Promise<ApiResponse> {
	const options: RequestInit = {
		method,
		headers: {}
	};

	if (body) {
		if (isFormData) {
			// For form endpoints like login and password reset
			const formData = new FormData();
			for (const [key, value] of Object.entries(body)) {
				if (typeof value === 'object') {
					formData.append(key, JSON.stringify(value));
				} else {
					formData.append(key, String(value));
				}
			}
			options.body = formData;
		} else {
			// For JSON API endpoints like registration
			(options.headers as Record<string, string>)['Content-Type'] = 'application/json';
			options.body = JSON.stringify(body);
		}
	}

	try {
		const response = await fetch(`${BASE_URL}${endpoint}`, options);
		return {
			status: response.status,
			headers: Object.fromEntries(response.headers.entries()),
			body: await response.text()
		};
	} catch (error) {
		return {
			error: error instanceof Error ? error.message : String(error)
		};
	}
}

function isRequestResult(response: ApiResponse): response is RequestResult {
	return 'status' in response;
}

async function testLoginRateLimit(): Promise<void> {
	console.log('\n🔐 Testing Login Rate Limiting...');
	console.log('Making 6 login attempts (limit is 5 per 15 minutes)');

	const loginData: LoginData = {
		username: 'testuser',
		password: 'wrongpassword'
	};

	for (let i = 1; i <= 6; i++) {
		console.log(`\nAttempt ${i}:`);
		const result = await makeRequest('/login', 'POST', loginData, true);
		
		if (!isRequestResult(result)) {
			console.log(`Error: ${result.error}`);
			continue;
		}

		console.log(`Status: ${result.status}`);
		if (result.headers['x-ratelimit-limit']) {
			console.log(`Rate Limit: ${result.headers['x-ratelimit-remaining']}/${result.headers['x-ratelimit-limit']}`);
			console.log(`Reset Time: ${new Date(Number.parseInt(result.headers['x-ratelimit-reset'], 10)).toLocaleTimeString()}`);
		}
		if (result.headers['retry-after']) {
			console.log(`Retry After: ${result.headers['retry-after']} seconds`);
		}
		
		if (result.status === 429) {
			console.log('✅ Rate limit enforced successfully!');
			break;
		}
		
		// Small delay between requests
		await new Promise(resolve => setTimeout(resolve, 100));
	}
}

async function testRegistrationRateLimit(): Promise<void> {
	console.log('\n📝 Testing Registration Rate Limiting...');
	console.log('Making 6 registration attempts (limit is 5 per 15 minutes)');

	for (let i = 1; i <= 6; i++) {
		const registrationData: RegistrationData = {
			email: `test${i}@example.com`,
			username: `testuser${i}`,
			password: 'testpassword123',
			confirmPassword: 'testpassword123',
			age: 25,
			creature: {
				name: `TestCreature${i}`,
				class: 'warrior',
				race: 'human'
			}
		};

		console.log(`\nAttempt ${i}:`);
		const result = await makeRequest('/api/register', 'POST', registrationData);
		
		if (!isRequestResult(result)) {
			console.log(`Error: ${result.error}`);
			continue;
		}

		console.log(`Status: ${result.status}`);
		if (result.headers['x-ratelimit-limit']) {
			console.log(`Rate Limit: ${result.headers['x-ratelimit-remaining']}/${result.headers['x-ratelimit-limit']}`);
			console.log(`Reset Time: ${new Date(Number.parseInt(result.headers['x-ratelimit-reset'], 10)).toLocaleTimeString()}`);
		}
		if (result.headers['retry-after']) {
			console.log(`Retry After: ${result.headers['retry-after']} seconds`);
		}
		
		if (result.status === 429) {
			console.log('✅ Rate limit enforced successfully!');
			break;
		}
		
		await new Promise(resolve => setTimeout(resolve, 100));
	}
}

async function testPasswordResetRateLimit(): Promise<void> {
	console.log('\n🔑 Testing Password Reset Rate Limiting...');
	console.log('Making 4 password reset attempts (limit is 3 per hour)');

	const resetData: ResetData = {
		username: 'testuser'
	};

	for (let i = 1; i <= 4; i++) {
		console.log(`\nAttempt ${i}:`);
		const result = await makeRequest('/forgot-password', 'POST', resetData, true);
		
		if (!isRequestResult(result)) {
			console.log(`Error: ${result.error}`);
			continue;
		}

		console.log(`Status: ${result.status}`);
		if (result.headers['x-ratelimit-limit']) {
			console.log(`Rate Limit: ${result.headers['x-ratelimit-remaining']}/${result.headers['x-ratelimit-limit']}`);
			console.log(`Reset Time: ${new Date(Number.parseInt(result.headers['x-ratelimit-reset'], 10)).toLocaleTimeString()}`);
		}
		if (result.headers['retry-after']) {
			console.log(`Retry After: ${result.headers['retry-after']} seconds`);
		}
		
		if (result.status === 429) {
			console.log('✅ Rate limit enforced successfully!');
			break;
		}
		
		await new Promise(resolve => setTimeout(resolve, 100));
	}
}

async function testSecurityHeaders(): Promise<void> {
	console.log('\n🛡️  Testing Security Headers...');
	
	const result = await makeRequest('/', 'GET');
	
	if (!isRequestResult(result)) {
		console.log(`Error: ${result.error}`);
		return;
	}

	const securityHeaders = [
		'content-security-policy',
		'x-frame-options',
		'x-content-type-options',
		'referrer-policy',
		'permissions-policy',
		'x-dns-prefetch-control',
		'x-download-options',
		'x-permitted-cross-domain-policies'
	] as const;

	console.log('Security Headers Present:');
	for (const header of securityHeaders) {
		if (result.headers[header]) {
			console.log(`✅ ${header}: ${result.headers[header]}`);
		} else {
			console.log(`❌ ${header}: Missing`);
		}
	}

	// Check HSTS in production (won't be present in development)
	if (result.headers['strict-transport-security']) {
		console.log(`✅ strict-transport-security: ${result.headers['strict-transport-security']}`);
	} else {
		console.log('ℹ️  strict-transport-security: Not present (expected in development)');
	}
}

async function main(): Promise<void> {
	console.log('🚀 Starting Rate Limiting and Security Headers Test');
	console.log(`Testing against: ${BASE_URL}`);
	console.log('Make sure your development server is running!');

	try {
		await testSecurityHeaders();
		await testLoginRateLimit();
		await testRegistrationRateLimit();
		await testPasswordResetRateLimit();
		
		console.log('\n✅ All tests completed!');
		console.log('\nNote: If rate limits were not enforced, check that:');
		console.log('1. Your development server is running');
		console.log('2. The rate limiting middleware is properly imported');
		console.log('3. The endpoints are using the correct rate limit configurations');
		
	} catch (error) {
		console.error('\n❌ Test failed:', error instanceof Error ? error.message : String(error));
		process.exit(1);
	}
}

// Run the tests
void main();
