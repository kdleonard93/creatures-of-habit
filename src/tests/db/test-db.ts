import { createClient, type Client } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as schema from '$lib/server/db/schema';

export interface TestDb {
	client: Client;
	db: LibSQLDatabase<typeof schema>;
	/** Delete all rows. Foreign keys are disabled around the deletes. */
	reset: () => Promise<void>;
	close: () => void;
}

const ARTIFACT_DIR = join(process.cwd(), '.test-artifacts');
const SCHEMA_CACHE = join(ARTIFACT_DIR, 'schema.json');
const SCHEMA_SOURCE = join(process.cwd(), 'src/lib/server/db/schema.ts');
const TYPES_SOURCE = join(process.cwd(), 'src/lib/types.ts');

/**
 * Produce the DDL for the current schema and cache it.
 *
 * The migration chain cannot be replayed from scratch: `0000` creates `user`
 * without `email` and `0001` selects `email` from it, and the journal tag
 * `0022_foamy_lord_hawal` has no matching file. Production was built with
 * `drizzle-kit push` against `schema.ts`, so we derive the test schema the same
 * way. See docs/audit-backlog.md D-1.
 */
async function ensureSchemaStatements(): Promise<string[]> {
	const fresh =
		existsSync(SCHEMA_CACHE) &&
		statSync(SCHEMA_CACHE).mtimeMs >= statSync(SCHEMA_SOURCE).mtimeMs &&
		statSync(SCHEMA_CACHE).mtimeMs >= statSync(TYPES_SOURCE).mtimeMs;

	if (fresh) {
		return JSON.parse(readFileSync(SCHEMA_CACHE, 'utf8')) as string[];
	}

	if (!existsSync(ARTIFACT_DIR)) {
		mkdirSync(ARTIFACT_DIR, { recursive: true });
	}

	const pushTarget = join(ARTIFACT_DIR, `push-${process.pid}.db`);
	if (existsSync(pushTarget)) {
		rmSync(pushTarget, { force: true });
	}

	execFileSync('pnpm', ['exec', 'drizzle-kit', 'push', '--force', '--verbose'], {
		cwd: process.cwd(),
		stdio: 'pipe',
		env: {
			...process.env,
			// Point drizzle.config.ts at the throwaway file so the real Turso
			// credentials are never touched.
			TURSO_DATABASE_URL: `file:${pushTarget}`,
			TURSO_AUTH_TOKEN: 'test'
		}
	});

	const pushClient = createClient({ url: `file:${pushTarget}` });
	const ddlRows = await pushClient.execute(
		"SELECT sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY rootpage"
	);
	pushClient.close();

	const statements = ddlRows.rows.map((row) => String(row.sql));
	writeFileSync(SCHEMA_CACHE, JSON.stringify(statements));
	rmSync(pushTarget, { force: true });

	return statements;
}

async function resetClient(client: Client): Promise<void> {
	await client.execute('PRAGMA foreign_keys = OFF');
	const tables = await client.execute(
		"SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
	);
	for (const row of tables.rows) {
		await client.execute(`DELETE FROM "${String(row.name)}"`);
	}
	await client.execute('PRAGMA foreign_keys = ON');
}

/**
 * Open the isolated test database that the application also uses.
 *
 * The test environment points `TURSO_DATABASE_URL` at a throwaway file (see
 * vite.config.ts and src/tests/setup.ts), so route handlers and this helper see
 * the same data. The real schema is applied once on first use. Call `reset()`
 * between tests.
 */
export async function createTestDb(): Promise<TestDb> {
	const url = process.env.TURSO_DATABASE_URL;
	if (!url || !url.startsWith('file:')) {
		throw new Error(
			'createTestDb requires TURSO_DATABASE_URL to be a file: URL. Check the test isolation guard in src/tests/setup.ts.'
		);
	}

	const statements = await ensureSchemaStatements();

	const client = createClient({ url });
	const db = drizzle(client, { schema });

	// Cascades and foreign keys must be enforced. See docs/audit-backlog.md D-5.
	await client.execute('PRAGMA foreign_keys = ON');

	const existing = await client.execute(
		"SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'user'"
	);
	if (existing.rows.length === 0) {
		for (const statement of statements) {
			await client.execute(statement);
		}
	}

	return {
		client,
		db,
		reset: () => resetClient(client),
		close: () => client.close()
	};
}
