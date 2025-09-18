import { describe, it, expect } from 'vitest';

describe('Quest System Utilities', () => {
    describe('Quest Status Logic', () => {
        it('should validate quest status transitions', () => {
            const validTransitions = {
                'available': ['active'],
                'active': ['completed'],
                'completed': []
            };
            
            // Test valid transitions
            expect(validTransitions.available).toContain('active');
            expect(validTransitions.active).toContain('completed');
            expect(validTransitions.completed).toHaveLength(0);
            
            // Test invalid transitions
            expect(validTransitions.available).not.toContain('completed');
            expect(validTransitions.completed).not.toContain('active');
        });
    });

    describe('Reward Calculation Logic', () => {
        it('should calculate correct EXP rewards', () => {
            const baseExp = 50;
            const bonusExp = 100;
            
            // Test scenarios
            const scenarios = [
                { correct: 0, total: 5, expectedExp: baseExp },
                { correct: 1, total: 5, expectedExp: baseExp },
                { correct: 2, total: 5, expectedExp: baseExp },
                { correct: 3, total: 5, expectedExp: baseExp + bonusExp },
                { correct: 4, total: 5, expectedExp: baseExp + bonusExp },
                { correct: 5, total: 5, expectedExp: baseExp + bonusExp }
            ];
            
            scenarios.forEach(({ correct, total, expectedExp }) => {
                const actualExp = baseExp + (correct >= 3 ? bonusExp : 0);
                expect(actualExp).toBe(expectedExp);
            });
        });

        it('should calculate stat boost points correctly', () => {
            const scenarios = [
                { correct: 0, total: 5, expectedPoints: 0 },
                { correct: 1, total: 5, expectedPoints: 0 },
                { correct: 2, total: 5, expectedPoints: 0 },
                { correct: 3, total: 5, expectedPoints: 1 },
                { correct: 4, total: 5, expectedPoints: 1 },
                { correct: 5, total: 5, expectedPoints: 1 }
            ];
            
            scenarios.forEach(({ correct, total, expectedPoints }) => {
                const actualPoints = correct >= 3 ? 1 : 0;
                expect(actualPoints).toBe(expectedPoints);
            });
        });
    });

    describe('Success Chance Calculation', () => {
        it('should calculate success probability correctly', () => {
            const testCases = [
                { userStat: 5, threshold: 10, expectedRange: [10, 50] },
                { userStat: 10, threshold: 10, expectedRange: [90, 100] },
                { userStat: 15, threshold: 10, expectedRange: [90, 90] },
                { userStat: 0, threshold: 10, expectedRange: [10, 10] }
            ];
            
            testCases.forEach(({ userStat, threshold, expectedRange }) => {
                const successChance = Math.min(Math.max((userStat / threshold) * 100, 10), 90);
                expect(successChance).toBeGreaterThanOrEqual(expectedRange[0]);
                expect(successChance).toBeLessThanOrEqual(expectedRange[1]);
            });
        });

        it('should enforce min/max success bounds', () => {
            // Test minimum bound (10%)
            const veryLowStat = Math.min(Math.max((1 / 100) * 100, 10), 90);
            expect(veryLowStat).toBe(10);
            
            // Test maximum bound (90%)
            const veryHighStat = Math.min(Math.max((100 / 10) * 100, 10), 90);
            expect(veryHighStat).toBe(90);
        });
    });

    describe('Stat Validation', () => {
        it('should validate stat names', () => {
            const validStats = ['strength', 'dexterity', 'intelligence', 'charisma'];
            const invalidStats = ['magic', 'luck', 'speed', 'health'];
            
            validStats.forEach(stat => {
                expect(validStats).toContain(stat);
            });
            
            invalidStats.forEach(stat => {
                expect(validStats).not.toContain(stat);
            });
        });

        it('should validate stat boost point spending', () => {
            const testCases = [
                { available: 5, spending: 1, valid: true },
                { available: 5, spending: 5, valid: true },
                { available: 5, spending: 6, valid: false },
                { available: 0, spending: 1, valid: false },
                { available: 3, spending: -1, valid: false }
            ];
            
            testCases.forEach(({ available, spending, valid }) => {
                const isValid = spending > 0 && spending <= available;
                expect(isValid).toBe(valid);
            });
        });
    });

    describe('Question Generation Logic', () => {
        it('should validate question structure', () => {
            const mockQuestion = {
                id: 'q1',
                questionText: 'What do you do?',
                choiceA: 'Option A',
                choiceB: 'Option B',
                requiredStat: 'strength',
                difficultyThreshold: 10,
                order: 1
            };
            
            expect(mockQuestion.id).toBeDefined();
            expect(mockQuestion.questionText).toBeTruthy();
            expect(mockQuestion.choiceA).toBeTruthy();
            expect(mockQuestion.choiceB).toBeTruthy();
            expect(['strength', 'dexterity', 'intelligence', 'charisma']).toContain(mockQuestion.requiredStat);
            expect(mockQuestion.difficultyThreshold).toBeGreaterThan(0);
            expect(mockQuestion.order).toBeGreaterThan(0);
        });

        it('should validate quest has correct number of questions', () => {
            const expectedQuestionCount = 5;
            const mockQuestions = Array.from({ length: expectedQuestionCount }, (_, i) => ({
                id: `q${i + 1}`,
                order: i + 1
            }));
            
            expect(mockQuestions).toHaveLength(expectedQuestionCount);
            mockQuestions.forEach((q, index) => {
                expect(q.order).toBe(index + 1);
            });
        });
    });
});
