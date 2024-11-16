import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';
if (!process.env.TURSO_DATABASE_URL) throw new Error('DATABASE_URL is not set');
if (!process.env.TURSO_AUTH_TOKEN) throw new Error('DATABASE_URL is not set');

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	dbCredentials: {
		url: process.env.TURSO_DATABASE_URL,
		authToken: process.env.TURSO_AUTH_TOKEN,
	},
	verbose: true,
	strict: true,
	out: './migrations',
	dialect: 'turso'
});
