// src/tests/db/schema.test.ts
import { describe, expect, it } from 'vitest';
import * as schema from '../../lib/server/db/schema';

describe('Database Schema', () => {
    it('has the correct user table structure', () => {
        // Verify user table exists with expected columns
        expect(schema.user).toBeDefined();
        expect(schema.user.id).toBeDefined();
        expect(schema.user.username).toBeDefined();
        expect(schema.user.email).toBeDefined();
        expect(schema.user.passwordHash).toBeDefined();
        expect(schema.user.age).toBeDefined();
        expect(schema.user.createdAt).toBeDefined();
    });

    it('has the correct habit table structure', () => {
        // Verify habit table exists with expected columns
        expect(schema.habit).toBeDefined();
        expect(schema.habit.id).toBeDefined();
        expect(schema.habit.userId).toBeDefined();
        expect(schema.habit.title).toBeDefined();
        expect(schema.habit.description).toBeDefined();
        expect(schema.habit.difficulty).toBeDefined();
        expect(schema.habit.baseExperience).toBeDefined();
        expect(schema.habit.isActive).toBeDefined();
        expect(schema.habit.isArchived).toBeDefined();
        expect(schema.habit.startDate).toBeDefined();
        expect(schema.habit.endDate).toBeDefined();
        expect(schema.habit.createdAt).toBeDefined();
        expect(schema.habit.updatedAt).toBeDefined();
    });

    it('has the correct habit streak table structure', () => {
        // Verify habit streak table exists with expected columns
        expect(schema.habitStreak).toBeDefined();
        expect(schema.habitStreak.id).toBeDefined();
        expect(schema.habitStreak.habitId).toBeDefined();
        expect(schema.habitStreak.userId).toBeDefined();
        expect(schema.habitStreak.currentStreak).toBeDefined();
        expect(schema.habitStreak.longestStreak).toBeDefined();
        expect(schema.habitStreak.lastCompletedAt).toBeDefined();
        expect(schema.habitStreak.createdAt).toBeDefined();
        expect(schema.habitStreak.updatedAt).toBeDefined();
    });

    it('has the correct habit completion table structure', () => {
        // Verify habit completion table exists with expected columns
        expect(schema.habitCompletion).toBeDefined();
        expect(schema.habitCompletion.id).toBeDefined();
        expect(schema.habitCompletion.habitId).toBeDefined();
        expect(schema.habitCompletion.userId).toBeDefined();
        expect(schema.habitCompletion.completedAt).toBeDefined();
        expect(schema.habitCompletion.value).toBeDefined();
        expect(schema.habitCompletion.experienceEarned).toBeDefined();
        expect(schema.habitCompletion.note).toBeDefined();
        expect(schema.habitCompletion.createdAt).toBeDefined();
    });

    it('has the correct habit category table structure', () => {
        // Verify habit category table structure
        expect(schema.habitCategory).toBeDefined();
        expect(schema.habitCategory.id).toBeDefined();
        expect(schema.habitCategory.userId).toBeDefined();
        expect(schema.habitCategory.name).toBeDefined();
        expect(schema.habitCategory.description).toBeDefined();
        expect(schema.habitCategory.isDefault).toBeDefined();
        expect(schema.habitCategory.createdAt).toBeDefined();
    });

    it('has the correct habit frequency table structure', () => {
        // Verify habit frequency table structure
        expect(schema.habitFrequency).toBeDefined();
        expect(schema.habitFrequency.id).toBeDefined();
        expect(schema.habitFrequency.name).toBeDefined();
        expect(schema.habitFrequency.days).toBeDefined();
        expect(schema.habitFrequency.everyX).toBeDefined();
        expect(schema.habitFrequency.createdAt).toBeDefined();
    });

    it('has the correct relationships between tables', () => {
        // Verify relationships between tables
        // Habit to User
        expect(schema.habit.userId).toBeDefined();
        
        // Habit to Category
        expect(schema.habit.categoryId).toBeDefined();
        
        // Habit to Frequency
        expect(schema.habit.frequencyId).toBeDefined();
        
        // Habit Streak to Habit
        expect(schema.habitStreak.habitId).toBeDefined();
        
        // Habit Completion to Habit
        expect(schema.habitCompletion.habitId).toBeDefined();
    });
});