import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';
const localUrl = process.env.LOCAL_DATABASE_URL;
const tursoUrl = process.env.TURSO_DATABASE_URL;
const useLocal = localUrl?.startsWith('file:') ?? false;

const url = useLocal ? (localUrl as string) : (tursoUrl as string);
const authToken = useLocal ? undefined : process.env.TURSO_AUTH_TOKEN;

if (!url) {
  throw new Error(
    'No database URL configured. Set LOCAL_DATABASE_URL (file:...) for local dev or TURSO_DATABASE_URL for remote.'
  );
}
if (!useLocal && !authToken) {
  throw new Error('TURSO_AUTH_TOKEN is not set');
}

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	dbCredentials: useLocal ? { url } : { url, authToken: authToken as string },
	verbose: true,
	strict: true,
	out: './migrations',
	dialect: 'turso',
});
console.info('Drizzle target URL:', url);