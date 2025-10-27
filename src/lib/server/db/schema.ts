import { relations, sql } from 'drizzle-orm';
import { integer, sqliteTable, text, index, unique } from 'drizzle-orm/sqlite-core';
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
        .unique()
        .references(() => creature.id, { onDelete: 'cascade' }),
    strength: integer('strength').notNull().default(10),
    dexterity: integer('dexterity').notNull().default(10),
    constitution: integer('constitution').notNull().default(10),
    intelligence: integer('intelligence').notNull().default(10),
    wisdom: integer('wisdom').notNull().default(10),
    charisma: integer('charisma').notNull().default(10),
    statBoostPoints: integer('stat_boost_points').notNull().default(0),
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

// Quest System Tables
export const questTemplates = sqliteTable('quest_templates', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    title: text('title').notNull(),
    description: text('description').notNull(),
    setting: text('setting').notNull(), // 'forest', 'dungeon', 'city', etc.
    difficulty: text('difficulty', { 
        enum: ['easy', 'medium', 'hard'] 
    }).notNull(),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const questInstances = sqliteTable('quest_instances', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
        .notNull()
        .references(() => user.id, { onDelete: 'cascade' }),
    templateId: text('template_id')
        .references(() => questTemplates.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description').notNull(),
    narrative: text('narrative').notNull(), // Generated story text
    status: text('status', { 
        enum: ['available', 'active', 'completed'] 
    }).notNull().default('available'),
    currentQuestion: integer('current_question').notNull().default(0),
    correctAnswers: integer('correct_answers').notNull().default(0),
    statChecksPassed: integer('stat_checks_passed').notNull().default(0),
    totalQuestions: integer('total_questions').notNull().default(5),
    expRewardBase: integer('exp_reward_base').notNull().default(50),
    expRewardBonus: integer('exp_reward_bonus').notNull().default(100),
    activatedAt: text('activated_at'),
    completedAt: text('completed_at'),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => {
    return {
        userStatusIdx: index('idx_quest_instances_user_status').on(table.userId, table.status),
        userCreatedIdx: index('idx_quest_instances_user_created').on(table.userId, table.createdAt),
    };
});

export const questQuestions = sqliteTable('quest_questions', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    questInstanceId: text('quest_instance_id')
        .notNull()
        .references(() => questInstances.id, { onDelete: 'cascade' }),
    questionNumber: integer('question_number').notNull(),
    questionText: text('question_text').notNull(),
    choiceA: text('choice_a').notNull(),
    choiceB: text('choice_b').notNull(),
    correctChoice: text('correct_choice', { 
        enum: ['A', 'B'] 
    }).notNull(),
    requiredStat: text('required_stat', {
        enum: ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']
    }).notNull(),
    difficultyThreshold: integer('difficulty_threshold').notNull(),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => {
    return {
        questQuestionIdx: index('idx_quest_questions_instance').on(table.questInstanceId, table.questionNumber),
    };
});

export const questAnswers = sqliteTable('quest_answers', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    questInstanceId: text('quest_instance_id')
        .notNull()
        .references(() => questInstances.id, { onDelete: 'cascade' }),
    questionId: text('question_id')
        .notNull()
        .references(() => questQuestions.id, { onDelete: 'cascade' }),
    userChoice: text('user_choice', { 
        enum: ['A', 'B'] 
    }).notNull(),
    wasCorrect: integer('was_correct', { mode: 'boolean' }).notNull(),
    passedStatCheck: integer('passed_stat_check', { mode: 'boolean'}).notNull().default(false),
    answeredAt: text('answered_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => {
    return {
        questAnswerIdx: index('idx_quest_answers_instance').on(table.questInstanceId),
        uniqueQuestionAnswer: unique('unique_question_answer').on(table.questInstanceId, table.questionId),
    };
});

export const session = sqliteTable('session', {
    id: text('id').primaryKey(),
    userId: text('user_id')
        .notNull()
        .references(() => user.id, { onDelete: 'cascade' }),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull()
});

export const passwordResetToken = sqliteTable('password_reset_token', {
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
    inAppNotifications: integer('in_app_notifications').notNull().default(1),
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
        userDateIdx: index('idx_daily_tracker_user_date').on(table.userId, table.date),
        habitIdx: index('idx_daily_tracker_habit').on(table.habitId),
        dateIdx: index('idx_daily_tracker_date').on(table.date),
        userHabitDateIdx: index('idx_daily_tracker_user_habit_date').on(
            table.userId,
            table.habitId,
            table.date
        ),
        uniqueUserHabitDate: unique('unique_user_habit_date').on(
            table.userId,
            table.habitId,
            table.date
        ),
    };
});

export const userWaitlist = sqliteTable('user_waitlist', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    email: text('email').notNull().unique(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    referralSource: text('referral_source'),
    subscribedAt: text('subscribed_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => {
    return {
        subscribedAtIdx: index('idx_user_waitlist_subscribed_at').on(table.subscribedAt),
        referralSourceIdx: index('idx_user_waitlist_referral_source').on(table.referralSource),
    };
});

// Type inference helpers
export type User = typeof user.$inferSelect;
export type Session = typeof session.$inferSelect;
export type UserPreferences = typeof userPreferences.$inferSelect;
export type DailyHabitTracker = typeof dailyHabitTracker.$inferSelect;
export type UserWaitlist = typeof userWaitlist.$inferSelect;