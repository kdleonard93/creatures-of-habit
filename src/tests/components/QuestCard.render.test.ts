import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import QuestCard from '$lib/components/quests/QuestCard.svelte';

const baseQuest = {
	id: 'quest-1',
	title: 'The Cave of Echoes',
	description: 'A test quest description',
	narrative: 'Once upon a time...',
	status: 'available' as const,
	currentQuestion: 0,
	totalQuestions: 5,
	correctAnswers: 0,
	expRewardBase: 50,
	expRewardBonus: 100
};

describe('QuestCard (rendered)', () => {
	it('renders the title, description, narrative, and difficulty badge', () => {
		render(QuestCard, { props: { quest: baseQuest } });

		expect(screen.getByText('The Cave of Echoes')).toBeInTheDocument();
		expect(screen.getByText('A test quest description')).toBeInTheDocument();
		expect(screen.getByText('Once upon a time...')).toBeInTheDocument();
		// expRewardBase 50 maps to Medium in the component.
		expect(screen.getByText('Medium')).toBeInTheDocument();
	});

	it('renders the progress and correct-answer count for an active quest', () => {
		render(QuestCard, {
			props: {
				quest: { ...baseQuest, status: 'active' as const, currentQuestion: 2, correctAnswers: 1 }
			}
		});

		expect(screen.getByText('Progress')).toBeInTheDocument();
		expect(screen.getByText('2/5')).toBeInTheDocument();
		expect(screen.getByText('Correct answers: 1')).toBeInTheDocument();
	});

	it('maps reward values to Easy, Medium, and Hard badges', () => {
		const easy = render(QuestCard, { props: { quest: { ...baseQuest, expRewardBase: 25 } } });
		expect(easy.container.textContent).toContain('Easy');
		easy.unmount();

		const hard = render(QuestCard, { props: { quest: { ...baseQuest, expRewardBase: 75 } } });
		expect(hard.container.textContent).toContain('Hard');
	});

	it('calls onActivate when starting an available quest', async () => {
		const onActivate = vi.fn();
		render(QuestCard, { props: { quest: baseQuest, onActivate } });

		await fireEvent.click(screen.getByText('Start Quest'));

		expect(onActivate).toHaveBeenCalledTimes(1);
	});
});
