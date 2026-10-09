import { createClient, type Client } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
	existsSync,
	mkdirSync,
	readFileSync,
	readdirSync,
	renameSync,
	rmSync,
	statSync,
	writeFileSync
} from 'node:fs';
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
const MIGRATIONS_DIR = join(process.cwd(), 'migrations');
const META_TABLE = '_test_meta';

function latestMtimeIn(dir: string): number {
	let latest = 0;
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) {
			latest = Math.max(latest, latestMtimeIn(path));
		} else {
			latest = Math.max(latest, statSync(path).mtimeMs);
		}
	}
	return latest;
}

/**
 * Produce the DDL for the current schema and cache it.
 *
 * The schema is built by running the real migration chain against a throwaway
 * database, exactly as staging and production are provisioned. This also
 * verifies the migrations are replayable from scratch.
 */
async function ensureSchemaStatements(): Promise<string[]> {
	const sourceMtime = Math.max(
		statSync(SCHEMA_SOURCE).mtimeMs,
		statSync(TYPES_SOURCE).mtimeMs,
		latestMtimeIn(MIGRATIONS_DIR)
	);

	const fresh = existsSync(SCHEMA_CACHE) && statSync(SCHEMA_CACHE).mtimeMs >= sourceMtime;
	if (fresh) {
		return JSON.parse(readFileSync(SCHEMA_CACHE, 'utf8')) as string[];
	}

	if (!existsSync(ARTIFACT_DIR)) {
		mkdirSync(ARTIFACT_DIR, { recursive: true });
	}

	const target = join(ARTIFACT_DIR, `migrate-${process.pid}.db`);
	if (existsSync(target)) {
		rmSync(target, { force: true });
	}

	execFileSync('pnpm', ['exec', 'drizzle-kit', 'migrate'], {
		cwd: process.cwd(),
		stdio: 'pipe',
		env: {
			...process.env,
			// Point drizzle.config.ts at the throwaway file so the real Turso
			// credentials are never touched.
			TURSO_DATABASE_URL: `file:${target}`,
			TURSO_AUTH_TOKEN: 'test'
		}
	});

	const client = createClient({ url: `file:${target}` });
	const ddlRows = await client.execute(
		"SELECT sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY rootpage"
	);
	client.close();

	const statements = ddlRows.rows.map((row) => String(row.sql));
	// Write atomically so parallel workers never read a partial cache.
	const tmpCache = `${SCHEMA_CACHE}.${process.pid}.tmp`;
	writeFileSync(tmpCache, JSON.stringify(statements));
	renameSync(tmpCache, SCHEMA_CACHE);
	rmSync(target, { force: true });

	return statements;
}

async function resetClient(client: Client): Promise<void> {
	await client.execute('PRAGMA foreign_keys = OFF');
	const tables = await client.execute(
		`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name != '${META_TABLE}'`
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

	// The shared test database file can outlive a schema change. Track a schema
	// version and rebuild the tables when it does not match the current
	// migrations, so tests never run against a stale schema.
	const version = createHash('sha1').update(JSON.stringify(statements)).digest('hex');

	const metaExists = await client.execute(
		`SELECT name FROM sqlite_master WHERE type = 'table' AND name = '${META_TABLE}'`
	);
	let currentVersion: string | null = null;
	if (metaExists.rows.length > 0) {
		const rows = await client.execute(`SELECT version FROM ${META_TABLE} LIMIT 1`);
		currentVersion = rows.rows[0]?.version ? String(rows.rows[0].version) : null;
	}

	if (currentVersion !== version) {
		await client.execute('PRAGMA foreign_keys = OFF');
		const tables = await client.execute(
			"SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
		);
		for (const row of tables.rows) {
			await client.execute(`DROP TABLE IF EXISTS "${String(row.name)}"`);
		}
		await client.execute('PRAGMA foreign_keys = ON');

		for (const statement of statements) {
			await client.execute(statement);
		}

		await client.execute(`CREATE TABLE IF NOT EXISTS ${META_TABLE} (version text not null)`);
		await client.execute(`DELETE FROM ${META_TABLE}`);
		await client.execute({
			sql: `INSERT INTO ${META_TABLE} (version) VALUES (?)`,
			args: [version]
		});
	}

	return {
		client,
		db,
		reset: () => resetClient(client),
		close: () => client.close()
	};
}
