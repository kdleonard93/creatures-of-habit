<script lang="ts">
    import HabitForm from '$lib/components/habits/HabitForm.svelte';
    import type { PageData } from './$types';
    import { goto } from '$app/navigation';
    import type { HabitData } from '$lib/types';


    export let data: PageData;

    const initialData: HabitData = {
        title: data.habit.title,
        categoryId: data.habit.categoryId ?? undefined,
        description: data.habit.description || '',
        frequency: data.habit.frequencyId ? 'custom' : 'daily',
        customFrequency: {
            days: []
        },
        difficulty: data.habit.difficulty,
        startDate: data.habit.startDate ?? new Date().toISOString()
    };

    async function handleSubmit(formData: HabitData) {
        const response = await fetch(`/api/habits/${data.habit.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error);
        }

        await goto('/habits');
    }
</script>

<div class="container mx-auto px-4 py-6">
    <h1 class="text-2xl md:text-3xl font-bold mb-6">Edit Habit</h1>
    <HabitForm {initialData} onSubmit={handleSubmit} categories={data.categories}/>
</div>