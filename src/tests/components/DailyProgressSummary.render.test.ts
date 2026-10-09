import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import DailyProgressSummary from '$lib/components/dashboard/DailyProgressSummary.svelte';

function makeData(total: number, completed: number, percentage: number) {
	return {
		habits: [],
		progressStats: { total, completed, percentage }
	};
}

describe('DailyProgressSummary (rendered)', () => {
	it('renders the completion percentage and completed/total counts from props', () => {
		render(DailyProgressSummary, {
			props: { data: makeData(3, 2, 67) }
		});

		expect(screen.getByText("Today's Progress")).toBeInTheDocument();
		expect(screen.getByLabelText('Completion percentage')).toHaveTextContent('67%');
		expect(screen.getByLabelText('Habits completed')).toHaveTextContent('(2/3)');
	});

	it('renders 100 percent when every habit is complete', () => {
		render(DailyProgressSummary, {
			props: { data: makeData(4, 4, 100) }
		});

		expect(screen.getByLabelText('Completion percentage')).toHaveTextContent('100%');
		expect(screen.getByLabelText('Habits completed')).toHaveTextContent('(4/4)');
	});

	it('renders zero when there are no habits', () => {
		render(DailyProgressSummary, {
			props: { data: makeData(0, 0, 0) }
		});

		expect(screen.getByLabelText('Completion percentage')).toHaveTextContent('0%');
		expect(screen.getByLabelText('Habits completed')).toHaveTextContent('(0/0)');
	});
});
