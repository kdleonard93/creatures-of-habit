#!/usr/bin/env tsx

/**
 * Rate Limiting Integration Test Script
 * 
 * This script tests rate limiting by creating a temporary test database
 * and making controlled requests without polluting the main database.
 */

import { spawn, type ChildProcess } from 'child_process';
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';

const TEST_DB_PATH = 'test-rate-limiting.db';
const TEST_PORT = 5174;
const BASE_URL = `http://localhost:${TEST_PORT}`;

interface RequestResult {
	status: number;
	headers: Record<string, string>;
	body: string;
}

interface RequestError {
	error: string;
}

type ApiResponse = RequestResult | RequestError;

let serverProcess: ChildProcess | null = null;

async function setupTestEnvironment(): Promise<void> {
	console.log('🔧 Setting up test environment...');
	
	// Create test environment file
	const testEnvContent = `
TURSO_DATABASE_URL="file:${TEST_DB_PATH}"
TURSO_AUTH_TOKEN=""
LOCAL_DATABASE_URL="file:${TEST_DB_PATH}"
TRUST_PROXY=false
RESEND_API_KEY=""
PUBLIC_POSTHOG_KEY=""
`;
	
	writeFileSync('.env.test', testEnvContent.trim());
	console.log('✅ Created test environment file');
}

async function startTestServer(): Promise<void> {
	console.log('🚀 Starting test server...');
	
	return new Promise((resolve, reject) => {
		serverProcess = spawn('pnpm', ['dev', '--port', TEST_PORT.toString()], {
			env: {
				...process.env,
				NODE_ENV: 'test',
				DATABASE_URL: `file:${TEST_DB_PATH}`,
				LOCAL_DATABASE_URL: `file:${TEST_DB_PATH}`
			},
			stdio: ['pipe', 'pipe', 'pipe']
		});

		let output = '';
		
		serverProcess.stdout?.on('data', (data) => {
			output += data.toString();
			if (output.includes('Local:') && output.includes(TEST_PORT.toString())) {
				console.log('✅ Test server started');
				setTimeout(resolve, 2000); // Give server time to fully initialize
			}
		});

		serverProcess.stderr?.on('data', (data) => {
			const error = data.toString();
			if (error.includes('EADDRINUSE')) {
				reject(new Error(`Port ${TEST_PORT} is already in use`));
			}
		});

		serverProcess.on('error', reject);
		
		// Timeout after 30 seconds
		setTimeout(() => {
			reject(new Error('Server startup timeout'));
		}, 30000);
	});
}

async function makeRequest(
	endpoint: string,
	method: 'GET' | 'POST' = 'GET',
	body: any = null
): Promise<ApiResponse> {
	const options: RequestInit = {
		method,
		headers: {}
	};

	if (body && method === 'POST') {
		(options.headers as Record<string, string>)['Content-Type'] = 'application/json';
		options.body = JSON.stringify(body);
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

async function testRateLimitHeaders(): Promise<void> {
	console.log('\n🔐 Testing Rate Limit Headers...');
	
	// Test a simple endpoint that should have rate limiting
	const result = await makeRequest('/');
	
	if (!isRequestResult(result)) {
		console.log(`❌ Error: ${result.error}`);
		return;
	}

	console.log(`Status: ${result.status}`);
	
	// Check for security headers
	const securityHeaders = [
		'content-security-policy',
		'x-frame-options',
		'x-content-type-options',
		'referrer-policy'
	];

	console.log('\nSecurity Headers:');
	for (const header of securityHeaders) {
		if (result.headers[header]) {
			console.log(`✅ ${header}: Present`);
		} else {
			console.log(`❌ ${header}: Missing`);
		}
	}
}

async function testRateLimitEnforcement(): Promise<void> {
	console.log('\n⚡ Testing Rate Limit Enforcement...');
	console.log('Making multiple requests to trigger rate limiting...');

	// Make requests to a non-existent endpoint to avoid database operations
	const testEndpoint = '/api/test-rate-limit';
	
	for (let i = 1; i <= 6; i++) {
		console.log(`\nRequest ${i}:`);
		const result = await makeRequest(testEndpoint, 'POST', { test: true });
		
		if (!isRequestResult(result)) {
			console.log(`Error: ${result.error}`);
			continue;
		}

		console.log(`Status: ${result.status}`);
		
		// Check rate limit headers
		if (result.headers['x-ratelimit-limit']) {
			console.log(`Rate Limit: ${result.headers['x-ratelimit-remaining']}/${result.headers['x-ratelimit-limit']}`);
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

async function cleanup(): Promise<void> {
	console.log('\n🧹 Cleaning up...');
	
	if (serverProcess) {
		serverProcess.kill('SIGTERM');
		console.log('✅ Test server stopped');
	}
	
	// Clean up test files
	try {
		if (existsSync('.env.test')) {
			unlinkSync('.env.test');
			console.log('✅ Removed test environment file');
		}
		
		if (existsSync(TEST_DB_PATH)) {
			unlinkSync(TEST_DB_PATH);
			console.log('✅ Removed test database');
		}
	} catch (error) {
		console.log('⚠️  Cleanup warning:', error instanceof Error ? error.message : String(error));
	}
}

async function main(): Promise<void> {
	console.log('🧪 Starting Rate Limiting Integration Test');
	console.log(`Testing against: ${BASE_URL}`);
	
	try {
		await setupTestEnvironment();
		await startTestServer();
		await testRateLimitHeaders();
		await testRateLimitEnforcement();
		
		console.log('\n✅ Integration tests completed!');
		
	} catch (error) {
		console.error('\n❌ Test failed:', error instanceof Error ? error.message : String(error));
		process.exit(1);
	} finally {
		await cleanup();
	}
}

// Handle process termination
process.on('SIGINT', async () => {
	console.log('\n🛑 Test interrupted');
	await cleanup();
	process.exit(0);
});

process.on('SIGTERM', async () => {
	console.log('\n🛑 Test terminated');
	await cleanup();
	process.exit(0);
});

// Run the tests
void main();
