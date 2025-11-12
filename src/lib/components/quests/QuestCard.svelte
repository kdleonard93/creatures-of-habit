<script lang="ts">
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "$lib/components/ui/card";
	import { Button } from "$lib/components/ui/button";
	import { Badge } from "$lib/components/ui/badge";
	import { Progress } from "$lib/components/ui/progress";
	import QuestTimer from "./QuestTimer.svelte"

	interface QuestData {
		id: string;
		title: string;
		description: string;
		narrative: string;
		status: 'available' | 'active' | 'completed';
		currentQuestion: number;
		totalQuestions: number;
		correctAnswers: number;
		expRewardBase: number;
		expRewardBonus: number;
		activatedAt?: string;
		completedAt?: string;
	}

	const { quest, onActivate, onContinue } = $props<{
		quest: QuestData;
		onActivate?: () => void;
		onContinue?: () => void;
	}>();

	const progressPercentage = $derived((quest.currentQuestion / quest.totalQuestions) * 100);
	const isCompleted = $derived(quest.status === 'completed');
	const isActive = $derived(quest.status === 'active');
	const isAvailable = $derived(quest.status === 'available');

	function getDifficultyColor(expBase: number): string {
		if (expBase <= 30) return 'bg-green-100 text-green-800';
		if (expBase <= 60) return 'bg-yellow-100 text-yellow-800';
		return 'bg-red-100 text-red-800';
	}

	function getDifficultyText(expBase: number): string {
		if (expBase <= 30) return 'Easy';
		if (expBase <= 60) return 'Medium';
		return 'Hard';
	}
</script>

<Card class="w-full max-w-md">
	<CardHeader>
		<div class="flex justify-between items-start">
			<div class="flex-1">
				<CardTitle class="text-lg">{quest.title}</CardTitle>
				<CardDescription class="mt-1">{quest.description}</CardDescription>
			</div>
			<Badge class={getDifficultyColor(quest.expRewardBase)}>
				{getDifficultyText(quest.expRewardBase)}
			</Badge>
		</div>
	</CardHeader>
	
	<CardContent class="space-y-4">
		<!-- Quest Narrative -->
		<div class="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
			{quest.narrative}
		</div>

		{#if isCompleted}
			<div class="border-t pt-3">
				<QuestTimer />
			</div>
		{/if}

		<!-- Progress Bar (for active quests) -->
		{#if isActive}
			<div class="space-y-2">
				<div class="flex justify-between text-sm">
					<span>Progress</span>
					<span>{quest.currentQuestion}/{quest.totalQuestions}</span>
				</div>
				<Progress value={progressPercentage} class="h-2" />
				<div class="text-xs text-muted-foreground">
					Correct answers: {quest.correctAnswers}
				</div>
			</div>
		{/if}

		<!-- Completion Status -->
		{#if isCompleted}
			<div class="space-y-2">
				<div class="flex items-center gap-2">
					<Badge class="bg-green-100 text-green-800">Completed</Badge>
					<span class="text-sm text-muted-foreground">
						{quest.correctAnswers}/{quest.totalQuestions} correct
					</span>
				</div>
				<div class="text-sm">
					<span class="font-medium">Rewards earned:</span>
					<div class="text-muted-foreground">
						• {quest.expRewardBase + (quest.correctAnswers >= 3 ? quest.expRewardBonus : 0)} EXP
						{#if quest.correctAnswers >= 3}
							• 1 Stat Boost Point
						{/if}
					</div>
				</div>
			</div>
		{/if}

		<!-- Reward Preview (for available quests) -->
		{#if isAvailable}
			<div class="text-sm">
				<span class="font-medium">Potential rewards:</span>
				<div class="text-muted-foreground">
					• Base: {quest.expRewardBase} EXP
					• Bonus (3+ correct): +{quest.expRewardBonus} EXP + 1 Stat Boost Point
				</div>
			</div>
		{/if}

		<!-- Action Buttons -->
		<div class="flex gap-2">
			{#if isAvailable && onActivate}
				<Button onclick={onActivate} class="flex-1">
					Start Quest
				</Button>
			{:else if isActive && onContinue}
				<Button onclick={onContinue} class="flex-1">
					Continue Quest
				</Button>
			{:else if isCompleted}
				<Button disabled class="flex-1">
					Quest Complete
				</Button>
			{/if}
		</div>
	</CardContent>
</Card>
