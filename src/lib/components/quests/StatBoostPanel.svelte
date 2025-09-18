<script lang="ts">
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "$lib/components/ui/card";
	import { Button } from "$lib/components/ui/button";
	import { Badge } from "$lib/components/ui/badge";

	interface UserStats {
		strength: number;
		dexterity: number;
		intelligence: number;
		charisma: number;
		statBoostPoints: number;
	}

	const { 
		stats, 
		onBoostStat, 
		isUpdating = false 
	} = $props<{
		stats: UserStats;
		onBoostStat: (stat: string) => void;
		isUpdating?: boolean;
	}>();

	const statInfo = [
		{
			key: 'strength',
			name: 'Strength',
			icon: '💪',
			description: 'Physical power and endurance',
			color: 'bg-red-100 text-red-800'
		},
		{
			key: 'dexterity',
			name: 'Dexterity',
			icon: '🏃',
			description: 'Agility and quick reflexes',
			color: 'bg-green-100 text-green-800'
		},
		{
			key: 'intelligence',
			name: 'Intelligence',
			icon: '🧠',
			description: 'Knowledge and problem-solving',
			color: 'bg-blue-100 text-blue-800'
		},
		{
			key: 'charisma',
			name: 'Charisma',
			icon: '💬',
			description: 'Social skills and persuasion',
			color: 'bg-purple-100 text-purple-800'
		}
	];
</script>

<Card class="w-full max-w-md">
	<CardHeader>
		<CardTitle class="flex items-center gap-2">
			⭐ Stat Boost Points
			<Badge variant="secondary">{stats.statBoostPoints} available</Badge>
		</CardTitle>
		<CardDescription>
			Spend points to permanently increase your character stats
		</CardDescription>
	</CardHeader>
	
	<CardContent class="space-y-4">
		{#if stats.statBoostPoints > 0}
			<div class="grid gap-3">
				{#each statInfo as stat}
					<div class="flex items-center justify-between p-3 border rounded-lg">
						<div class="flex items-center gap-3">
							<div class="text-xl">{stat.icon}</div>
							<div>
								<div class="font-medium">{stat.name}</div>
								<div class="text-sm text-muted-foreground">{stat.description}</div>
							</div>
						</div>
						<div class="flex items-center gap-2">
							<Badge class={stat.color}>
								{stats[stat.key as keyof UserStats]}
							</Badge>
							<Button 
								size="sm" 
								onclick={() => onBoostStat(stat.key)}
								disabled={isUpdating}
							>
								+1
							</Button>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="text-center py-6 text-muted-foreground">
				<div class="text-4xl mb-2">🎯</div>
				<div class="font-medium">No stat boost points available</div>
				<div class="text-sm">Complete quests to earn more points!</div>
			</div>
		{/if}

		{#if isUpdating}
			<div class="text-center text-muted-foreground text-sm">
				Updating stats...
			</div>
		{/if}
	</CardContent>
</Card>
