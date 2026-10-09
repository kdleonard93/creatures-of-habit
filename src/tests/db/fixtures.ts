import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import * as schema from '$lib/server/db/schema';

export type TestDatabase = LibSQLDatabase<typeof schema>;

/** Insert a user with sane defaults. Every field can be overridden. */
export async function seedUser(
	db: TestDatabase,
	overrides: Partial<typeof schema.user.$inferInsert> = {}
) {
	const [row] = await db
		.insert(schema.user)
		.values({
			email: 'user@example.com',
			username: 'testuser',
			passwordHash: 'hashed-password',
			emailVerified: true,
			...overrides
		})
		.returning();
	return row;
}

/** Insert a creature for a user. */
export async function seedCreature(
	db: TestDatabase,
	userId: string,
	overrides: Partial<typeof schema.creature.$inferInsert> = {}
) {
	const [row] = await db
		.insert(schema.creature)
		.values({
			userId,
			name: 'Test Creature',
			class: 'warrior',
			race: 'human',
			experience: 0,
			level: 1,
			...overrides
		})
		.returning();
	return row;
}

/** Insert a habit for a user. */
export async function seedHabit(
	db: TestDatabase,
	userId: string,
	overrides: Partial<typeof schema.habit.$inferInsert> = {}
) {
	const [row] = await db
		.insert(schema.habit)
		.values({
			userId,
			title: 'Test Habit',
			difficulty: 'medium',
			startDate: '2026-01-01',
			...overrides
		})
		.returning();
	return row;
}
