import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { CreatureClass, CreatureRace } from '../../types';

export const user = sqliteTable('user', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	age: integer('age', { mode: 'number'}),
	email: text('email').notNull().unique(),
	username: text('username').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const creature = sqliteTable('creature', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	userId: text('user_id').notNull(),
	name: text('name').notNull(),
	class: text('class', { enum: Object.values(CreatureClass) as [string, ...string[]] }).notNull(),
	race: text('race', { enum: Object.values(CreatureRace) as [string, ...string[]] }).notNull(),
	level: integer('level', {mode: 'number'}).default(1),
	createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
})

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
