import { dev } from '$app/environment';
import 'dotenv/config';
import * as schema from './schema';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient, type Client } from '@libsql/client';

const dbUrl = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
const localDbUrl = process.env.LOCAL_DATABASE_URL;

// Create the appropriate client based on environment
let client: Client;

const useLocal = dev && localDbUrl?.startsWith('file:');

// In development, prefer local database if specified
if (useLocal) {
	client = createClient({ url: localDbUrl as string });
} else {
	// Use Turso for production or when local DB not specified
	if (!dbUrl) throw new Error('TURSO_DATABASE_URL is not set');
	if (!authToken) throw new Error('TURSO_AUTH_TOKEN is not set');
	client = createClient({ url: dbUrl, authToken });
}

export const db = drizzle(client, { schema });
