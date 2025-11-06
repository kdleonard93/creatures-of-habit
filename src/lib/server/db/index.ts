import { dev, building } from '$app/environment';
import 'dotenv/config';
import * as schema from './schema';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';

const tursoUrl = process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL;
const localUrl = process.env.LOCAL_DATABASE_URL;
const dbUrl = tursoUrl ?? (building || dev ? localUrl ?? "file:local.db" : undefined);
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!dbUrl) {
  throw new Error('Database URL is not set. Set TURSO_DATABASE_URL or LOCAL_DATABASE_URL.');
}
if (!dev && dbUrl.startsWith('libsql://') && !authToken) {
  throw new Error('TURSO_AUTH_TOKEN is not set for non-dev environments');
}
const client = createClient({ url: dbUrl, ...(authToken ? { authToken } : {}) });

export const db = drizzle(client, { schema });
