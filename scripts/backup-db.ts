import 'dotenv/config';
import { createClient } from '@libsql/client';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Create a logical SQL backup (schema plus data) of the configured database.
 * Read-only against the source. Writes to .test-artifacts/backups/.
 *
 *   pnpm exec tsx scripts/backup-db.ts
 *
 * Restore with: turso db shell <db> < <file>   (or the SQLite CLI)
 */

function quote(value: unknown): string {
	if (value === null || value === undefined) return 'NULL';
	if (typeof value === 'number') return String(value);
	if (typeof value === 'bigint') return String(value);
	if (value instanceof ArrayBuffer) {
		return `X'${Buffer.from(value).toString('hex')}'`;
	}
	return `'${String(value).replace(/'/g, "''")}'`;
}

async function main() {
	const url = process.env.TURSO_DATABASE_URL || process.env.LOCAL_DATABASE_URL;
	if (!url) throw new Error('Set TURSO_DATABASE_URL or LOCAL_DATABASE_URL');
	const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });

	const objects = await client.execute(
		"SELECT type, name, sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY CASE type WHEN 'table' THEN 0 ELSE 1 END, name"
	);

	const lines: string[] = [`-- Backup of ${url}`, `-- ${new Date().toISOString()}`, 'PRAGMA foreign_keys=OFF;', 'BEGIN TRANSACTION;'];

	for (const row of objects.rows) {
		lines.push(`${String(row.sql)};`);
	}

	for (const row of objects.rows.filter((r) => String(r.type) === 'table')) {
		const table = String(row.name);
		const data = await client.execute(`SELECT * FROM "${table}"`);
		for (const record of data.rows) {
			const columns = Object.keys(record);
			const values = columns.map((column) => quote(record[column]));
			lines.push(`INSERT INTO "${table}" (${columns.map((c) => `"${c}"`).join(', ')}) VALUES (${values.join(', ')});`);
		}
	}

	lines.push('COMMIT;');

	const dir = join(process.cwd(), '.test-artifacts', 'backups');
	mkdirSync(dir, { recursive: true });
	const safeName = url.replace(/[^a-z0-9]+/gi, '_');
	const file = join(dir, `${safeName}-${Date.now()}.sql`);
	writeFileSync(file, lines.join('\n'));

	console.log(`Backup written: ${file}`);
	console.log(`Tables: ${objects.rows.filter((r) => String(r.type) === 'table').length}`);
	client.close();
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
