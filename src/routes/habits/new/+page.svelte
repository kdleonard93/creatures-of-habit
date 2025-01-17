<script lang="ts">
    import HabitForm from '$lib/components/habits/HabitForm.svelte';
    import type { HabitData } from '$lib/types';
    import { goto } from '$app/navigation';

    async function handleSubmit(data: HabitData) {
        const response = await fetch('/api/habits', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error);
        }

        // Redirect to habits list
        await goto('/habits');
    }
</script>

<div class="container mx-auto py-8">
    <HabitForm onSubmit={handleSubmit} />
</div>