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

<div class="container mx-auto px-4 py-6">
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 class="text-2xl md:text-3xl font-bold">Completed Habits</h1>
        <Button variant="outline" onclick={() => goto('/habits')} class="w-full sm:w-auto">
            Back to Active Habits
        </Button>
    </div>

    {#if data.completedHabits?.length > 0}
        <div class="space-y-3">
            {#each data.completedHabits as habit}
                <div class="p-4 border rounded-lg flex flex-col sm:flex-row justify-between items-start gap-4 bg-card">
                    <div class="flex-1 min-w-0">
                        <h3 class="font-semibold text-base md:text-lg break-words">{habit.title}</h3>
                        {#if habit.description}
                            <p class="text-xs md:text-sm text-muted-foreground mt-1 line-clamp-2">{habit.description}</p>
                        {/if}
                        <div class="mt-2 text-xs md:text-sm text-muted-foreground">
                            Completed on: {new Date(habit.updatedAt).toLocaleDateString()}
                        </div>
                    </div>
                    
                    <Button 
                        variant="destructive"
                        size="sm"
                        onclick={() => permanentlyDeleteHabit(habit.id)}
                        class="w-full sm:w-auto flex items-center justify-center gap-2 flex-shrink-0"
                    >
                        <Trash2 class="h-4 w-4" />
                        <span class="hidden sm:inline">Delete Permanently</span>
                        <span class="sm:hidden">Delete</span>
                    </Button>
                </div>
            {/each}
        </div>
    {:else}
        <div class="text-center py-12">
            <p class="text-muted-foreground mb-4">No completed habits yet.</p>
        </div>
    {/if}
</div>