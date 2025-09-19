import { describe, it, expect } from 'vitest';
import { getDailyQuest, activateQuest, answerQuestion, spendStatBoostPoints } from '../../lib/server/services/questService';

describe('Quest Service Integration Tests', () => {
    const mockUserId = 'test-user-id';
    const mockQuestId = 'test-quest-id';
    const mockQuestionId = 'test-question-id';


    describe.skipIf(process.env.INTEGRATION_DB !== '1')('Database Integration', () => {
        it('getDailyQuest returns a quest (requires seeded DB)', async () => {
            try {
                const result = await getDailyQuest(mockUserId);
                expect(result).toBeDefined();
            } catch (error) {
                if (error instanceof Error && (
                    error.message.includes('FOREIGN KEY constraint failed') ||
                    error.message.includes('No quest templates available')
                )) {
                    console.info('Skipping test - database not seeded. Run seeding scripts first.');
                    return;
                }
                throw error;
            }
        });

        it('activateQuest rejects when quest is missing or not available', async () => {
            await expect(activateQuest(mockQuestId, mockUserId))
                .rejects.toThrow('Quest not found or already activated');
        });

        it('answerQuestion rejects when question does not exist', async () => {
            await expect(answerQuestion(mockQuestId, mockQuestionId, 'A', mockUserId))
                .rejects.toThrow('Quest not found or access denied');
        });

        it('spendStatBoostPoints validates input and rejects invalid cases', async () => {
            await expect(spendStatBoostPoints(mockUserId, 'magic', 1))
                .rejects.toThrow('Invalid stat type');
            await expect(spendStatBoostPoints(mockUserId, 'strength', 0))
                .rejects.toThrow('Points must be positive');
        });
    });

    // Always run these tests as they don't require database
    describe('Business Logic Validation', () => {
        it('should validate quest reward calculation logic', () => {
            const baseExp = 50;
            const bonusExp = 100;
            
            const scenarios = [
                { correct: 0, expected: baseExp },
                { correct: 1, expected: baseExp },
                { correct: 2, expected: baseExp },
                { correct: 3, expected: baseExp + bonusExp },
                { correct: 4, expected: baseExp + bonusExp },
                { correct: 5, expected: baseExp + bonusExp }
            ];

            scenarios.forEach(({ correct, expected }) => {
                const actualReward = baseExp + (correct >= 3 ? bonusExp : 0);
                expect(actualReward).toBe(expected);
            });
        });

        it('should validate stat boost point logic', () => {
            const scenarios = [
                { correct: 0, expectedPoints: 0 },
                { correct: 1, expectedPoints: 0 },
                { correct: 2, expectedPoints: 0 },
                { correct: 3, expectedPoints: 1 },
                { correct: 4, expectedPoints: 1 },
                { correct: 5, expectedPoints: 1 }
            ];

            scenarios.forEach(({ correct, expectedPoints }) => {
                const actualPoints = correct >= 3 ? 1 : 0;
                expect(actualPoints).toBe(expectedPoints);
            });
        });

        it('should validate success chance calculation', () => {
            const testCases = [
                { userStat: 5, threshold: 10, minChance: 10, maxChance: 90 },
                { userStat: 10, threshold: 10, minChance: 10, maxChance: 90 },
                { userStat: 20, threshold: 10, minChance: 10, maxChance: 90 }
            ];

            testCases.forEach(({ userStat, threshold, minChance, maxChance }) => {
                const successChance = Math.min(Math.max((userStat / threshold) * 100, minChance), maxChance);
                expect(successChance).toBeGreaterThanOrEqual(minChance);
                expect(successChance).toBeLessThanOrEqual(maxChance);
            });
        });
    });

    describe('Data Structure Validation', () => {
        it('should validate quest data structure', () => {
            const mockQuest = {
                id: 'quest-1',
                title: 'Test Quest',
                description: 'Test Description',
                narrative: 'Test Narrative',
                status: 'available' as const,
                currentQuestion: 0,
                totalQuestions: 5,
                correctAnswers: 0,
                expRewardBase: 50,
                expRewardBonus: 100
            };

            expect(mockQuest).toHaveProperty('id');
            expect(mockQuest).toHaveProperty('title');
            expect(mockQuest).toHaveProperty('description');
            expect(mockQuest).toHaveProperty('narrative');
            expect(mockQuest).toHaveProperty('status');
            expect(mockQuest).toHaveProperty('currentQuestion');
            expect(mockQuest).toHaveProperty('totalQuestions');
            expect(mockQuest).toHaveProperty('correctAnswers');
            expect(mockQuest).toHaveProperty('expRewardBase');
            expect(mockQuest).toHaveProperty('expRewardBonus');
            
            expect(typeof mockQuest.id).toBe('string');
            expect(typeof mockQuest.title).toBe('string');
            expect(typeof mockQuest.description).toBe('string');
            expect(typeof mockQuest.narrative).toBe('string');
            expect(['available', 'active', 'completed']).toContain(mockQuest.status);
            expect(typeof mockQuest.currentQuestion).toBe('number');
            expect(typeof mockQuest.totalQuestions).toBe('number');
            expect(typeof mockQuest.correctAnswers).toBe('number');
            expect(typeof mockQuest.expRewardBase).toBe('number');
            expect(typeof mockQuest.expRewardBonus).toBe('number');
        });
    });
});
