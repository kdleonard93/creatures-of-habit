import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import StatBoostPanel from '$lib/components/quests/StatBoostPanel.svelte';

const baseStats = {
	strength: 10,
	dexterity: 12,
	constitution: 10,
	intelligence: 10,
	wisdom: 10,
	charisma: 10
};

const effectiveStats = {
	strength: 11,
	dexterity: 12,
	constitution: 10,
	intelligence: 10,
	wisdom: 10,
	charisma: 10
};

function makeStats(overrides: Record<string, unknown> = {}) {
	return {
		...effectiveStats,
		baseStats,
		statBoostPoints: 3,
		level: 10,
		levelStatPointsEarned: 2,
		levelStatPointsSpent: 0,
		availableLevelPoints: 2,
		...overrides
	};
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
	fetchMock = vi.fn();
	vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
	fetchMock.mockReset();
	vi.unstubAllGlobals();
});

function postCall() {
	return fetchMock.mock.calls.find(
		(call) => call[0] === '/api/character/boost-stat'
	);
}

describe('StatBoostPanel (rendered)', () => {
	it('renders both the quest boost pool and the level pool with the creature level', () => {
		render(StatBoostPanel, { props: { stats: makeStats() } });

		expect(screen.getByText(/Quest boost points: 3/)).toBeInTheDocument();
		expect(screen.getByText(/Level points \(level 10\): 2/)).toBeInTheDocument();
		// Both pools offer a spend control for the same stat.
		expect(
			screen.getByLabelText('Spend a quest boost point on Strength')
		).toBeInTheDocument();
		expect(
			screen.getByLabelText('Spend a level point on Strength')
		).toBeInTheDocument();
	});

	it('posts source "boost" when a quest boost point is spent', async () => {
		const onBoosted = vi.fn();
		fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });

		render(StatBoostPanel, { props: { stats: makeStats(), onBoosted } });

		await fireEvent.click(screen.getByLabelText('Spend a quest boost point on Strength'));

		await waitFor(() => expect(postCall()).toBeTruthy());

		const [, options] = postCall() as [string, { body: string }];
		expect(JSON.parse(options.body)).toEqual({
			stat: 'strength',
			points: 1,
			source: 'boost'
		});
		await waitFor(() => expect(onBoosted).toHaveBeenCalledTimes(1));
	});

	it('posts source "level" when a level point is spent', async () => {
		fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });

		render(StatBoostPanel, { props: { stats: makeStats() } });

		await fireEvent.click(screen.getByLabelText('Spend a level point on Dexterity'));

		await waitFor(() => expect(postCall()).toBeTruthy());

		const [, options] = postCall() as [string, { body: string }];
		expect(JSON.parse(options.body)).toEqual({
			stat: 'dexterity',
			points: 1,
			source: 'level'
		});
	});

	it('shows the server error message when a spend fails', async () => {
		fetchMock.mockResolvedValue({
			ok: false,
			json: async () => ({ error: 'Stat cannot exceed the maximum' })
		});

		render(StatBoostPanel, { props: { stats: makeStats() } });

		await fireEvent.click(screen.getByLabelText('Spend a quest boost point on Strength'));

		expect(await screen.findByRole('alert')).toHaveTextContent(
			'Stat cannot exceed the maximum'
		);
	});

	it('hides the level pool when no level points have been earned', () => {
		render(StatBoostPanel, {
			props: {
				stats: makeStats({
					levelStatPointsEarned: 0,
					levelStatPointsSpent: 0,
					availableLevelPoints: 0
				})
			}
		});

		expect(screen.queryByText(/Level points/)).not.toBeInTheDocument();
		expect(
			screen.queryByLabelText('Spend a level point on Strength')
		).not.toBeInTheDocument();
		// The quest boost pool is still usable.
		expect(
			screen.getByLabelText('Spend a quest boost point on Strength')
		).toBeInTheDocument();
	});

	it('disables a pool when it is empty and a stat when its base value is at the cap', () => {
		render(StatBoostPanel, {
			props: {
				stats: makeStats({
					statBoostPoints: 1,
					levelStatPointsEarned: 2,
					availableLevelPoints: 0,
					baseStats: { ...baseStats, strength: 15 }
				})
			}
		});

		// Strength is at the base cap, so neither pool may raise it.
		expect(screen.getByLabelText('Spend a quest boost point on Strength')).toBeDisabled();
		expect(screen.getByLabelText('Spend a level point on Strength')).toBeDisabled();
		// The level pool is empty, so level spends are disabled regardless of stat.
		expect(screen.getByLabelText('Spend a level point on Dexterity')).toBeDisabled();
		// The quest pool still has a point and Dexterity is below the cap.
		expect(screen.getByLabelText('Spend a quest boost point on Dexterity')).toBeEnabled();
	});

	it('enables the level spend on a stat below the base cap', () => {
		render(StatBoostPanel, { props: { stats: makeStats() } });

		expect(screen.getByLabelText('Spend a level point on Strength')).not.toBeDisabled();
		expect(screen.getByLabelText('Spend a level point on Dexterity')).not.toBeDisabled();
	});
});
