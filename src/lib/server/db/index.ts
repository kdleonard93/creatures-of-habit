import { dev } from '$app/environment';
import 'dotenv/config';
import * as schema from './schema';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { env } from '$env/dynamic/private';

if (!env.TURSO_DATABASE_URL!) throw new Error('TURSO_DATABASE_URL! is not set');

if (!dev && !env.TURSO_AUTH_TOKEN!) throw new Error('TURSO_AUTH_TOKEN! is not set');

const client = createClient({ url: env.TURSO_DATABASE_URL!, authToken: env.TURSO_AUTH_TOKEN! });

export const db = drizzle(client, { schema });
