<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import QuestCard from '$lib/components/quests/QuestCard.svelte';
	import QuestQuestion from '$lib/components/quests/QuestQuestion.svelte';
	import StatBoostPanel from '$lib/components/quests/StatBoostPanel.svelte';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';

	let dailyQuest: any = null;
	let currentQuestion: any = null;
	let userStats: any = null;
	let questProgress: any = null;
	let loading = true;
	let error = '';
	let isAnswering = false;
	let isUpdatingStats = false;

	// Quest states
	let showQuestion = false;
	let showStatBoost = false;

	onMount(async () => {
		await loadQuestData();
	});

	async function loadQuestData() {
		try {
			loading = true;
			error = '';

			// Load daily quest
			const questResponse = await fetch('/api/quests/daily');
			if (!questResponse.ok) {
				throw new Error('Failed to load daily quest');
			}
			dailyQuest = await questResponse.json();

			// Load user stats
			const statsResponse = await fetch('/api/character/stat-boost-points');
			if (!statsResponse.ok) {
				throw new Error('Failed to load user stats');
			}
			userStats = await statsResponse.json();

			// If quest is active, load progress
			if (dailyQuest.status === 'active') {
				await loadQuestProgress();
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'An error occurred';
		} finally {
			loading = false;
		}
	}

	async function loadQuestProgress() {
		try {
			const progressResponse = await fetch(`/api/quests/${dailyQuest.id}/progress`);
			if (!progressResponse.ok) {
				throw new Error('Failed to load quest progress');
			}
			questProgress = await progressResponse.json();
			
			// If there are unanswered questions, show the current one
			if (questProgress.questions && questProgress.questions.length > dailyQuest.currentQuestion) {
				currentQuestion = questProgress.questions[dailyQuest.currentQuestion];
				showQuestion = true;
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load quest progress';
		}
	}

	async function activateQuest() {
		try {
			const response = await fetch(`/api/quests/${dailyQuest.id}/activate`, {
				method: 'POST'
			});
			
			if (!response.ok) {
				throw new Error('Failed to activate quest');
			}
			
			await loadQuestData();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to activate quest';
		}
	}

	async function answerQuestion(choice: 'A' | 'B') {
		if (!currentQuestion) return;
		
		try {
			isAnswering = true;
			const response = await fetch(`/api/quests/${dailyQuest.id}/answer`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					questionId: currentQuestion.id,
					choice
				})
			});
			
			if (!response.ok) {
				throw new Error('Failed to submit answer');
			}
			
			const result = await response.json();
			
			// Reload quest data to get updated progress
			await loadQuestData();
			
			// If quest is completed, show stat boost panel
			if (result.questComplete || result.questCompleted) {
				showQuestion = false;
				showStatBoost = true;
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to submit answer';
		} finally {
			isAnswering = false;
		}
	}

	async function boostStat(stat: string) {
		try {
			isUpdatingStats = true;
			const response = await fetch('/api/character/boost-stat', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					stat,
					points: 1
				})
			});
			
			if (!response.ok) {
				throw new Error('Failed to boost stat');
			}
			
			// Reload user stats
			const statsResponse = await fetch('/api/character/stat-boost-points');
			if (statsResponse.ok) {
				userStats = await statsResponse.json();
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to boost stat';
		} finally {
			isUpdatingStats = false;
		}
	}

	function continueQuest() {
		showQuestion = true;
		showStatBoost = false;
	}

	function viewStatBoost() {
		showStatBoost = true;
		showQuestion = false;
	}
</script>

<svelte:head>
	<title>Daily Quests - Creatures of Habit</title>
</svelte:head>

<div class="container mx-auto px-4 py-8 max-w-4xl">
	<div class="mb-8">
		<h1 class="text-3xl font-bold mb-2">Daily Quest</h1>
		<p class="text-muted-foreground">
			Complete interactive story quests to earn experience and stat boost points!
		</p>
	</div>

	{#if loading}
		<div class="flex justify-center items-center py-12">
			<div class="text-center">
				<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
				<p class="text-muted-foreground">Loading quest...</p>
			</div>
		</div>
	{:else if error}
		<Card class="border-destructive">
			<CardContent class="pt-6">
				<div class="text-center text-destructive">
					<p class="font-medium">Error loading quest</p>
					<p class="text-sm mt-1">{error}</p>
					<Button onclick={loadQuestData} class="mt-4">Try Again</Button>
				</div>
			</CardContent>
		</Card>
	{:else}
		<div class="grid gap-6 lg:grid-cols-3">
			<!-- Main Quest Area -->
			<div class="lg:col-span-2 space-y-6">
				{#if showQuestion && currentQuestion && userStats}
					<QuestQuestion
						question={currentQuestion}
						userStats={userStats}
						questionNumber={dailyQuest.currentQuestion + 1}
						totalQuestions={dailyQuest.totalQuestions}
						onAnswer={answerQuestion}
						isAnswering={isAnswering}
					/>
				{:else if dailyQuest}
					<QuestCard
						quest={dailyQuest}
						onActivate={activateQuest}
						onContinue={continueQuest}
					/>
				{/if}
			</div>

			<!-- Sidebar -->
			<div class="space-y-6">
				{#if userStats && (showStatBoost || dailyQuest?.status === 'completed')}
					<StatBoostPanel
						stats={userStats}
						onBoostStat={boostStat}
						isUpdating={isUpdatingStats}
					/>
				{/if}

				{#if userStats && !showStatBoost}
					<Card>
						<CardHeader>
							<CardTitle class="text-lg">Your Stats</CardTitle>
						</CardHeader>
						<CardContent class="space-y-3">
							<div class="grid grid-cols-2 gap-3 text-sm">
								<div class="flex justify-between">
									<span>💪 Strength:</span>
									<span class="font-medium">{userStats.strength}</span>
								</div>
								<div class="flex justify-between">
									<span>🏃 Dexterity:</span>
									<span class="font-medium">{userStats.dexterity}</span>
								</div>
								<div class="flex justify-between">
									<span>🧠 Intelligence:</span>
									<span class="font-medium">{userStats.intelligence}</span>
								</div>
								<div class="flex justify-between">
									<span>💬 Charisma:</span>
									<span class="font-medium">{userStats.charisma}</span>
								</div>
							</div>
							{#if userStats.statBoostPoints > 0}
								<Button onclick={viewStatBoost} class="w-full mt-4" size="sm">
									Spend Stat Points ({userStats.statBoostPoints})
								</Button>
							{/if}
						</CardContent>
					</Card>
				{/if}
			</div>
		</div>
	{/if}
</div>