<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import type { Selected } from 'bits-ui';
	import type { HabitData, HabitFrequency, HabitDifficulty } from '$lib/types';

	const {
		onSubmit,
		initialData = null,
		categories
	} = $props<{
		onSubmit: (data: HabitData) => Promise<void>;
		initialData?: HabitData | null;
		categories: Array<{ id: string; name: string }>;
	}>();

	let formData = $state<HabitData>({
		title: '',
		description: '',
		frequency: 'daily',
		difficulty: 'medium' as const,
		startDate: new Date().toISOString().split('T')[0],
		categoryId: categories?.[0]?.id, // Set default category if available
		customFrequency: {
			days: []
		}
	});

	let errors = $state({
		title: '',
		frequency: '',
		category: '',
		general: ''
	});

	let selected = $state<Selected<string> | undefined>(undefined);

	$effect(() => {
		selected = formData.categoryId
			? {
					value: formData.categoryId,
					label:
						categories.find((cat: { id: string; name: string }) => cat.id === formData.categoryId)
							?.name || ''
				}
			: undefined;
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

    function handleDaySelect(day: number, checked: boolean) {
    const days = formData.customFrequency?.days || [];
    formData.customFrequency = {
        ...formData.customFrequency,
        days: checked 
            ? [...days, day]
            : days.filter(d => d !== day)
    };
}

	function handleSubmit(event: Event) {
		event.preventDefault();
		submitForm();
	}

	async function submitForm() {
		// Reset errors
		errors = {
			title: '',
			frequency: '',
			category: '',
			general: ''
		};

		// Validate
		if (!formData.title) {
			errors.title = 'Title is required';
			return;
		}

		if (!formData.categoryId) {
			errors.category = 'Please select a category';
			return;
		}

		if (formData.frequency === 'custom' && !formData.customFrequency?.days?.length) {
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

	function handleSelectedChange(selected: Selected<string> | undefined) {
		if (selected) {
			formData.categoryId = selected.value;
		} else {
			formData.categoryId = undefined;
		}
	}
</script>

<Card class="w-full max-w-lg mx-auto">
	<CardHeader>
		<CardTitle>{initialData ? 'Edit' : 'Create New'} Habit</CardTitle>
	</CardHeader>
	<CardContent>
		<form class="space-y-4" onsubmit={handleSubmit}>
			<!-- Title -->
			<div>
				<Label for="title">Title</Label>
				<Input id="title" bind:value={formData.title} placeholder="Enter habit title" />
				{#if errors.title}
					<p class="text-red-500 text-sm mt-1">{errors.title}</p>
				{/if}
			</div>

			<!-- Category -->
			<div>
				<Label for="category">Category</Label>
				<Select.Root {selected} onSelectedChange={handleSelectedChange}>
					<Select.Trigger>
						<Select.Value>
							{selected?.label ?? 'Select a category'}
						</Select.Value>
					</Select.Trigger>
					<Select.Content>
						{#each categories as category (category.id)}
							<Select.Item value={category.id}>
								{category.name}
							</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
				{#if errors.category}
					<p class="text-red-500 text-sm mt-1">{errors.category}</p>
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
                                {formData.frequency === freq.value
								? 'border-primary bg-primary/10'
								: 'hover:bg-primary/5'}"
							onclick={() => (formData.frequency = freq.value)}
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
                                        onclick={(e) => handleDaySelect(day.value, e.currentTarget.checked)}
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
                                {formData.difficulty === diff.value
								? 'border-primary bg-primary/10'
								: 'hover:bg-primary/5'}"
							onclick={() => (formData.difficulty = diff.value)}
						>
							{diff.label}
						</button>
					{/each}
				</div>
			</div>

			<!-- Start Date -->
			<div>
				<Label for="startDate">Start Date</Label>
				<Input id="startDate" type="date" bind:value={formData.startDate} />
			</div>

			{#if errors.general}
				<p class="text-red-500 text-sm">{errors.general}</p>
			{/if}

			<Button type="submit" class="w-full">
				{initialData ? 'Update' : 'Create'} Habit
			</Button>
		</form>
	</CardContent>
</Card>
