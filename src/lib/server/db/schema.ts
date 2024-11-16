import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { v4 as uuidv4 } from 'uuid';

const userId = uuidv4();
const creatureId = uuidv4();

export const user = sqliteTable('user', {
	id: text('id').primaryKey().default(userId),
	age: integer('age', { mode: 'number'}),
	email: text('email').notNull().unique(),
	username: text('username').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const creature = sqliteTable('creature', {
	id: text('id').primaryKey().default(creatureId),
	userId: text('user_id').notNull(),
	name: text('name').notNull(),
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
