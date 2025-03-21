<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import Card from '$lib/components/ui/card/card.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Progress from '$lib/components/ui/progress/progress.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import { CreatureClass, CreatureRace } from '$lib/types';
	import type { RegistrationData, CreatureStats } from '$lib/types';
	import { raceDefinitions } from '$lib/data/races';
	import { classIcons } from '$lib/assets/classIcons';
	import { raceIcons } from '$lib/assets/raceIcons';
	import PasswordStrengthIndicator from '$lib/components/PasswordStrengthIndicator.svelte';
	import {createInitialStats, allocateStatPoints, getTotalStatPoints, INITIAL_STAT_POINTS, STAT_MIN, STAT_MAX} from '$lib/server/xp';

	const { onComplete } = $props<{
		onComplete: (data: RegistrationData) => void;
	}>();

	// State management with runes
	let currentStep = $state(1);
	let isSubmitting = $state(false);
	const totalSteps = 3;

	let formData = $state<RegistrationData>({
		email: '',
		username: '',
		password: '',
		confirmPassword: '',
		age: 0,
		creature: {
			name: '',
			class: CreatureClass.WARRIOR,
			race: CreatureRace.HUMAN,
			stats: {
				strength: 10,
				dexterity: 10,
				constitution: 10,
				intelligence: 10,
				wisdom: 10,
				charisma: 10
			},
			background: undefined
		},
		general: ''
	});

	let remainingStatPoints = $state(INITIAL_STAT_POINTS);

	// Update the stat modification function
	function modifyStat(stat: keyof CreatureStats, increment: boolean): void {
		const result = allocateStatPoints(formData.creature.stats, stat, increment);
		formData.creature.stats = result.stats;
		remainingStatPoints = result.remainingPoints;
	}

	let errors = $state({
		email: '',
		username: '',
		password: '',
		confirmPassword: '',
		age: '',
		creature: '',
		background: '',
		general: ''
	});

	let completionPercentage = $derived((currentStep / totalSteps) * 100);

	const creatureClasses = [
		CreatureClass.WARRIOR,
		CreatureClass.BRAWLER,
		CreatureClass.WIZARD,
		CreatureClass.CLERIC,
		CreatureClass.ASSASSIN,
		CreatureClass.ARCHER,
		CreatureClass.ALCHEMIST,
		CreatureClass.ENGINEER
	] as const;

	const creatureRaces = [
		CreatureRace.HUMAN,
		CreatureRace.ORC,
		CreatureRace.ELF,
		CreatureRace.DWARF
	];

	function validateEmail(email: string): boolean {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
	}

	function validateCurrentStep(): boolean {
		// Reset errors
		errors = {
			email: '',
			username: '',
			password: '',
			confirmPassword: '',
			age: '',
			creature: '',
			background: '',
			general: ''
		};

		switch (currentStep) {
			case 1:
				if (!validateEmail(formData.email)) {
					errors.email = 'Please enter a valid email address';
					return false;
				}
				if (formData.username.length < 3) {
					errors.username = 'Username must be at least 3 characters';
					return false;
				}
				if (formData.password.length < 8) {
					errors.password = 'Password must be at least 8 characters';
					return false;
				}
				if (formData.password !== formData.confirmPassword) {
					errors.confirmPassword = 'Passwords do not match';
					return false;
				}
				return true;

			case 2:
				if (!formData.age || formData.age < 13) {
					errors.age = 'You must be at least 13 years old';
					return false;
				}
				return true;

			case 3:
				if (!formData.creature.name) {
					errors.creature = 'Your creature needs a name';
					return false;
				}
				if (formData.creature.name.length < 2) {
					errors.creature = 'Creature name must be at least 2 characters';
					return false;
				}
				for (const [stat, value] of Object.entries(formData.creature.stats)) {
					if (value < 8 || value > 15) {
						errors.creature = `${stat} must be between 8 and 15`;
						return false;
					}
				}
				return true;

			default:
				return false;
		}
	}

	async function handleSubmit(formData: RegistrationData) {
		try {
			errors = {
				email: '',
				username: '',
				password: '',
				confirmPassword: '',
				age: '',
				creature: '',
				background: '',
				general: ''
			};

			const response = await fetch('/api/register', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(formData)
			});

			const data = await response.json();
			console.log('Registration response:', data);
			if (response.ok && data.success) {
				window.location.href = '/dashboard';
			} else {
				// Handle specific errors
				if (data.error?.includes('email')) {
					errors.email = data.error;
				} else if (data.error?.includes('username')) {
					errors.username = data.error;
				} else {
					errors.general = data.error || 'Registration failed';
				}
			}
		} catch (error) {
			console.error('Registration error:', error);
			errors.general = 'An unexpected error occurred. Please try again.';
		}
	}

	function nextStep() {
		if (validateCurrentStep()) {
			if (currentStep === totalSteps) {
				isSubmitting = true;
				handleSubmit(formData).finally(() => {
					isSubmitting = false;
				});
			} else {
				currentStep++;
			}
		}
	}

	function previousStep() {
		if (currentStep > 1) {
			currentStep--;
		}
	}
</script>

<Card class="w-full max-w-lg mx-auto p-6">
	<div class="mb-4">
		<Progress value={completionPercentage} class="w-full" />
		<p class="text-sm text-gray-500 mt-2">Step {currentStep} of {totalSteps}</p>
	</div>

	{#if currentStep === 1}
		<div class="space-y-4">
			<div>
				<Label for="email">Email</Label>
				<Input id="email" type="email" bind:value={formData.email} placeholder="Enter your email" />
				{#if errors.email}
					<p class="text-red-500 text-sm mt-1">{errors.email}</p>
				{/if}
			</div>
			<div>
				<Label for="username">Username</Label>
				<Input
					id="username"
					type="text"
					bind:value={formData.username}
					placeholder="Choose a username"
				/>
				{#if errors.username}
					<p class="text-red-500 text-sm mt-1">{errors.username}</p>
				{/if}
			</div>
			<div>
				<Label for="password">Password</Label>
				<Input
					id="password"
					type="password"
					bind:value={formData.password}
					placeholder="Create a password"
				/>
				<PasswordStrengthIndicator password={formData.password} />
				{#if errors.password}
					<p class="text-red-500 text-sm mt-1">{errors.password}</p>
				{/if}
			</div>
			<div>
				<Label for="confirmPassword">Confirm Password</Label>
				<Input
					id="confirmPassword"
					type="password"
					bind:value={formData.confirmPassword}
					placeholder="Confirm your password"
				/>
				{#if errors.confirmPassword}
					<p class="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
				{/if}
			</div>
		</div>
	{:else if currentStep === 2}
		<div class="space-y-4">
			<div>
				<Label for="age">Age</Label>
				<Input
					id="age"
					type="number"
					bind:value={formData.age}
					min="13"
					placeholder="Enter your age"
				/>
				{#if errors.age}
					<p class="text-red-500 text-sm mt-1">{errors.age}</p>
				{/if}
			</div>
		</div>
	{:else if currentStep === 3}
		<div class="space-y-4">
			<h3 class="text-lg font-semibold">Create Your Creature</h3>
			<div>
				<Label for="creatureName">Creature Name</Label>
				<Input
					id="creatureName"
					type="text"
					bind:value={formData.creature.name}
					placeholder="Name your creature"
				/>
				{#if errors.creature}
					<p class="text-red-500 text-sm mt-1">{errors.creature}</p>
				{/if}
			</div>
			<div class="mt-4">
				<Label>Choose Your Creature's Race</Label>
				<div class="grid grid-cols-3 gap-4 mt-2">
					{#each creatureRaces as creatureRace}
						<button
							type="button"
							class="p-4 border rounded-lg text-center transition-colors
                {formData.creature.race === creatureRace
								? 'border-primary bg-primary/10'
								: 'hover:bg-primary/5'}"
							onclick={() => (formData.creature.race = creatureRace)}
						>
							{@html raceIcons[creatureRace]}
							<span class="capitalize">{creatureRace}</span>
						</button>
					{/each}
				</div>
			</div>
			<div class="mt-4">
				<Label>Choose Your Creature's Class</Label>
				<div class="grid grid-cols-3 gap-4 mt-2">
					{#each creatureClasses as creatureClass}
						<button
							type="button"
							class="p-4 border rounded-lg text-center transition-colors flex flex-col items-center gap-2
              {formData.creature.class === creatureClass
								? 'border-primary bg-primary/10'
								: 'hover:bg-primary/5'}"
							onclick={() => (formData.creature.class = creatureClass)}
						>
							{@html classIcons[creatureClass]}
							<span class="capitalize">{creatureClass}</span>
						</button>
					{/each}
				</div>
			</div>
			<div class="mt-4">
				<Label>Allocate Stats</Label>
				<div class="grid grid-cols-2 gap-4 mt-2">
					{#each Object.entries(formData.creature.stats) as [stat, value]}
						<div class="flex items-center justify-between p-2 border rounded">
							<span class="capitalize">{stat}</span>
							<div class="flex items-center gap-2">
								<Button
									type="button"
									variant="outline"
									size="sm"
									disabled={value <= STAT_MIN}
									on:click={() => modifyStat(stat as keyof CreatureStats, false)}
								>
									-
								</Button>
								<span class="w-8 text-center">{value}</span>
								<Button
									type="button"
									variant="outline"
									size="sm"
									disabled={value >= STAT_MAX || remainingStatPoints <= 0}
									on:click={() => modifyStat(stat as keyof CreatureStats, true)}
								>
									+
								</Button>
							</div>
						</div>
					{/each}
				</div>
			</div>
			{#if raceDefinitions[formData.creature.race]?.backgroundOptions}
				<div class="mt-4">
					<Label>Choose Background</Label>
					<div class="grid gap-4 mt-2">
						{#each raceDefinitions[formData.creature.race].backgroundOptions as background}
							<button
								type="button"
								class="p-4 border rounded-lg text-left transition-colors
                        {formData.creature.background === background.title
									? 'border-primary bg-primary/10'
									: 'hover:bg-primary/5'}"
								onclick={() => (formData.creature.background = background.title)}
							>
								<span class="font-medium">{background.title}</span>
								<p class="text-sm text-muted-foreground mt-1">{background.description}</p>
							</button>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<div class="flex justify-between mt-6">
		<Button variant="outline" on:click={previousStep} disabled={currentStep === 1}>Previous</Button>
		<Button on:click={nextStep} disabled={isSubmitting}>
			{#if isSubmitting}
				<div
					class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
				></div>
				{currentStep === totalSteps ? 'Creating Account...' : 'Processing...'}
			{:else}
				{currentStep === totalSteps ? 'Create Account' : 'Next'}
			{/if}
		</Button>
	</div>
</Card>
