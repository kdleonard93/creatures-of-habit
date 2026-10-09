<script lang="ts">
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "$lib/components/ui/card";
	import { Button } from "$lib/components/ui/button";
	import { Badge } from "$lib/components/ui/badge";
	import { getSvg } from '$lib/utils/icons';
	import { STAT_MAX } from '$lib/shared/stats';
	import type { CreatureStats } from "$lib/types";

	/**
	 * Response shape of `GET /api/character/stat-boost-points`. Effective stats
	 * (race, class, and equipment applied) live at the top level. `baseStats`
	 * are the stored values the server caps at `STAT_MAX` (15).
	 */
	interface UserStatsWithPoints extends CreatureStats {
		statBoostPoints: number;
		baseStats?: CreatureStats;
		level?: number;
		levelStatPointsEarned?: number;
		levelStatPointsSpent?: number;
		availableLevelPoints?: number;
	}

	type StatPointSource = 'boost' | 'level';

	const strengthIcon = getSvg('muscle-up');
	const dexterityIcon = getSvg('bullseye');
	const constitutionIcon = getSvg('hearts');
	const intelligenceIcon = getSvg('materials-science');
	const wisdomIcon = getSvg('brain');
	const charismaIcon = getSvg('three-friends');

	const {
		stats,
		onBoosted
	} = $props<{
		stats: UserStatsWithPoints;
		/** Called after a successful spend so the parent can reload the pools. */
		onBoosted?: () => void | Promise<void>;
	}>();

	const statInfo = [
		{
			key: 'strength',
			name: 'Strength',
			icon: strengthIcon,
			description: 'Physical power and endurance',
			color: 'bg-red-100 text-red-800'
		},
		{
			key: 'dexterity',
			name: 'Dexterity',
			icon: dexterityIcon,
			description: 'Agility and quick reflexes',
			color: 'bg-green-100 text-green-800'
		},
		{
			key: 'constitution',
			name: 'Constitution',
			icon:  constitutionIcon,
			description: 'Health and stamina',
			color: 'bg-orange-100 text-orange-800'
		},
		{
			key: 'intelligence',
			name: 'Intelligence',
			icon: intelligenceIcon,
			description: 'Knowledge and problem-solving',
			color: 'bg-blue-100 text-blue-800'
		},
		{
			key: 'wisdom',
			name: 'Wisdom',
			icon: wisdomIcon,
			description: 'Intuition and insight',
			color: 'bg-yellow-100 text-yellow-800'
		},
		{
			key: 'charisma',
			name: 'Charisma',
			icon: charismaIcon,
			description: 'Social skills and persuasion',
			color: 'bg-purple-100 text-purple-800'
		},
	];

	let isUpdating = $state(false);
	let errorMessage = $state('');

	const statBoostPoints = $derived(stats.statBoostPoints ?? 0);
	const availableLevelPoints = $derived(stats.availableLevelPoints ?? 0);
	const levelStatPointsEarned = $derived(stats.levelStatPointsEarned ?? 0);
	const creatureLevel = $derived(stats.level ?? 1);
	// Only surface the level pool once the creature has earned level points.
	// If it has none, the level controls are hidden entirely.
	const showLevelPool = $derived(levelStatPointsEarned > 0);
	const hasSpendablePoints = $derived(
		statBoostPoints > 0 || (showLevelPool && availableLevelPoints > 0)
	);

	// Fall back to the effective stats as a cap basis when base stats are
	// absent (for example an older cached response).
	const baseStats = $derived(stats.baseStats ?? (stats as CreatureStats));

	function baseValue(key: string): number {
		return (baseStats[key as keyof CreatureStats] as number) ?? 0;
	}

	function atCap(key: string): boolean {
		return baseValue(key) >= STAT_MAX;
	}

	async function spend(stat: string, source: StatPointSource) {
		if (isUpdating) return;

		isUpdating = true;
		errorMessage = '';

		try {
			const response = await fetch('/api/character/boost-stat', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ stat, points: 1, source })
			});

			if (!response.ok) {
				let message = 'Failed to spend stat point';
				try {
					const body = await response.json();
					if (body && typeof body.error === 'string') {
						message = body.error;
					}
				} catch {
					// Keep the default message when the body is not JSON.
				}
				throw new Error(message);
			}

			await onBoosted?.();
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Failed to spend stat point';
		} finally {
			isUpdating = false;
		}
	}
</script>

<Card class="w-full max-w-md">
	<CardHeader>
		<CardTitle class="flex flex-wrap items-center gap-2">
			Stat Boost Points
			<Badge variant="secondary">Quest boost points: {statBoostPoints}</Badge>
			{#if showLevelPool}
				<Badge variant="secondary">Level points (level {creatureLevel}): {availableLevelPoints}</Badge>
			{/if}
		</CardTitle>
		<CardDescription>
			Spend points to permanently increase your character stats
		</CardDescription>
	</CardHeader>

	<CardContent class="space-y-4">
		{#if errorMessage}
			<div
				role="alert"
				class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
			>
				{errorMessage}
			</div>
		{/if}

		{#if hasSpendablePoints}
			<div class="grid gap-3">
				{#each statInfo as stat}
					<div class="flex items-center justify-between p-2">
						<div class="flex items-center gap-3">
							<div class="text-xl">{@html stat.icon}</div>
							<div>
								<div class="font-medium">{stat.name}</div>
								<div class="text-sm text-muted-foreground">{stat.description}</div>
							</div>
						</div>
						<div class="flex items-center gap-2">
							<Badge class={stat.color}>
								{stats[stat.key as keyof CreatureStats]}
							</Badge>
							<Button
								size="sm"
								onclick={() => spend(stat.key, 'boost')}
								disabled={isUpdating || statBoostPoints <= 0 || atCap(stat.key)}
								aria-label={`Spend a quest boost point on ${stat.name}`}
							>
								+1
							</Button>
							{#if showLevelPool}
								<Button
									size="sm"
									variant="secondary"
									onclick={() => spend(stat.key, 'level')}
									disabled={isUpdating || availableLevelPoints <= 0 || atCap(stat.key)}
									aria-label={`Spend a level point on ${stat.name}`}
								>
									+1 L
								</Button>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="text-center py-6 text-muted-foreground">
				<div class="text-4xl mb-2">🎯</div>
				<div class="font-medium">No stat points available</div>
				<div class="text-sm">Complete quests and level up to earn more points!</div>
			</div>
		{/if}

		{#if isUpdating}
			<div class="text-center text-muted-foreground text-sm">
				Updating stats...
			</div>
		{/if}
	</CardContent>
</Card>
