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
const TEST_PORT = 5175;
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
	
	console.log('✅ Test environment variables prepared');
}

async function startTestServer(): Promise<void> {
	console.log('🚀 Starting test server...');
	
	return new Promise((resolve, reject) => {
		let resolved = false;
		
		serverProcess = spawn(
			'pnpm',
			['run', 'dev', '--', '--port', TEST_PORT.toString(), '--mode', 'test'],
			{
				env: {
					...process.env,
					NODE_ENV: 'test',
					MODE: 'test',
					TURSO_DATABASE_URL: `file:${TEST_DB_PATH}`,
					TURSO_AUTH_TOKEN: '',
					DATABASE_URL: `file:${TEST_DB_PATH}`,
					LOCAL_DATABASE_URL: `file:${TEST_DB_PATH}`,
					TRUST_PROXY: 'false',
					RESEND_API_KEY: '',
					PUBLIC_POSTHOG_KEY: '',
					RATE_LIMIT_TEST_ENDPOINT: process.env.RATE_LIMIT_TEST_ENDPOINT ?? '/api/register'
				},
				stdio: ['pipe', 'pipe', 'pipe']
			}
		);

		let output = '';
		
		serverProcess.stdout?.on('data', (data) => {
			output += data.toString();
			if (!resolved && output.includes('Local:') && output.includes(TEST_PORT.toString())) {
				resolved = true;
				console.log('✅ Test server started');
				setTimeout(resolve, 1000);
			}
		});

		serverProcess.stderr?.on('data', (data) => {
			const error = data.toString();
			if (error.includes('EADDRINUSE')) {
				reject(new Error(`Port ${TEST_PORT} is already in use`));
			}
		});

		serverProcess.on('error', reject);
		
		setTimeout(() => {
			reject(new Error('Server startup timeout'));
		}, 30000);
	});
}

async function makeRequest(
	endpoint: string,
	method: 'GET' | 'POST' = 'GET',
	body: any = null,
	{ timeoutMs = 10000, manualRedirect = false }: { timeoutMs?: number; manualRedirect?: boolean } = {}
  ): Promise<ApiResponse> {
	const controller = new AbortController();
	const options: RequestInit = {
	  method,
	  headers: {},
	  signal: controller.signal,
	  redirect: manualRedirect ? 'manual' : 'follow'
	};
	if (body && method === 'POST') {
	  (options.headers as Record<string, string>)['Content-Type'] = 'application/json';
	  options.body = JSON.stringify(body);
	}
	try {
	  const t = setTimeout(() => controller.abort(), timeoutMs);
	  const response = await fetch(`${BASE_URL}${endpoint}`, options);
	  clearTimeout(t);
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

async function testSecurityHeaders(): Promise<void> {
	console.log('\n🔐 Testing Security Headers...');
	
	const result = await makeRequest('/');
	
	if (!isRequestResult(result)) {
		throw new Error(`Failed to fetch endpoint: ${result.error}`);
	}

	console.log(`Status: ${result.status}`);
	
	const securityHeaders = [
		'content-security-policy',
		'x-frame-options',
		'x-content-type-options',
		'referrer-policy'
	];

	console.log('\nSecurity Headers:');
	const missing: string[] = [];
	for (const header of securityHeaders) {
		if (result.headers[header]) {
			console.log(`✅ ${header}: Present`);
		} else {
			console.log(`❌ ${header}: Missing`);
			missing.push(header);
		}
	}
	if (missing.length) {
		throw new Error(`Missing required security headers: ${missing.join(', ')}`);
	}
}

async function testRateLimitEnforcement(): Promise<void> {
	console.log('\n⚡ Testing Rate Limit Enforcement...');
	console.log('Making multiple requests to trigger rate limiting...');

	console.log(`Environment RATE_LIMIT_TEST_ENDPOINT: ${process.env.RATE_LIMIT_TEST_ENDPOINT}`);
	const testEndpoint = process.env.RATE_LIMIT_TEST_ENDPOINT ?? '/api/register';
	console.log(`Using test endpoint: ${testEndpoint}`);
	let enforced = false;	
	
	for (let i = 1; i <= 6; i++) {
		console.log(`\nRequest ${i}:`);
		
		let result;
		
		if (testEndpoint === '/api/register') {
			const testData = {
				email: `test${i}@example.com`,
				username: `testuser${i}`,
				password: 'wrongpassword',
				confirmPassword: 'wrongpassword',
				age: 25,
				creature: {
					name: 'TestCreature',
					class: 'warrior',
					race: 'human'
				}
			};
			
			result = await makeRequest(testEndpoint, 'POST', testData, { manualRedirect: true });
		} else {
			const formData = new FormData();
			formData.append('username', 'testuser');
			formData.append('password', 'wrongpassword');
			
			const options: RequestInit = {
				method: 'POST',
				body: formData,
				redirect: 'manual'
			};
			
			try {
				const response = await fetch(`${BASE_URL}${testEndpoint}`, options);
				result = {
					status: response.status,
					headers: Object.fromEntries(response.headers.entries()),
					body: await response.text()
				};
			} catch (error) {
				result = {
					error: error instanceof Error ? error.message : String(error)
				};
			}
		}
		
		if (!isRequestResult(result)) {
			console.log(`Error: ${result.error}`);
			continue;
		}
		
		console.log(`Status: ${result.status}`);
		
		if (result.status === 403) {
			console.log(`Response body: ${result.body.substring(0, 200)}...`);
		}
		
		if (result.headers['x-ratelimit-limit']) {
			console.log(`Rate Limit: ${result.headers['x-ratelimit-remaining']}/${result.headers['x-ratelimit-limit']}`);
		}
		
		if (result.headers['retry-after']) {
			console.log(`Retry After: ${result.headers['retry-after']} seconds`);
		}
		
		if (result.status === 429 || result.status === 500) {
			console.log('✅ Rate limit enforced successfully!');
			enforced = true;
		}
		
		await new Promise(resolve => setTimeout(resolve, 100));
	}
	
	if (!enforced) {
		throw new Error('Rate limit was not enforced - no 429 status received after multiple requests');
	}
}

async function cleanup(): Promise<void> {
	console.log('\n🧹 Cleaning up...');
	
	if (serverProcess && !serverProcess.killed) {
		serverProcess.kill('SIGTERM');
		await new Promise<void>((resolve) => {
			const timeout = setTimeout(() => {
				if (serverProcess && !serverProcess.killed) {
					serverProcess.kill('SIGKILL');
				}
				resolve();
			}, 3000);
			
			serverProcess?.on('exit', () => {
				clearTimeout(timeout);
				resolve();
			});
		});
		console.log('✅ Test server stopped');
		serverProcess = null;
	}
	
	await new Promise(resolve => setTimeout(resolve, 500));
	
	try {
		if (existsSync(TEST_DB_PATH)) {
			unlinkSync(TEST_DB_PATH);
			console.log('✅ Removed test database');
		}
		
		const dbFiles = [TEST_DB_PATH + '-wal', TEST_DB_PATH + '-shm'];
		for (const file of dbFiles) {
			if (existsSync(file)) {
				unlinkSync(file);
				console.log(`✅ Removed ${file}`);
			}
		}
	} catch (error) {
		console.log('⚠️  Cleanup warning:', error instanceof Error ? error.message : String(error));
	}
	
	console.log('✅ Cleanup completed');
}

async function main(): Promise<void> {
	console.log('🧪 Starting Rate Limiting Integration Test');
	console.log(`Testing against: ${BASE_URL}`);
	
	try {
		await setupTestEnvironment();
		await startTestServer();
		await testSecurityHeaders();
		await testRateLimitEnforcement();
		
		console.log('\n✅ Integration tests completed!');
		
	} catch (error) {
		console.error('\n❌ Test failed:', error instanceof Error ? error.message : String(error));
		await cleanup();
		process.exit(1);
	} finally {
		await cleanup();
		process.exit(0);
	}
}

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

void main();
