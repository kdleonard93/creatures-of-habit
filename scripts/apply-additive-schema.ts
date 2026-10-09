import 'dotenv/config';
import { createClient, type Client } from '@libsql/client';

/**
 * Apply the additive schema changes introduced by the audit to the configured
 * database. Additive only: it adds columns and one unique index. It never drops
 * or rewrites a table, so existing data is preserved.
 *
 * DANGER: with the default .env this targets PRODUCTION Turso. Snapshot the
 * database first (Turso point-in-time restore or `turso db dump`). Dry-run is
 * the default; pass --apply to execute.
 *
 *   pnpm exec tsx scripts/apply-additive-schema.ts            # dry run
 *   pnpm exec tsx scripts/apply-additive-schema.ts --apply    # execute
 */

interface ColumnPlan {
	table: string;
	column: string;
	definition: string;
}

const COLUMNS: ColumnPlan[] = [
	{ table: 'user', column: 'is_admin', definition: 'integer NOT NULL DEFAULT false' },
	{ table: 'user', column: 'timezone', definition: 'text' },
	{
		table: 'creature_stats',
		column: 'level_stat_points_spent',
		definition: 'integer NOT NULL DEFAULT 0'
	},
	{ table: 'contacts', column: 'status', definition: "text NOT NULL DEFAULT 'new'" },
	{ table: 'contacts', column: 'flagged', definition: 'integer NOT NULL DEFAULT false' },
	{ table: 'user_waitlist', column: 'status', definition: "text NOT NULL DEFAULT 'new'" },
	{ table: 'user_waitlist', column: 'flagged', definition: 'integer NOT NULL DEFAULT false' }
];

const UNIQUE_INDEX = {
	name: 'unique_habit_completion_day',
	table: 'habit_completion',
	columns: 'habit_id, completed_at'
};

async function hasColumn(client: Client, table: string, column: string): Promise<boolean> {
	const info = await client.execute(`PRAGMA table_info(${table})`);
	return info.rows.some((row) => String(row.name) === column);
}

async function hasIndex(client: Client, name: string): Promise<boolean> {
	const result = await client.execute(
		`SELECT name FROM sqlite_master WHERE type = 'index' AND name = '${name}'`
	);
	return result.rows.length > 0;
}

async function main() {
	const apply = process.argv.includes('--apply');
	const url = process.env.TURSO_DATABASE_URL || process.env.LOCAL_DATABASE_URL;
	if (!url) throw new Error('Set TURSO_DATABASE_URL or LOCAL_DATABASE_URL');
	const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });

	const statements: string[] = [];
	for (const plan of COLUMNS) {
		if (!(await hasColumn(client, plan.table, plan.column))) {
			statements.push(`ALTER TABLE ${plan.table} ADD COLUMN ${plan.column} ${plan.definition}`);
		}
	}
	if (!(await hasIndex(client, UNIQUE_INDEX.name))) {
		const dupes = await client.execute(
			`SELECT count() AS c FROM (SELECT 1 FROM ${UNIQUE_INDEX.table} GROUP BY ${UNIQUE_INDEX.columns} HAVING count() > 1 LIMIT 1)`
		);
		const duplicates = Number(dupes.rows[0]?.c ?? 0);
		if (duplicates > 0) {
			throw new Error(
				`Cannot create ${UNIQUE_INDEX.name}: duplicate rows exist in ${UNIQUE_INDEX.table}. Resolve them first.`
			);
		}
		statements.push(
			`CREATE UNIQUE INDEX ${UNIQUE_INDEX.name} ON ${UNIQUE_INDEX.table} (${UNIQUE_INDEX.columns})`
		);
	}

	if (statements.length === 0) {
		console.log('No changes needed; the database already matches.');
		client.close();
		return;
	}

	console.log(`Target: ${url}`);
	console.log(`${apply ? 'Applying' : 'Dry run (pass --apply to execute)'}:\n`);
	for (const statement of statements) console.log(`  ${statement}`);

	if (apply) {
		for (const statement of statements) {
			await client.execute(statement);
			console.log(`  applied: ${statement}`);
		}
		console.log('\nDone.');
	}

	client.close();
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
