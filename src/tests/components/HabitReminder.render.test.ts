import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';

// External boundaries only: the notification manager and the toast provider.
const mocks = vi.hoisted(() => ({
	scheduleNotification: vi.fn(),
	clearNotification: vi.fn(),
	toastSuccess: vi.fn(),
	toastError: vi.fn()
}));

vi.mock('$lib/notifications/NotificationManager', () => ({
	notificationManager: {
		scheduleNotification: mocks.scheduleNotification,
		clearNotification: mocks.clearNotification
	}
}));

vi.mock('svelte-sonner', () => ({
	toast: {
		success: mocks.toastSuccess,
		error: mocks.toastError
	}
}));

import HabitReminder from '$lib/components/habits/HabitReminder.svelte';

const habitId = 'test-habit-123';
const habitTitle = 'Test Habit';

function timeInput(container: HTMLElement): HTMLInputElement {
	const input = container.querySelector('input[type="time"]');
	if (!input) throw new Error('time input not rendered');
	return input as HTMLInputElement;
}

describe('HabitReminder (rendered)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
	});

	it('schedules a reminder through the notification manager when a time is set', async () => {
		const { container } = render(HabitReminder, {
			props: { habitId, habitTitle }
		});

		await fireEvent.input(timeInput(container), { target: { value: '09:00' } });
		await fireEvent.click(screen.getByRole('button', { name: 'Set Reminder' }));

		expect(mocks.scheduleNotification).toHaveBeenCalledTimes(1);
		expect(mocks.scheduleNotification).toHaveBeenCalledWith(
			`habit-reminder-${habitId}`,
			`Time to complete your habit: ${habitTitle}`,
			'email',
			'Habit Reminder',
			expect.any(Number),
			'reminder'
		);
		expect(mocks.toastSuccess).toHaveBeenCalledWith('Reminder set for 09:00');

		expect(screen.getByText('Set for 09:00')).toBeInTheDocument();
		expect(mocks.clearNotification).not.toHaveBeenCalled();

		const saved = localStorage.getItem(`reminder_${habitId}`);
		expect(saved).not.toBeNull();
		expect(JSON.parse(saved as string)).toEqual({ time: '09:00', habitTitle });
	});

	it('shows an error and does not schedule when no time is selected', async () => {
		render(HabitReminder, { props: { habitId, habitTitle } });

		await fireEvent.click(screen.getByRole('button', { name: 'Set Reminder' }));

		expect(mocks.toastError).toHaveBeenCalledWith('Please select a time for the reminder');
		expect(mocks.scheduleNotification).not.toHaveBeenCalled();
		expect(mocks.toastSuccess).not.toHaveBeenCalled();
	});

	it('loads an existing reminder from localStorage and removes it on request', async () => {
		localStorage.setItem(
			`reminder_${habitId}`,
			JSON.stringify({ time: '08:30', habitTitle })
		);

		render(HabitReminder, { props: { habitId, habitTitle } });

		expect(screen.getByText('Set for 08:30')).toBeInTheDocument();

		await fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

		expect(mocks.clearNotification).toHaveBeenCalledWith(`habit-reminder-${habitId}`);
		expect(mocks.toastSuccess).toHaveBeenCalledWith('Reminder removed');
		expect(localStorage.getItem(`reminder_${habitId}`)).toBeNull();
		expect(screen.queryByText('Set for 08:30')).not.toBeInTheDocument();
	});
});
