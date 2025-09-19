<script lang="ts">
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "$lib/components/ui/card";
	import { Button } from "$lib/components/ui/button";
	import { Badge } from "$lib/components/ui/badge";

	interface QuestionData {
		id: string;
		questionText: string;
		choiceA: string;
		choiceB: string;
		requiredStat: string;
		difficultyThreshold: number;
		order: number;
	}

	interface UserStats {
		strength: number;
		dexterity: number;
		intelligence: number;
		charisma: number;
	}

	const { 
		question, 
		userStats, 
		questionNumber, 
		totalQuestions, 
		onAnswer, 
		isAnswering = false 
	} = $props<{
		question: QuestionData;
		userStats: UserStats;
		questionNumber: number;
		totalQuestions: number;
		onAnswer: (choice: 'A' | 'B') => void;
		isAnswering?: boolean;
	}>();

	const userStatValue = $derived(userStats[question.requiredStat as keyof UserStats] || 0);
	const successChance = $derived(Math.min(Math.max((userStatValue / question.difficultyThreshold) * 100, 10), 90));

	function getStatColor(stat: string): string {
		const colors = {
			strength: 'bg-red-100 text-red-800',
			dexterity: 'bg-green-100 text-green-800',
			intelligence: 'bg-blue-100 text-blue-800',
			charisma: 'bg-purple-100 text-purple-800'
		};
		return colors[stat as keyof typeof colors] || 'bg-gray-100 text-gray-800';
	}

	function getStatIcon(stat: string): string {
		const icons = {
			strength: '💪',
			dexterity: '🏃',
			intelligence: '🧠',
			charisma: '💬'
		};
		return icons[stat as keyof typeof icons] || '⭐';
	}
</script>

<Card class="w-full max-w-2xl">
	<CardHeader>
		<div class="flex justify-between items-center">
			<CardTitle class="text-xl">Question {questionNumber} of {totalQuestions}</CardTitle>
			<div class="flex items-center gap-2">
				<Badge class={getStatColor(question.requiredStat)}>
					{getStatIcon(question.requiredStat)} {question.requiredStat.charAt(0).toUpperCase() + question.requiredStat.slice(1)}
				</Badge>
			</div>
		</div>
		<CardDescription>
			Your {question.requiredStat}: {userStatValue} | Success chance: ~{Math.round(successChance)}%
		</CardDescription>
	</CardHeader>
	
	<CardContent class="space-y-6">
		<!-- Question Text -->
		<div class="text-lg font-medium leading-relaxed">
			{question.questionText}
		</div>

		<!-- Choice Buttons -->
		<div class="grid gap-4">
			<Button 
				variant="outline" 
				class="h-auto p-4 text-left justify-start whitespace-normal"
				onclick={() => onAnswer('A')}
				disabled={isAnswering}
			>
				<div class="flex items-start gap-3">
					<div class="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mt-0.5">
						A
					</div>
					<div class="flex-1">
						{question.choiceA}
					</div>
				</div>
			</Button>

			<Button 
				variant="outline" 
				class="h-auto p-4 text-left justify-start whitespace-normal"
				onclick={() => onAnswer('B')}
				disabled={isAnswering}
			>
				<div class="flex items-start gap-3">
					<div class="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mt-0.5">
						B
					</div>
					<div class="flex-1">
						{question.choiceB}
					</div>
				</div>
			</Button>
		</div>

		<!-- Hint about stat requirement -->
		<div class="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
			💡 <strong>Tip:</strong> This question tests your <strong>{question.requiredStat}</strong>. 
			Higher {question.requiredStat} increases your chance of success!
		</div>

		{#if isAnswering}
			<div class="text-center text-muted-foreground">
				Processing your answer...
			</div>
		{/if}
	</CardContent>
</Card>
