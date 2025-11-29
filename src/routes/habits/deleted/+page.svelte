<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import { Trash2, RotateCcw } from '@lucide/svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import type { PageData } from './$types';
	import { toast } from 'svelte-sonner';

	export let data: PageData;

	async function permanentlyDeleteHabit(habitId: string, habitTitle: string) {
		if (!confirm(`Are you sure you want to permanently delete "${habitTitle}"? This cannot be undone.`)) return;
		
		try {
			const response = await fetch(`/api/habits/${habitId}/permanent-delete`, {
				method: 'DELETE'
			});
			
			if (!response.ok) {
				throw new Error('Failed to delete habit');
			}

			toast.success(`${habitTitle} permanently deleted`);
			await invalidateAll();
		} catch (error) {
			toast.error(`Error deleting habit: ${error}`);
		}
	}

	async function restoreHabit(habitId: string, habitTitle: string) {
		try {
			const response = await fetch(`/api/habits/${habitId}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ isArchived: false })
			});
			
			if (!response.ok) {
				throw new Error('Failed to restore habit');
			}

			toast.success(`${habitTitle} restored`);
			await invalidateAll();
		} catch (error) {
			toast.error(`Error restoring habit: ${error}`);
		}
	}
</script>

<div class="container mx-auto px-4 py-6">
	<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
		<div>
			<h1 class="text-2xl md:text-3xl font-bold">Deleted Habits</h1>
			<p class="text-sm text-muted-foreground mt-2">Habits you've deleted. Restore or permanently remove them.</p>
		</div>
		<Button variant="outline" onclick={() => goto('/habits')} class="w-full sm:w-auto">
			Back to Active Habits
		</Button>
	</div>

	{#if data.deletedHabits?.length > 0}
		<div class="space-y-3">
			{#each data.deletedHabits as habit}
				<div class="p-4 border rounded-lg flex flex-col sm:flex-row justify-between items-start gap-4 bg-card opacity-75">
					<div class="flex-1 min-w-0">
						<h3 class="font-semibold text-base md:text-lg break-words line-through">{habit.title}</h3>
						{#if habit.description}
							<p class="text-xs md:text-sm text-muted-foreground mt-1 line-clamp-2">{habit.description}</p>
						{/if}
						<div class="mt-2 text-xs md:text-sm text-muted-foreground">
							Deleted on: {new Date(habit.updatedAt).toLocaleDateString()}
						</div>
					</div>
					
					<div class="flex gap-2 w-full sm:w-auto">
						<Button 
							variant="outline"
							size="sm"
							onclick={() => restoreHabit(habit.id, habit.title)}
							class="flex-1 sm:flex-none flex items-center justify-center gap-2"
						>
							<RotateCcw class="h-4 w-4" />
							<span class="hidden sm:inline">Restore</span>
						</Button>
						<Button 
							variant="destructive"
							size="sm"
							onclick={() => permanentlyDeleteHabit(habit.id, habit.title)}
							class="flex-1 sm:flex-none flex items-center justify-center gap-2"
						>
							<Trash2 class="h-4 w-4" />
							<span class="hidden sm:inline">Delete</span>
						</Button>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="text-center py-12">
			<p class="text-muted-foreground mb-4">No deleted habits. All your habits are active!</p>
		</div>
	{/if}
</div>
