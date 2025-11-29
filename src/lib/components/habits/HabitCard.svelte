<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { CircleCheck, Pen, Trophy, Trash2 } from '@lucide/svelte';
	import HabitReminder from './HabitReminder.svelte';
	import HabitCountdown from './HabitCountdown.svelte';
	import type { HabitFrequency } from '$lib/types';

	interface Habit {
		id: string;
		title: string;
		description?: string | null;
		frequency: HabitFrequency | null;
		difficulty: string;
		customFrequency?: { days: number[] } | null;
		category?: { id: string; name: string } | null;
		isActiveToday: boolean;
		completedToday: boolean;
		availabilityMessage: string;
		nextActiveDate: Date | string | null;
	}

	interface Props {
		habit: Habit;
		onEdit: (habitId: string) => void;
		onDelete: (habitId: string, habitTitle: string) => void;
		onComplete: (habitId: string) => void;
		showReminder?: boolean;
	}

	let { habit, onEdit, onDelete, onComplete, showReminder = true }: Props = $props();

	function formatCustomDays(days: number[] | undefined): string {
		if (!days || !days.length) return 'Custom';
		
		const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
		const validDays = days.filter(d => {
			const isValid = Number.isInteger(d) && d >= 0 && d <= 6;
			if (!isValid && typeof window !== 'undefined') {
				console.warn(`Invalid day index: ${d}. Expected integer between 0-6.`);
			}
			return isValid;
		});
		
		if (validDays.length === 0) return 'Custom';
		return validDays.map(d => dayNames[d]).join(', ');
	}
</script>

<div class="p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col justify-between h-full bg-card {!habit.isActiveToday ? 'opacity-60' : ''}">
	<div class="space-y-3">
		<div>
			<h3 class="font-semibold text-base md:text-lg break-words">{habit.title}</h3>
			{#if habit.description}
				<p class="text-xs md:text-sm text-muted-foreground mt-1 line-clamp-2">{habit.description}</p>
			{/if}
		</div>
		
		{#if habit.completedToday}
			<div class="flex items-center gap-1 text-success text-xs md:text-sm">
				<Trophy class="h-4 w-4 flex-shrink-0" />
				<span class="font-medium">Completed today</span>
			</div>
		{/if}
		
		{#if !habit.isActiveToday}
			<HabitCountdown nextActiveDate={habit.nextActiveDate} isActive={habit.isActiveToday} />
		{/if}
		
		<div class="flex flex-wrap gap-2">
			<span class="capitalize px-2 py-1 bg-badge rounded-full text-xs">
				{habit.frequency === 'custom' && habit.customFrequency?.days ? 
					formatCustomDays(habit.customFrequency.days) : 
					habit.frequency}
			</span>
			<span class="capitalize px-2 py-1 bg-badge rounded-full text-xs">
				{habit.difficulty}
			</span>
			<span class="capitalize px-2 py-1 bg-badge rounded-full text-xs truncate max-w-[120px]">
				{habit.category?.name ?? 'Uncategorized'}
			</span>
		</div>
	</div>
	
	<div class="mt-4 space-y-3">
		<div class="grid grid-cols-3 gap-2">
			<Button 
				variant="outline"
				size="sm"
				onclick={() => onEdit(habit.id)}
				class="flex items-center justify-center gap-1 text-xs"
			>
				<Pen class="h-3 w-3" />
				<span class="sr-only sm:not-sr-only">Edit</span>
			</Button>
			<Button 
				variant="destructive"
				size="sm"
				onclick={() => onDelete(habit.id, habit.title)}
				class="flex items-center justify-center gap-1 text-xs"
			>
				<Trash2 class="h-3 w-3" />
				<span class="sr-only sm:not-sr-only">Delete</span>
			</Button>
			<Button 
				variant="success"
				size="sm"
				onclick={() => onComplete(habit.id)}
				disabled={habit.completedToday || !habit.isActiveToday}
				class="flex items-center justify-center gap-1 text-xs"
			>
				<CircleCheck class="h-3 w-3" />
				<span class="sr-only sm:not-sr-only">Complete</span>
			</Button>
		</div>
		{#if showReminder}
			<div class="w-full">
				<HabitReminder habitId={habit.id} habitTitle={habit.title} />
			</div>
		{/if}
	</div>
</div>
