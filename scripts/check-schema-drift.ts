import 'dotenv/config';
import { createClient } from '@libsql/client';

/**
 * Report schema drift between the code's expected columns and the configured
 * database (which, with the default .env, is production Turso).
 *
 * Read-only. Run with: pnpm exec tsx scripts/check-schema-drift.ts
 */

const EXPECTED: Record<string, string[]> = {
	user: ['is_admin', 'timezone'],
	creature_stats: ['level_stat_points_spent'],
	contacts: ['status', 'flagged'],
	user_waitlist: ['status', 'flagged']
};

const REQUIRED_INDEX = 'unique_habit_completion_day';

async function main() {
	const url = process.env.TURSO_DATABASE_URL || process.env.LOCAL_DATABASE_URL;
	if (!url) throw new Error('Set TURSO_DATABASE_URL or LOCAL_DATABASE_URL');
	const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });

	let drift = false;
	for (const [table, columns] of Object.entries(EXPECTED)) {
		const info = await client.execute(`PRAGMA table_info(${table})`);
		const present = info.rows.map((row) => String(row.name));
		const missing = columns.filter((column) => !present.includes(column));
		if (missing.length > 0) drift = true;
		console.log(`${table}: ${missing.length ? `MISSING ${missing.join(', ')}` : 'ok'}`);
	}

	const idx = await client.execute(
		`SELECT name FROM sqlite_master WHERE type = 'index' AND name = '${REQUIRED_INDEX}'`
	);
	if (idx.rows.length === 0) {
		drift = true;
		console.log(`${REQUIRED_INDEX}: MISSING`);
	} else {
		console.log(`${REQUIRED_INDEX}: ok`);
	}

	const dupes = await client.execute(
		'SELECT habit_id, completed_at, count() AS c FROM habit_completion GROUP BY habit_id, completed_at HAVING c > 1 LIMIT 5'
	);
	console.log(`duplicate (habit_id, completed_at) rows: ${dupes.rows.length}`);

	console.log(drift ? '\nDRIFT DETECTED' : '\nNo drift');
	client.close();
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
