import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const user = sqliteTable('user', {
	id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
	age: integer('age', { mode: 'number'}),
	username: text('username').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const session = sqliteTable('session', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id),
	expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull()
});


export const key = sqliteTable('user_key', {
	id: text('id').primaryKey(),
	userId: text('user_id').notNull().references(() => user.id),
	hashedPassword: text('hashed_password')
});

export type Session = typeof session.$inferSelect;

export type User = typeof user.$inferSelect;
