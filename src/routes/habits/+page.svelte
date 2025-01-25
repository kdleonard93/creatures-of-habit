<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Check, Trash2, Pen, CirclePlus } from 'lucide-svelte';
    import { goto, invalidateAll } from '$app/navigation';
    import type { PageData } from './$types';
    import type { HabitData } from '$lib/types';

    export let data: PageData;

    function navigateToNewHabit() {
        goto('/habits/new');
    }

    async function deleteHabit(habitId: string) {
    if (!confirm('Are you sure you want to delete this habit?')) return;
    
    try {
        console.log('Deleting habit:', habitId);
        const response = await fetch(`/api/habits/${habitId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete habit');
        }

        console.log('Habit deleted successfully');
        
        await invalidateAll();
    } catch (error) {
        console.error('Error deleting habit:', error);
        }
        }

    function editHabit(habitId: string) {
        goto(`/habits/${habitId}/edit`);
    }

    export function formatCustomDays(days: number[] | undefined): string {
    if (!days || !days.length) return 'Custom';
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days.map(d => dayNames[d]).join(', ');
}

</script>

<div class="container mx-auto py-8">
    <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold">Your Habits</h1>
        <Button onclick={navigateToNewHabit} class="flex items-center gap-2">
            <CirclePlus class="h-4 w-4" />
            Create New Habit
        </Button>
    </div>

    {#if data.habits?.length > 0}
        <div class="grid gap-4">
            {#each data.habits as habit}
                <div class="p-4 border rounded-lg flex justify-between items-start">
                    <div>
                        <h3 class="font-semibold">{habit.title}</h3>
                        {#if habit.description}
                            <p class="text-sm text-gray-600">{habit.description}</p>
                        {/if}
                        <div class="mt-2 flex gap-2 text-sm">
                            <span class="capitalize px-2 py-1 bg-primary/10 rounded">
                                {habit.frequency === 'custom' && habit.customFrequency?.days ? 
                                    formatCustomDays(habit.customFrequency.days) : 
                                    habit.frequency}
                            </span>
                            <span class="capitalize px-2 py-1 bg-primary/10 rounded">
                                {habit.difficulty}
                            </span>
                            <span class="capitalize px-2 py-1 bg-primary/10 rounded">
                                {habit.category}
                            </span>
                        </div>
                    </div>
                    
                    <div class="flex gap-2">
                        <Button 
                            variant="outline"
                            size="sm"
                            onclick={() => editHabit(habit.id)}
                            class="flex items-center gap-2"
                        >
                            <Pen class="h-4 w-4" />
                            Edit
                        </Button>
                        <Button 
                            variant="destructive"
                            size="sm"
                            onclick={() => deleteHabit(habit.id)}
                            class="flex items-center gap-2"
                        >
                            <Trash2 class="h-4 w-4" />
                            Delete
                        </Button>
                    </div>
                </div>
            {/each}
        </div>
    {:else}
        <div class="text-center py-12">
            <p class="text-gray-600">You haven't created any habits yet.</p>
            <Button onclick={navigateToNewHabit} variant="outline" class="mt-4">
                Create Your First Habit
            </Button>
        </div>
    {/if}
</div>