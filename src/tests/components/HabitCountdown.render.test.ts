import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import HabitCountdown from '$lib/components/habits/HabitCountdown.svelte';

// Pin "now" locally so the countdown is deterministic regardless of the host
// timezone. The component parses the string date as local midnight, so using
// local Date constructors for both sides keeps the difference stable.
const NOW = new Date(2026, 5, 15, 12, 0, 0); // 2026-06-15 12:00 local

describe('HabitCountdown (rendered)', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('renders the countdown for a future YYYY-MM-DD date', () => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW);

		render(HabitCountdown, {
			props: { nextActiveDate: '2026-06-18', isActive: false }
		});

		expect(screen.getByText('Available in:')).toBeInTheDocument();
		expect(screen.getByText('2d 12h 0m')).toBeInTheDocument();
	});

	it('renders nothing while the habit is active', () => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW);

		render(HabitCountdown, {
			props: { nextActiveDate: '2026-06-18', isActive: true }
		});

		expect(screen.queryByText('Available in:')).not.toBeInTheDocument();
	});

	it('does not throw and still renders when nextActiveDate is a Date object', () => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW);

		render(HabitCountdown, {
			props: { nextActiveDate: new Date(2026, 5, 18, 15, 30, 0), isActive: false }
		});

		expect(screen.getByText('Available in:')).toBeInTheDocument();
		expect(screen.getByText('2d 12h 0m')).toBeInTheDocument();
	});

	it('does not throw and renders nothing when nextActiveDate is null', () => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW);

		expect(() =>
			render(HabitCountdown, {
				props: { nextActiveDate: null, isActive: false }
			})
		).not.toThrow();

		expect(screen.queryByText('Available in:')).not.toBeInTheDocument();
	});
});
