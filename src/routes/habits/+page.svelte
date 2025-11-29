<script lang="ts">
    import HabitForm from '$lib/components/habits/HabitForm.svelte';
    import HabitCard from '$lib/components/habits/HabitCard.svelte';
    import type { PageData } from './$types';
    import { goto, invalidateAll } from '$app/navigation';
    import { Button } from '$lib/components/ui/button';
    import { CirclePlus, FolderCheck } from '@lucide/svelte';
    import { toast } from 'svelte-sonner';

    export let data: PageData;

    function navigateToNewHabit() {
        goto('/habits/new');
    }

    async function deleteHabit(habitId: string, habitTitle: string) {
    if (!confirm('Are you sure you want to delete this habit?')) return;
    
    try {
        const response = await fetch(`/api/habits/${habitId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete habit');
        }

        toast.success(`${habitTitle} deleted successfully`, {duration: 10000});
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
</script>

<div class="container mx-auto px-4 py-6">
    <div class="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        <div class="flex flex-col gap-3">
            <h1 class="text-2xl font-bold">Your Habits</h1>
            <Button class="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-foreground hover:text-background transition-colors duration-200" size="sm" onclick={() => goto('/habits/deleted')}>
                <FolderCheck class="h-4 w-4 mr-2" />
                View Deleted Habits
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
                <HabitCard 
                    {habit}
                    onEdit={editHabit}
                    onDelete={deleteHabit}
                    onComplete={completeHabit}
                />
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