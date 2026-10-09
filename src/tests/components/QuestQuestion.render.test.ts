import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import QuestQuestion from '$lib/components/quests/QuestQuestion.svelte';

const userStats = {
	strength: 10,
	dexterity: 10,
	constitution: 10,
	intelligence: 10,
	wisdom: 10,
	charisma: 10
};

describe('QuestQuestion (rendered)', () => {
	it('renders the capitalized stat label when requiredStat is present', () => {
		render(QuestQuestion, {
			props: {
				question: {
					id: 'q1',
					questionText: 'A troll blocks the path. What do you do?',
					choiceA: 'Charge it',
					choiceB: 'Sneak around',
					requiredStat: 'strength',
					difficultyThreshold: 20,
					order: 1
				},
				userStats,
				questionNumber: 1,
				totalQuestions: 5,
				onAnswer: vi.fn()
			}
		});

		expect(screen.getByText('Question 1 of 5')).toBeInTheDocument();
		// "Strength" with a capital S only comes from the derived statLabel badge.
		expect(screen.getByText(/Strength/)).toBeInTheDocument();
		expect(
			screen.getByText(/Your strength: 10 \| Success chance: ~50%/)
		).toBeInTheDocument();
	});

	it('does not throw and falls back to Unknown when requiredStat is missing', () => {
		expect(() =>
			render(QuestQuestion, {
				props: {
					question: {
						id: 'q2',
						questionText: 'An odd riddle appears.',
						choiceA: 'Answer',
						choiceB: 'Ignore',
						difficultyThreshold: 20,
						order: 2
					},
					userStats,
					questionNumber: 2,
					totalQuestions: 5,
					onAnswer: vi.fn()
				}
			})
		).not.toThrow();

		expect(screen.getByText('Question 2 of 5')).toBeInTheDocument();
		expect(screen.getByText(/Unknown/)).toBeInTheDocument();
	});

	it('calls onAnswer with the chosen option', async () => {
		const onAnswer = vi.fn();
		render(QuestQuestion, {
			props: {
				question: {
					id: 'q3',
					questionText: 'Pick a door.',
					choiceA: 'Left door',
					choiceB: 'Right door',
					requiredStat: 'wisdom',
					difficultyThreshold: 15,
					order: 1
				},
				userStats,
				questionNumber: 1,
				totalQuestions: 5,
				onAnswer
			}
		});

		await fireEvent.click(screen.getByText('Left door'));

		expect(onAnswer).toHaveBeenCalledWith('A');
	});
});
