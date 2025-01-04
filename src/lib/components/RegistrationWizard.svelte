<script lang="ts">
  import Button from "$lib/components/ui/button/button.svelte";
  import Card from "$lib/components/ui/card/card.svelte";
  import Input from "$lib/components/ui/input/input.svelte";
  import Progress from "$lib/components/ui/progress/progress.svelte";
  import Label from "$lib/components/ui/label/label.svelte";
  import { CreatureClass, CreatureRace } from '$lib/types';
  import type { CreatureRaceType, CreatureClassType } from "$lib/types";
  import { goto } from '$app/navigation';
  import { classIcons } from '$lib/assets/classIcons';

  const { onComplete } = $props<{
        onComplete: (data: RegistrationData) => void;
    }>();

  // State management with runes
  let currentStep = $state(1);
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
      race: CreatureRace.HUMAN
    },
    general: ''
  });

  let errors = $state({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    age: '',
    creature: '',
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

  export interface RegistrationData {
    email: string;
    username: string;
    password: string;
    confirmPassword: string;
    age: number;
    creature: {
      name: string;
      class: CreatureClassType;
      race: CreatureRaceType;
    };
    general: string;
  }

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
      general: ''
    };

    switch(currentStep) {
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
        general: ''
      };

      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });
    
      const data = await response.json();
      if (data.success) {
        await goto('/dashboard');
      } else {
        // Handle specific errors
        if (data.error.includes('email')) {
          errors.email = data.error;
        } else if (data.error.includes('username')) {
          errors.username = data.error;
        } else {
          errors.general = data.error;
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
        handleSubmit(formData);
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
        <Input 
          id="email"
          type="email" 
          bind:value={formData.email} 
          placeholder="Enter your email"
        />
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
                {formData.creature.race === creatureRace ? 
                  'border-primary bg-primary/10' : 
                  'hover:bg-primary/5'}"
              onclick={() => formData.creature.race = creatureRace}
            >
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
              {formData.creature.class === creatureClass ? 
                'border-primary bg-primary/10' : 
                'hover:bg-primary/5'}"
            onclick={() => formData.creature.class = creatureClass}
          >
            {@html classIcons[creatureClass]}
            <span class="capitalize">{creatureClass}</span>
          </button>
        {/each}
        </div>
      </div>
    </div>
  {/if}

  <div class="flex justify-between mt-6">
    <Button 
      variant="outline" 
      on:click={previousStep}
      disabled={currentStep === 1}
    >
      Previous
    </Button>
    <Button 
      on:click={nextStep}
    >
      {currentStep === totalSteps ? 'Create Account' : 'Next'}
    </Button>
  </div>
</Card>