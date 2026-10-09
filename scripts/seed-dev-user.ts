import 'dotenv/config';
import { createClient } from '@libsql/client';
import { randomUUID } from 'node:crypto';
import { hashPassword } from '../src/lib/utils/password';

/**
 * Create or reset a verified local development account so you can log in on the
 * dev server without going through the email verification flow.
 *
 * Targets the local database by default (LOCAL_DATABASE_URL, or file:local.db),
 * never production.
 *
 *   pnpm run db:seed:dev-user
 *   pnpm exec tsx scripts/seed-dev-user.ts --email you@example.com --username you --password secret123
 */

function arg(name: string, fallback: string): string {
	const index = process.argv.indexOf(`--${name}`);
	if (index !== -1 && process.argv[index + 1]) return process.argv[index + 1];
	return fallback;
}

async function main() {
	const email = arg('email', 'dev@example.com').toLowerCase();
	const username = arg('username', 'devuser');
	const password = arg('password', 'password123');

	const url = process.env.LOCAL_DATABASE_URL || 'file:local.db';
	const client = createClient({ url });

	const existing = await client.execute({
		sql: 'SELECT id FROM user WHERE email = ? OR username = ? LIMIT 1',
		args: [email, username]
	});

	const passwordHash = await hashPassword(password);
	const now = new Date().toISOString();
	const userId = existing.rows[0]?.id ? String(existing.rows[0].id) : randomUUID();

	if (existing.rows.length > 0) {
		await client.execute({
			sql: 'UPDATE user SET email = ?, username = ?, password_hash = ?, email_verified = 1, email_verified_at = ? WHERE id = ?',
			args: [email, username, passwordHash, now, userId]
		});
		console.log(`Updated existing user ${username}`);
	} else {
		await client.execute({
			sql: 'INSERT INTO user (id, email, username, password_hash, created_at, email_verified, email_verified_at, is_admin) VALUES (?, ?, ?, ?, ?, 1, ?, 0)',
			args: [userId, email, username, passwordHash, now, now]
		});
		console.log(`Created user ${username}`);
	}

	const creature = await client.execute({
		sql: 'SELECT id FROM creature WHERE user_id = ? LIMIT 1',
		args: [userId]
	});

	if (creature.rows.length === 0) {
		const creatureId = randomUUID();
		await client.execute({
			sql: 'INSERT INTO creature (id, user_id, name, class, race, experience, level, created_at) VALUES (?, ?, ?, ?, ?, 0, 1, ?)',
			args: [creatureId, userId, 'Dev Creature', 'warrior', 'human', now]
		});
		await client.execute({
			sql: 'INSERT INTO creature_stats (id, creature_id, strength, dexterity, constitution, intelligence, wisdom, charisma, stat_boost_points, level_stat_points_spent, created_at, updated_at) VALUES (?, ?, 10, 10, 10, 10, 10, 10, 0, 0, ?, ?)',
			args: [randomUUID(), creatureId, now, now]
		});
		console.log('Created creature and stats');
	}

	const prefs = await client.execute({
		sql: 'SELECT id FROM user_preferences WHERE user_id = ? LIMIT 1',
		args: [userId]
	});
	if (prefs.rows.length === 0) {
		await client.execute({
			sql: 'INSERT INTO user_preferences (id, user_id, created_at, updated_at) VALUES (?, ?, ?, ?)',
			args: [randomUUID(), userId, now, now]
		});
		console.log('Created preferences');
	}

	console.log('\nDev login ready:');
	console.log(`  database: ${url}`);
	console.log(`  username: ${username}`);
	console.log(`  email:    ${email}`);
	console.log(`  password: ${password}`);
	client.close();
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
