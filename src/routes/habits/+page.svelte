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

<div class="container mx-auto py-8">
    <div class="flex justify-between items-center mb-6">
        <div>
            <h1 class="text-2xl font-bold">Your Habits</h1>
            <Button class="bg-primary text-primary-foreground hover:bg-foreground hover:text-background transition-colors duration-200" size="sm" onclick={() => goto('/habits/completed')}>
                <div class="pr-4"><FolderCheck class="h-4 w-4"  /></div>
                View Completed Habits
            </Button>
        </div>
        <Button onclick={navigateToNewHabit} class="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-foreground hover:text-background transition-colors duration-200">
            <CirclePlus class="h-4 w-4" />
            Create New Habit
        </Button>
    </div>

    {#if data.habits?.length > 0}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {#each data.habits as habit (habit.id)}
                <div class="p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col justify-between h-full bg-card">
                    <div>
                        <h3 class="font-semibold text-lg">{habit.title}</h3>
                        {#if habit.description}
                            <p class="text-sm text-muted-foreground mt-1">{habit.description}</p>
                        {/if}
                        <div class="flex items-center gap-2 mt-2">
                            {#if habit.completedToday}
                                <div class="flex items-center gap-1 text-success">
                                    <Trophy class="h-4 w-4" />
                                    <span class="text-xs font-medium">Completed today</span>
                                </div>
                            {/if}
                        </div>
                        <div class="mt-3 flex flex-wrap gap-2 text-sm">
                            <span class="capitalize px-2 py-1 bg-badge rounded-full text-xs">
                                {habit.frequency === 'custom' && habit.customFrequency?.days ? 
                                    formatCustomDays(habit.customFrequency.days) : 
                                    habit.frequency}
                            </span>
                            <span class="capitalize px-2 py-1 bg-badge rounded-full text-xs">
                                {habit.difficulty}
                            </span>
                            <span class="capitalize px-2 py-1 bg-badge rounded-full text-xs">
                                {habit.category?.name ?? 'Uncategorized'}
                            </span>
                        </div>
                    </div>
                    
                    <div class="mt-4">
                        <div class="grid grid-cols-3 gap-2 mb-3">
                            <Button 
                                variant="outline"
                                size="sm"
                                onclick={() => editHabit(habit.id)}
                                class="flex items-center justify-center"
                            >
                                <Pen class="h-3 w-3 mr-1" />
                                Edit
                            </Button>
                            <Button 
                                variant="destructive"
                                size="sm"
                                onclick={() => deleteHabit(habit.id)}
                                class="flex items-center justify-center"
                            >
                                <Trash2 class="h-3 w-3 mr-1" />
                                Delete
                            </Button>
                            <Button 
                                variant="success"
                                size="sm"
                                onclick={() => completeHabit(habit.id)}
                                disabled={habit.completedToday}
                                class="flex items-center justify-center"
                            >
                                <CircleCheck class="h-3 w-3 mr-1" />
                                Complete
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
            <p class="text-gray-600">You haven't created any habits yet.</p>
            <Button onclick={navigateToNewHabit} variant="outline" class="mt-4">
                Create Your First Habit
            </Button>
        </div>
    {/if}
</div>