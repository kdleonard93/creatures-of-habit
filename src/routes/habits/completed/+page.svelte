<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Trash2 } from '@lucide/svelte';
    import { goto, invalidateAll } from '$app/navigation';
    import type { PageData } from './$types';

    export let data: PageData;

    async function permanentlyDeleteHabit(habitId: string) {
        if (!confirm('Are you sure you want to permanently delete this habit?')) return;
        
        try {
            const response = await fetch(`/api/habits/${habitId}/permanent-delete`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error('Failed to delete habit');
            }

            await invalidateAll();
        } catch (error) {
            console.error('Error deleting habit:', error);
        }
    }
</script>

<div class="container mx-auto py-8">
    <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold">Completed Habits</h1>
        <Button variant="outline" onclick={() => goto('/habits')}>
            Back to Active Habits
        </Button>
    </div>

    {#if data.completedHabits?.length > 0}
        <div class="grid gap-4">
            {#each data.completedHabits as habit}
                <div class="p-4 border rounded-lg flex justify-between items-start">
                    <div>
                        <h3 class="font-semibold">{habit.title}</h3>
                        {#if habit.description}
                            <p class="text-sm text-gray-600">{habit.description}</p>
                        {/if}
                        <div class="mt-2 text-sm text-gray-500">
                            Completed on: {new Date(habit.updatedAt).toLocaleDateString()}
                        </div>
                    </div>
                    
                    <Button 
                        variant="destructive"
                        size="sm"
                        onclick={() => permanentlyDeleteHabit(habit.id)}
                        class="flex items-center gap-2"
                    >
                        <Trash2 class="h-4 w-4" />
                        Delete Permanently
                    </Button>
                </div>
            {/each}
        </div>
    {:else}
        <div class="text-center py-12">
            <p class="text-gray-600">No completed habits yet.</p>
        </div>
    {/if}
</div>