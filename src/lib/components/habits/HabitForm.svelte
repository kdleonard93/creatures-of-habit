<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Card, CardContent, CardHeader, CardTitle } from "$lib/components/ui/card";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import type { HabitData, HabitFrequency, HabitDifficulty } from '$lib/types';
    
const { onSubmit, initialData = null } = $props<{
    onSubmit: (data: HabitData) => Promise<void>;
    initialData?: HabitData | null;
}>();

    let formData = $state<HabitData>({
        title: '',
        description: '',
        frequency: 'daily',
        difficulty: 'medium' as const,
        startDate: new Date().toISOString().split('T')[0],
        customFrequency: {
            days: [],
        }
    });

    let errors = $state({
        title: '',
        frequency: '',
        general: ''
    });

    const difficulties: { value: HabitDifficulty; label: string }[] = [
        { value: 'easy', label: 'Easy' },
        { value: 'medium', label: 'Medium' },
        { value: 'hard', label: 'Hard' }
    ];

    const frequencies: { value: HabitFrequency; label: string }[] = [
        { value: 'daily', label: 'Daily' },
        { value: 'weekly', label: 'Weekly' },
        { value: 'custom', label: 'Custom' }
    ];

    const weekDays = [
        { value: 0, label: 'Sunday' },
        { value: 1, label: 'Monday' },
        { value: 2, label: 'Tuesday' },
        { value: 3, label: 'Wednesday' },
        { value: 4, label: 'Thursday' },
        { value: 5, label: 'Friday' },
        { value: 6, label: 'Saturday' }
    ];

    function handleSubmit(event: Event) {
        event.preventDefault();
        submitForm();
    }

    async function submitForm() {
        // Reset errors
        errors = {
            title: '',
            frequency: '',
            general: ''
        };

        // Validate
        if (!formData.title) {
            errors.title = 'Title is required';
            return;
        }

        if (formData.frequency === 'custom' && 
            (!formData.customFrequency?.days?.length)) {
            errors.frequency = 'Please specify custom frequency settings';
            return;
        }

        try {
            await onSubmit(formData);
        } catch (error) {
            console.error('Error submitting habit:', error);
            errors.general = 'Failed to create habit. Please try again.';
        }
    }
</script>

<Card class="w-full max-w-lg mx-auto">
    <CardHeader>
        <CardTitle>Create New Habit</CardTitle>
    </CardHeader>
    <CardContent>
        <form class="space-y-4" onsubmit={handleSubmit}>
            <!-- Title -->
            <div>
                <Label for="title">Title</Label>
                <Input
                    id="title"
                    bind:value={formData.title}
                    placeholder="Enter habit title"
                />
                {#if errors.title}
                    <p class="text-red-500 text-sm mt-1">{errors.title}</p>
                {/if}
            </div>

            <!-- Description -->
            <div>
                <Label for="description">Description (Optional)</Label>
                <Input
                    id="description"
                    bind:value={formData.description}
                    placeholder="Describe your habit"
                />
            </div>

            <!-- Frequency -->
            <div>
                <Label>Frequency</Label>
                <div class="grid grid-cols-3 gap-4 mt-2">
                    {#each frequencies as freq}
                        <button
                            type="button"
                            class="p-4 border rounded-lg text-center transition-colors
                                {formData.frequency === freq.value ? 
                                'border-primary bg-primary/10' : 
                                'hover:bg-primary/5'}"
                            onclick={() => formData.frequency = freq.value}
                        >
                            {freq.label}
                        </button>
                    {/each}
                </div>
            </div>

            <!-- Custom Frequency Options -->
            {#if formData.frequency === 'custom'}
                <div class="space-y-4">
                    <div>
                        <Label>Select Days</Label>
                        <div class="grid grid-cols-2 gap-2 mt-2">
                            {#each weekDays as day}
                                <label class="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        checked={formData.customFrequency?.days?.includes(day.value)}
                                        onclick={(e) => {
                                            const days = formData.customFrequency?.days || [];
                                            if (e.currentTarget.checked) {
                                                formData.customFrequency = {
                                                    ...formData.customFrequency,
                                                    days: [...days, day.value]
                                                };
                                            } else {
                                                formData.customFrequency = {
                                                    ...formData.customFrequency,
                                                    days: days.filter(d => d !== day.value)
                                                };
                                            }
                                        }}
                                    />
                                    <span>{day.label}</span>
                                </label>
                            {/each}
                        </div>
                    </div>
                </div>
            {/if}

            <!-- Difficulty -->
            <div>
                <Label>Difficulty</Label>
                <div class="grid grid-cols-3 gap-4 mt-2">
                    {#each difficulties as diff}
                        <button
                            type="button"
                            class="p-4 border rounded-lg text-center transition-colors
                                {formData.difficulty === diff.value ? 
                                'border-primary bg-primary/10' : 
                                'hover:bg-primary/5'}"
                            onclick={() => formData.difficulty = diff.value}
                        >
                            {diff.label}
                        </button>
                    {/each}
                </div>
            </div>

            <!-- Start Date -->
            <div>
                <Label for="startDate">Start Date</Label>
                <Input
                    id="startDate"
                    type="date"
                    bind:value={formData.startDate}
                />
            </div>

            {#if errors.general}
                <p class="text-red-500 text-sm">{errors.general}</p>
            {/if}

            <Button type="submit" class="w-full">Create Habit</Button>
        </form>
    </CardContent>
</Card>