// General declaration for all Svelte files
declare module '*.svelte' {
  import type { ComponentType } from 'svelte';
  const component: ComponentType<any>;
  export default component;
}

// Specific declaration for the component causing the error
declare module '$lib/components/dashboard/DailyProgressSummary.svelte' {
  import type { ComponentType } from 'svelte';
  const component: ComponentType<any>;
  export default component;
}

// Add other specific component paths as needed
declare module '$lib/components/habits/HabitForm.svelte' {
  import type { ComponentType } from 'svelte';
  const component: ComponentType<any>;
  export default component;
}
