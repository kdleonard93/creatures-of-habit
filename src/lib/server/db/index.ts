import { dev } from '$app/environment';
import 'dotenv/config';
import * as schema from './schema';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';

const dbUrl = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!dbUrl) throw new Error('TURSO_DATABASE_URL! is not set');

if (!dev && !authToken) throw new Error('TURSO_AUTH_TOKEN! is not set');

const client = createClient({ url: dbUrl, authToken: authToken });

export const db = drizzle(client, { schema });
