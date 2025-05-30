import { relations, sql } from 'drizzle-orm';
import { integer, sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
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
    experience: integer('experience', { mode: 'number' }).notNull().default(0),
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

export const habitFrequency = sqliteTable('habit_frequency', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text('name', { enum: ['daily', 'weekly', 'custom'] }).notNull(),
    days: text('days'),
    everyX: integer('every_x'), 
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const habitCategory = sqliteTable('habit_category', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
        .notNull()
        .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(), // e.g., 'health', 'productivity'
    description: text('description'),
    isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Main habits table
export const habit = sqliteTable('habit', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
        .notNull()
        .references(() => user.id, { onDelete: 'cascade' }),
    categoryId: text('category_id')
        .references(() => habitCategory.id),
    title: text('title').notNull(),
    description: text('description'),
    frequencyId: text('frequency_id')
        .references(() => habitFrequency.id),
    difficulty: text('difficulty', { 
        enum: ['easy', 'medium', 'hard'] 
    }).notNull().default('medium'),
    baseExperience: integer('base_experience').notNull().default(10),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
    startDate: text('start_date').notNull(),
    endDate: text('end_date'), 
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Habit completion tracking
export const habitCompletion = sqliteTable('habit_completion', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    habitId: text('habit_id')
        .notNull()
        .references(() => habit.id, { onDelete: 'cascade' }),
    userId: text('user_id')
        .notNull()
        .references(() => user.id, { onDelete: 'cascade' }),
    completedAt: text('completed_at').notNull(),
    value: integer('value').notNull().default(1), // For partial completions (0-100)
    experienceEarned: integer('experience_earned').notNull(),
    note: text('note'),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Streak tracking
export const habitStreak = sqliteTable('habit_streak', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    habitId: text('habit_id')
        .notNull()
        .references(() => habit.id, { onDelete: 'cascade' }),
    userId: text('user_id')
        .notNull()
        .references(() => user.id, { onDelete: 'cascade' }),
    currentStreak: integer('current_streak').notNull().default(0),
    longestStreak: integer('longest_streak').notNull().default(0),
    lastCompletedAt: text('last_completed_at'),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
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

export const contacts = sqliteTable('contacts', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text('name').notNull(),
    email: text('email').notNull(),
    message: text('message').notNull(),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Daily habit tracker for progress bar
export const dailyHabitTracker = sqliteTable('daily_habit_tracker', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
        .notNull()
        .references(() => user.id, { onDelete: 'cascade' }),
    habitId: text('habit_id')
        .notNull()
        .references(() => habit.id, { onDelete: 'cascade' }),
    date: text('date').notNull(), // YYYY-MM-DD format
    completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => {
    return {
        // Index for querying by user and date (most common query pattern)
        userDateIdx: index('idx_daily_tracker_user_date').on(table.userId, table.date),
        // Index for querying by habit ID
        habitIdx: index('idx_daily_tracker_habit').on(table.habitId),
        // Index for date-based queries (like cleanup)
        dateIdx: index('idx_daily_tracker_date').on(table.date),
        // Composite index for the common query pattern in markHabitCompleted
        userHabitDateIdx: index('idx_daily_tracker_user_habit_date').on(
            table.userId,
            table.habitId,
            table.date
        ),
    };
});

// Type inference helpers
export type User = typeof user.$inferSelect;
export type Session = typeof session.$inferSelect;
export type UserPreferences = typeof userPreferences.$inferSelect;
export type DailyHabitTracker = typeof dailyHabitTracker.$inferSelect;