#!/usr/bin/env tsx

/**
 * Promote or demote an admin account.
 *
 * Usage:
 *   pnpm tsx scripts/promote-admin.ts <email>            # grant admin
 *   pnpm tsx scripts/promote-admin.ts <email> --demote   # revoke admin
 *
 * Reads the database connection from the environment (TURSO_DATABASE_URL, or
 * LOCAL_DATABASE_URL for a local file) so no secret is ever hardcoded.
 */

import 'dotenv/config';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { eq } from 'drizzle-orm';
import * as schema from '../src/lib/server/db/schema';

const args = process.argv.slice(2);
const demote = args.includes('--demote');
const email = args.find((arg) => !arg.startsWith('--'));

if (!email) {
	console.error('Usage: pnpm tsx scripts/promote-admin.ts <email> [--demote]');
	process.exit(1);
}

const dbUrl = process.env.TURSO_DATABASE_URL || process.env.LOCAL_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!dbUrl) {
	console.error('Missing database configuration. Set TURSO_DATABASE_URL or LOCAL_DATABASE_URL.');
	process.exit(1);
}

const client = createClient({ url: dbUrl, ...(authToken ? { authToken } : {}) });
const db = drizzle(client, { schema });

const normalizedEmail = email.trim().toLowerCase();
const isAdmin = !demote;

try {
	const updated = await db
		.update(schema.user)
		.set({ isAdmin })
		.where(eq(schema.user.email, normalizedEmail))
		.returning({ id: schema.user.id, email: schema.user.email, isAdmin: schema.user.isAdmin });

	if (updated.length === 0) {
		console.error(`No user found with email ${normalizedEmail}.`);
		process.exitCode = 1;
	} else {
		const user = updated[0];
		console.log(
			`${isAdmin ? 'Promoted' : 'Demoted'} ${user.email} (id ${user.id}); isAdmin is now ${user.isAdmin}.`
		);
	}
} catch (error) {
	console.error(
		'Failed to update the admin flag:',
		error instanceof Error ? error.message : error
	);
	process.exitCode = 1;
} finally {
	client.close();
}
