import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { CreatureClass, CreatureRace } from '../../types';

export const user = sqliteTable('user', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    age: integer('age', { mode: 'number' }),
    email: text('email').notNull().unique(),
    username: text('username').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const creature = sqliteTable('creature', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
        .notNull()
        .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    class: text('class', { enum: Object.values(CreatureClass) as [string, ...string[]] }).notNull(),
    race: text('race', { enum: Object.values(CreatureRace) as [string, ...string[]] }).notNull(),
    level: integer('level', { mode: 'number' }).default(1),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const creatureStats = sqliteTable('creature_stats', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    creatureId: text('creature_id')
        .notNull()
        .references(() => creature.id, { onDelete: 'cascade' }),
    strength: integer('strength').notNull().default(10),
    dexterity: integer('dexterity').notNull().default(10),
    constitution: integer('constitution').notNull().default(10),
    intelligence: integer('intelligence').notNull().default(10),
    wisdom: integer('wisdom').notNull().default(10),
    charisma: integer('charisma').notNull().default(10),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const creatureEquipment = sqliteTable('creature_equipment', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    creatureId: text('creature_id')
        .notNull()
        .references(() => creature.id, { onDelete: 'cascade' }),
    slot: text('slot').notNull(), // 'weapon', 'armor', etc.
    itemId: text('item_id').notNull(),
    equipped: integer('equipped').notNull().default(1),
});

export const session = sqliteTable('session', {
    id: text('id').primaryKey(),
    userId: text('user_id')
        .notNull()
        .references(() => user.id, { onDelete: 'cascade' }),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull()
});

export const key = sqliteTable('user_key', {
    id: text('id').primaryKey(),
    userId: text('user_id')
        .notNull()
        .references(() => user.id, { onDelete: 'cascade' }),
    hashedPassword: text('hashed_password')
});

export const userPreferences = sqliteTable('user_preferences', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
        .notNull()
        .unique()
        .references(() => user.id, { onDelete: 'cascade' }),
    
    // Notification preferences
    emailNotifications: integer('email_notifications').notNull().default(1),
    pushNotifications: integer('push_notifications').notNull().default(1),
    reminderNotifications: integer('reminder_notifications').notNull().default(1),
    
    // Privacy settings
    profileVisibility: integer('profile_visibility').notNull().default(0),
    activitySharing: integer('activity_sharing').notNull().default(0),
    statsSharing: integer('stats_sharing').notNull().default(0),
    
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Type inference helpers
export type User = typeof user.$inferSelect;
export type Session = typeof session.$inferSelect;
export type UserPreferences = typeof userPreferences.$inferSelect;