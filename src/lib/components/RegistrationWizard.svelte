<script lang="ts">
  import Button from "$lib/components/ui/button/button.svelte";
  import Card from "$lib/components/ui/card/card.svelte";
  import Input from "$lib/components/ui/input/input.svelte";
  import Progress from "$lib/components/ui/progress/progress.svelte";
  import Label from "$lib/components/ui/label/label.svelte";
  import { CreatureClass, CreatureRace } from "$lib/types";
  import type { RegistrationData, CreatureStats } from "$lib/types";
  import { raceDefinitions } from "$lib/data/races";
  import { classIcons } from "$lib/assets/classIcons";
  import { raceIcons } from "$lib/assets/raceIcons";
  import PasswordStrengthIndicator from "$lib/components/PasswordStrengthIndicator.svelte";
  import {
    allocateStatPoints,
    INITIAL_STAT_POINTS,
    STAT_MIN,
    STAT_MAX,
    calculateStatCost,
  } from "$lib/client/xp";
  import { toast } from "svelte-sonner";

  const { onComplete } = $props<{
    onComplete: (data: RegistrationData) => void;
  }>();

  // State management with runes
  let currentStep = $state(1);
  let isSubmitting = $state(false);
  const totalSteps = 3;
  let statsWarning = $state("");
  let isCheckingEmail = $state(false);
  let isCheckingUsername = $state(false);
  let isCheckingCreatureName = $state(false);
  let emailAvailable = $state<boolean | null>(null);
  let usernameAvailable = $state<boolean | null>(null);
  let creatureAvailable = $state<boolean | null>(null);

  let formData = $state<RegistrationData>({
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
    age: 0,
    creature: {
      name: "",
      class: CreatureClass.WARRIOR,
      race: CreatureRace.HUMAN,
      stats: {
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
      },
      background: undefined,
    },
    general: "",
  });

  // Calculate initial remaining stat points based on current stats
  // Use the same calculation as allocateStatPoints for consistency
  let remainingStatPoints = $derived(
    INITIAL_STAT_POINTS - 
    (formData.creature.stats.strength - STAT_MIN) -
    (formData.creature.stats.dexterity - STAT_MIN) -
    (formData.creature.stats.constitution - STAT_MIN) -
    (formData.creature.stats.intelligence - STAT_MIN) -
    (formData.creature.stats.wisdom - STAT_MIN) -
    (formData.creature.stats.charisma - STAT_MIN)
  );

  // Update the stat modification function
  function modifyStat(stat: keyof CreatureStats, increment: boolean): void {
    const result = allocateStatPoints(formData.creature.stats, stat, increment);
    formData.creature.stats = result.stats;
    remainingStatPoints = result.remainingPoints;
    if (remainingStatPoints === 0) {
      statsWarning = "";
    }
  }

  let errors = $state({
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
    age: "",
    creature: "",
    background: "",
    general: "",
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
    CreatureClass.ENGINEER,
  ] as const;

  const creatureRaces = [
    CreatureRace.HUMAN,
    CreatureRace.ORC,
    CreatureRace.ELF,
    CreatureRace.DWARF,
  ];

  function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  function validateCurrentStep(): boolean {
    // Reset errors
    errors = {
      email: "",
      username: "",
      password: "",
      confirmPassword: "",
      age: "",
      creature: "",
      background: "",
      general: "",
    };

    switch (currentStep) {
      case 1:
        // Check if validation is still in progress
        if (isCheckingEmail || isCheckingUsername) {
          errors.general = "Please wait for validation to complete";
          return false;
        }
        
        if (!validateEmail(formData.email)) {
          errors.email = "Please enter a valid email address";
          return false;
        }
        
        // If email validation has been performed and failed, prevent proceeding
        if (emailAvailable === false) {
          errors.email = "👎 This email is already registered. Please use a different email or try logging in.";
          return false;
        }
        
        // If email validation hasn't been performed yet, prevent proceeding
        if (formData.email && emailAvailable === null) {
          errors.email = "👎 Email is unavailable.";
          return false;
        }
        
        if (formData.username.length < 3) {
          errors.username = "Username must be at least 3 characters";
          return false;
        }
        
        // If username validation has been performed and failed, prevent proceeding
        if (usernameAvailable === false) {
          errors.username = "👎 This username is already taken. Please choose a different username.";
          return false;
        }
        
        // If username validation hasn't been performed yet, prevent proceeding
        if (formData.username.length >= 3 && usernameAvailable === null) {
          errors.username = "👎 Username is unavailable.";
          return false;
        }
        
        if (formData.password.length < 8) {
          errors.password = "Password must be at least 8 characters";
          return false;
        }
        
        if (formData.password !== formData.confirmPassword) {
          errors.confirmPassword = "Passwords do not match";
          return false;
        }
        
        return true;

      case 2:
        if (!formData.age || formData.age < 13) {
          errors.age = "You must be at least 13 years old";
          return false;
        }
        return true;

      case 3:
        if (!formData.creature.name) {
          errors.creature = "Your creature needs a name";
          return false;
        }
        if (formData.creature.name.length < 2) {
          errors.creature = "Creature name must be at least 2 characters";
          return false;
        }
        for (const [stat, value] of Object.entries(formData.creature.stats)) {
          if (value < 8 || value > 15) {
            errors.creature = `${stat} must be between 8 and 15`;
            return false;
          }
        }
        if (remainingStatPoints > 0) {
          // Set a warning flag instead of returning false
          statsWarning = `You have ${remainingStatPoints} unused stat points. Are you sure you want to continue?`;
        } else {
          statsWarning = "";
        }
        return true;

      default:
        return false;
    }
  }

  async function handleSubmit(formData: RegistrationData) {
    try {
      errors = {
        email: "",
        username: "",
        password: "",
        confirmPassword: "",
        age: "",
        creature: "",
        background: "",
        general: "",
      };

      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      console.info("Registration response:", data);
      
      if (response.ok && data.success) {
        toast.success('Account created successfully!', { duration: 4000 });
        window.location.href = "/dashboard";
        return;
      }
      
      // Handle specific errors - use lowercase for more robust matching
      if (data.error) {
        if (data.error.toLowerCase().includes("email already exists") || 
            data.error.toLowerCase().includes("email in use") ||
            data.error.toLowerCase().includes("email already registered")) {
          errors.email = "👎 This email is already registered. Please use a different email or try logging in.";
          toast.error('Email already registered', { duration: 4000 });
        } 
        else if (data.error.toLowerCase().includes("username already taken") || 
                data.error.toLowerCase().includes("username exists") ||
                data.error.toLowerCase().includes("username is taken")) {
          errors.username = "👎 This username is already taken. Please choose a different username.";
          toast.error('Username already taken', { duration: 4000 });
          
          // If the server provides suggestions, display them
          if (data.suggestions && data.suggestions.length > 0) {
            errors.username += ` Some available options: ${data.suggestions.slice(0, 3).join(", ")}`;
          }
        } 
        else {
          errors.general = data.error || "Registration failed";
          toast.error('Registration failed: ' + data.error, { duration: 4000 });
        }
      } else {
        errors.general = "Registration failed";
        toast.error('Registration failed', { duration: 4000 });
      }
    } catch (error) {
      console.error("Registration error:", error);
      errors.general = "An unexpected error occurred. Please try again.";
      toast.error('An unexpected error occurred. Please try again.', { duration: 4000 });
    }
  }

  async function checkEmailAvailability() {
    if (!formData.email || !validateEmail(formData.email)) {
      errors.email = formData.email ? "Please enter a valid email address" : "";
      emailAvailable = null;
      return;
    }
    
    isCheckingEmail = true;
    errors.email = ""; 
    emailAvailable = null;
    
    try {
      const response = await fetch(`/api/validate?type=email&value=${encodeURIComponent(formData.email)}`);
      if (!response.ok) {
        throw new Error("API request failed");
      }
      
      const data = await response.json();
      
      if (!data.available) {
        errors.email = '👎 This email is already registered. Please use a different email or try logging in.';
        emailAvailable = false;
      } else {
        errors.email = ''; 
        emailAvailable = true;
      }
    } catch (error) {
      console.error('Error checking email:', error);
      errors.email = 'Error checking email availability';
      emailAvailable = false;
    } finally {
      isCheckingEmail = false;
    }
  }

  async function checkUsernameAvailability() {
    if (!formData.username || formData.username.length < 3) {
      errors.username = formData.username ? "Username must be at least 3 characters" : "";
      usernameAvailable = null;
      return;
    }
    
    isCheckingUsername = true;
    errors.username = ""; 
    usernameAvailable = null;
    
    try {
      const response = await fetch(`/api/validate?type=username&value=${encodeURIComponent(formData.username)}`);
      if (!response.ok) {
        throw new Error("API request failed");
      }
      
      const data = await response.json();
      
      if (!data.available) {
        errors.username = '👎 This username is already taken. Please choose a different username.';
        usernameAvailable = false;
      } else {
        errors.username = '';
        usernameAvailable = true;
      }
    } catch (error) {
      console.error('Error checking username:', error);
      errors.username = 'Error checking username availability';
      usernameAvailable = false;
    } finally {
      isCheckingUsername = false;
    }
  }

  async function checkCreatureNameAvailability() {
    if (!formData.creature.name || formData.creature.name.length < 2) {
      errors.creature = formData.creature.name ? "Creature name must be at least 2 characters" : "";
      return;
    }
    
    isCheckingCreatureName = true;
    errors.creature = "";
    
    try {
      const response = await fetch(`/api/validate?type=creature_name&value=${encodeURIComponent(formData.creature.name)}`);
      if (!response.ok) {
        throw new Error("API request failed");
      }
      
      const data = await response.json();
      
      if (!data.available) {
        errors.creature = '👎 This creature name is already taken. Please choose a different name.';
        creatureAvailable = false;
      } else {
        errors.creature = '';
        creatureAvailable = true;
      }
    } catch (error) {
      console.error('Error checking creature name:', error);
      errors.creature = 'Error checking creature name availability';
      creatureAvailable = false;
    } finally {
      isCheckingCreatureName = false;
    }
  }

  function nextStep() {
    if (validateCurrentStep()) {
      if (currentStep === totalSteps) {
        if (statsWarning) {
            return; 
        }
        isSubmitting = true;
        handleSubmit(formData).finally(() => {
          isSubmitting = false;
        });
      } else if (currentStep < totalSteps) {
        currentStep++;
      }
    } else if (currentStep === 1 && (isCheckingEmail || isCheckingUsername)) {
      // If we're on step 1 and validation is in progress, show a toast
      toast.error('Please wait for validation to complete', { duration: 2000 });
    } else if (currentStep === 1 && (emailAvailable === null || usernameAvailable === null)) {
      // If validation hasn't been performed, show a toast
      toast.error('Please verify email and username availability', { duration: 2000 });
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
          on:blur={checkEmailAvailability}
          placeholder="Enter your email"
          class={errors.email ? "border-red-500" : emailAvailable === true ? "border-green-500" : ""}
        />
        {#if isCheckingEmail}
          <p class="text-gray-500 text-sm mt-1">
            <span class="inline-block animate-pulse">Checking availability ⟳</span>
          </p>
        {:else if errors.email}
          <p class="text-red-500 text-sm mt-1">{errors.email}</p>
        {:else if emailAvailable === true}
          <p class="text-green-500 text-sm mt-1">👍 Email is available!</p>
        {/if}
      </div>
      <div>
        <Label for="username">Username</Label>
        <Input
          id="username"
          type="text"
          bind:value={formData.username}
          on:blur={checkUsernameAvailability}
          placeholder="Choose a username"
          class={errors.username ? "border-red-500" : usernameAvailable === true ? "border-green-500" : ""}
        />
        {#if isCheckingUsername}
          <p class="text-gray-500 text-sm mt-1">
            <span class="inline-block animate-pulse">Checking availability ⟳</span>
          </p>
        {:else if errors.username}
          <p class="text-red-500 text-sm mt-1">{errors.username}</p>
        {:else if usernameAvailable === true}
          <p class="text-green-500 text-sm mt-1">👍 Username is available!</p>
        {/if}
      </div>
      <div>
        <Label for="password">Password</Label>
        <Input
          id="password"
          type="password"
          bind:value={formData.password}
          placeholder="Create a password"
          class={errors.password ? "border-red-500" : ""}
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
          class={errors.confirmPassword ? "border-red-500" : ""}
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
          class={errors.age ? "border-red-500" : ""}
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
          on:blur={checkCreatureNameAvailability}
          placeholder="Name your creature"
          class={errors.creature ? "border-red-500" : ""}
        />
        {#if isCheckingCreatureName}
          <p class="text-gray-500 text-sm mt-1">
            <span class="inline-block animate-pulse">Checking availability ⟳</span>
          </p>
        {:else if errors.creature}
          <p class="text-red-500 text-sm mt-1">{errors.creature}</p>
        {/if}
      </div>
      <div class="mt-4">
        <Label>Choose Your Creature's Race</Label>
        <div class="grid grid-cols-3 gap-4 mt-2">
          {#each creatureRaces as creatureRace}
            <button
              type="button"
              class="p-4 border rounded-lg text-center transition-colors flex flex-col items-center gap-2
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
        {#if statsWarning}
        <div class="text-secondary">
          <div class="mb-4 p-3 bg-primary-100 border border-primary-300 rounded-md text-primary-800">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 inline mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg> 
            {statsWarning}
          </div>
        </div>
        {/if}
        <div class="flex justify-between items-center mb-2">
          <span>Remaining Points:</span>
          <span class={remainingStatPoints > 0 ? 'font-bold text-primary-600' : 'font-bold text-green-600'}>
            {remainingStatPoints}
          </span>
        </div>
        <div class="grid grid-cols-2 gap-4 mt-2">
          {#each Object.entries(formData.creature.stats) as [stat, value]}
            <div class="flex items-center justify-between p-2 border rounded">
              <div class="flex flex-col">
                <span class="capitalize">{stat}</span>
                <span class="text-xs text-gray-500">
                  Cost: {calculateStatCost(value)}
                </span>
              </div>
              <div class="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={value <= STAT_MIN}
                  on:click={() =>
                    modifyStat(stat as keyof CreatureStats, false)}
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
                onclick={() =>
                  (formData.creature.background = background.title)}
              >
                <span class="font-medium">{background.title}</span>
                <p class="text-sm text-muted-foreground mt-1">
                  {background.description}
                </p>
              </button>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}

  <div class="flex justify-between mt-6">
    <Button
      variant="outline"
      on:click={previousStep}
      disabled={currentStep === 1}>Previous</Button
    >
    <Button on:click={nextStep} disabled={isSubmitting}>
      {#if isSubmitting}
        <div
          class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        ></div>
        {currentStep === totalSteps ? "Creating Account..." : "Processing..."}
      {:else}
        {currentStep === totalSteps ? "Create Account" : "Next"}
      {/if}
    </Button>
  </div>
</Card>
