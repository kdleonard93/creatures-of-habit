<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Trash2, Pen, CirclePlus, CircleCheck, Trophy, FolderCheck } from '@lucide/svelte';
    import { goto, invalidateAll } from '$app/navigation';
    import type { PageData } from './$types';
    import { toast } from 'svelte-sonner';
    import HabitReminder from '$lib/components/habits/HabitReminder.svelte'

    export let data: PageData;


    function navigateToNewHabit() {
        goto('/habits/new');
    }

    async function deleteHabit(habitId: string) {
    if (!confirm('Are you sure you want to delete this habit?')) return;
    
    try {
        const response = await fetch(`/api/habits/${habitId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete habit');
        }

        toast.success(`${habitId} deleted successfully`, {duration: 10000});
        await invalidateAll();
    } catch (error) {
        toast.error(`Error deleting habit: ${error}`);
    }
}

async function completeHabit(habitId: string) {
    try {
        const response = await fetch(`/api/habits/${habitId}/complete`, {
            method: 'POST'
        });

        if (!response.ok) {
            throw new Error('Failed to complete habit');
        }

        const data = await response.json();
        
        toast.success(`Gained ${data.experienceEarned} XP!`);
        if (data.newLevel > data.previousLevel) {
            toast.success(`Level up! Now level ${data.newLevel}`);
        }

        // Refresh the habits list
        await invalidateAll();
    } catch (error) {
        console.error('Error completing habit:', error);
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

<div class="container mx-auto px-4 py-6">
    <div class="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        <div class="flex flex-col gap-3">
            <h1 class="text-2xl font-bold">Your Habits</h1>
            <Button class="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-foreground hover:text-background transition-colors duration-200" size="sm" onclick={() => goto('/habits/completed')}>
                <FolderCheck class="h-4 w-4 mr-2" />
                View Completed Habits
            </Button>
        </div>
        <Button onclick={navigateToNewHabit} class="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-foreground hover:text-background transition-colors duration-200">
            <CirclePlus class="h-4 w-4" />
            Create New Habit
        </Button>
    </div>

    {#if data.habits?.length > 0}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {#each data.habits as habit (habit.id)}
                <div class="p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col justify-between h-full bg-card">
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
                        
                        <div class="flex flex-wrap gap-2">
                            <span class="capitalize px-2 py-1 bg-badge rounded-full text-xs">
                                {habit.frequency === 'custom' && habit.customFrequency?.days ? 
                                    formatCustomDays(habit.customFrequency.days) : 
                                    habit.frequency}
                            </span>
                            <span class="capitalize px-2 py-1 bg-badge rounded-full text-xs">
                                {habit.difficulty}
                            </span>
                            <span class="capitalize px-2 py-1 bg-badge rounded-full text-xs truncate">
                                {habit.category?.name ?? 'Uncategorized'}
                            </span>
                        </div>
                    </div>
                    
                    <div class="mt-4 space-y-3">
                        <div class="grid grid-cols-3 gap-2">
                            <Button 
                                variant="outline"
                                size="sm"
                                onclick={() => editHabit(habit.id)}
                                class="flex items-center justify-center gap-1 text-xs"
                                title="Edit habit"
                            >
                                <Pen class="h-3 w-3" />
                                <span class="hidden sm:inline">Edit</span>
                            </Button>
                            <Button 
                                variant="destructive"
                                size="sm"
                                onclick={() => deleteHabit(habit.id)}
                                class="flex items-center justify-center gap-1 text-xs"
                                title="Delete habit"
                            >
                                <Trash2 class="h-3 w-3" />
                                <span class="hidden sm:inline">Delete</span>
                            </Button>
                            <Button 
                                variant="success"
                                size="sm"
                                onclick={() => completeHabit(habit.id)}
                                disabled={habit.completedToday}
                                class="flex items-center justify-center gap-1 text-xs"
                                title="Mark as complete"
                            >
                                <CircleCheck class="h-3 w-3" />
                                <span class="hidden sm:inline">Complete</span>
                            </Button>
                        </div>
                        <div class="w-full">
                            <HabitReminder habitId={habit.id} habitTitle={habit.title} />
                        </div>
                    </div>
                </div>
            {/each}
        </div>
    {:else}
        <div class="text-center py-12">
            <p class="text-gray-600 mb-4">You haven't created any habits yet.</p>
            <Button onclick={navigateToNewHabit} variant="outline" class="w-full sm:w-auto">
                Create Your First Habit
            </Button>
        </div>
    {/if}
</div>