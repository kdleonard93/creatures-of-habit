<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Plus } from 'lucide-svelte';
    import { goto } from '$app/navigation';
    import type { PageData } from './$types';

    export let data: PageData;

    function navigateToNewHabit() {
        goto('/habits/new');
    }
</script>

<div class="container mx-auto py-8">
    <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold">Your Habits</h1>
        <Button onclick={navigateToNewHabit} class="flex items-center gap-2">
            <Plus class="h-4 w-4" />
            Create New Habit
        </Button>
    </div>

    {#if data.habits?.length > 0}
        <div class="grid gap-4">
            {#each data.habits as habit}
                <div class="p-4 border rounded-lg">
                    <h3 class="font-semibold">{habit.title}</h3>
                    {#if habit.description}
                        <p class="text-sm text-gray-600">{habit.description}</p>
                    {/if}
                    <div class="mt-2 flex gap-2 text-sm">
                        <span class="capitalize px-2 py-1 bg-primary/10 rounded">
                            {habit.frequency}
                        </span>
                        <span class="capitalize px-2 py-1 bg-primary/10 rounded">
                            {habit.difficulty}
                        </span>
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