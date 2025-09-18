<script lang="ts">
	import { onMount } from 'svelte';
	import { Card, CardContent, CardHeader, CardTitle } from "$lib/components/ui/card";
	import { Button } from "$lib/components/ui/button";
	import { Badge } from "$lib/components/ui/badge";
	import { Progress } from "$lib/components/ui/progress";

	let dailyQuest: any = null;
	let loading = true;
	let error = '';

	onMount(async () => {
		await loadDailyQuest();
	});

	async function loadDailyQuest() {
		try {
			loading = true;
			error = '';
			
			const response = await fetch('/api/quests/daily');
			if (!response.ok) {
				throw new Error('Failed to load daily quest');
			}
			
			dailyQuest = await response.json();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load quest';
		} finally {
			loading = false;
		}
	}

	function getStatusColor(status: string): string {
		switch (status) {
			case 'available': return 'bg-blue-100 text-blue-800';
			case 'active': return 'bg-yellow-100 text-yellow-800';
			case 'completed': return 'bg-green-100 text-green-800';
			default: return 'bg-gray-100 text-gray-800';
		}
	}

	function getStatusText(status: string): string {
		switch (status) {
			case 'available': return 'Ready to Start';
			case 'active': return 'In Progress';
			case 'completed': return 'Completed';
			default: return 'Unknown';
		}
	}

	const progressPercentage = $derived(
		dailyQuest ? (dailyQuest.currentQuestion / dailyQuest.totalQuestions) * 100 : 0
	);
</script>

<Card class="w-full">
	<CardHeader class="pb-3">
		<CardTitle class="text-lg flex items-center gap-2">
			🗡️ Daily Quest
			{#if dailyQuest && !loading}
				<Badge class={getStatusColor(dailyQuest.status)} variant="secondary">
					{getStatusText(dailyQuest.status)}
				</Badge>
			{/if}
		</CardTitle>
	</CardHeader>
	
	<CardContent class="space-y-3">
		{#if loading}
			<div class="flex items-center gap-2 text-sm text-muted-foreground">
				<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
				Loading quest...
			</div>
		{:else if error}
			<div class="text-sm text-destructive">
				{error}
			</div>
		{:else if dailyQuest}
			<div class="space-y-3">
				<div>
					<h4 class="font-medium text-sm">{dailyQuest.title}</h4>
					<p class="text-xs text-muted-foreground line-clamp-2">
						{dailyQuest.description}
					</p>
				</div>

				{#if dailyQuest.status === 'active'}
					<div class="space-y-2">
						<div class="flex justify-between text-xs">
							<span>Progress</span>
							<span>{dailyQuest.currentQuestion}/{dailyQuest.totalQuestions}</span>
						</div>
						<Progress value={progressPercentage} class="h-1.5" />
						<div class="text-xs text-muted-foreground">
							Correct: {dailyQuest.correctAnswers}
						</div>
					</div>
				{:else if dailyQuest.status === 'completed'}
					<div class="text-xs space-y-1">
						<div class="flex justify-between">
							<span>Score:</span>
							<span class="font-medium">{dailyQuest.correctAnswers}/{dailyQuest.totalQuestions}</span>
						</div>
						<div class="text-muted-foreground">
							Earned: {dailyQuest.expRewardBase + (dailyQuest.correctAnswers >= 3 ? dailyQuest.expRewardBonus : 0)} EXP
							{#if dailyQuest.correctAnswers >= 3}
								+ 1 Stat Point
							{/if}
						</div>
					</div>
				{:else}
					<div class="text-xs text-muted-foreground">
						Potential rewards: {dailyQuest.expRewardBase}-{dailyQuest.expRewardBase + dailyQuest.expRewardBonus} EXP
					</div>
				{/if}

				<Button 
					href="/quests" 
					size="sm" 
					class="w-full"
					variant={dailyQuest.status === 'completed' ? 'outline' : 'default'}
				>
					{#if dailyQuest.status === 'available'}
						Start Quest
					{:else if dailyQuest.status === 'active'}
						Continue Quest
					{:else}
						View Quest
					{/if}
				</Button>
			</div>
		{:else}
			<div class="text-sm text-muted-foreground text-center py-2">
				No quest available
			</div>
		{/if}
	</CardContent>
</Card>
