# Test Driven Development (TDD) Workflow Guide

This guide outlines the TDD workflow for the Creatures of Habit project. Following these steps will help ensure code quality, catch issues early, and provide better documentation for your components and features.

## The TDD Cycle

1. **Write a Test**: Start by writing a test that defines how your code should work
2. **Run the Test (It Should Fail)**: Verify the test fails as expected
3. **Write the Minimum Code**: Implement just enough code to make the test pass
4. **Run the Test (It Should Pass)**: Verify the test now passes
5. **Refactor**: Clean up your code while keeping tests passing
6. **Repeat**: Continue the cycle for additional features or edge cases

## When to Use Each Template

- **UIComponentTest**: Use for Svelte components with UI elements
- **APIEndpointTest**: Use for API endpoints and server routes
- **UtilityTest**: Use for utility functions and helpers

## Example TDD Workflow for a New Component

### 1. Start with the Test

```typescript
// src/tests/client/DailyProgressSummary.test.ts
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import DailyProgressSummary from '$lib/components/dashboard/DailyProgressSummary.svelte';

describe('DailyProgressSummary', () => {
  it('calculates completion percentage correctly', () => {
    const habits = [
      { id: '1', completedToday: true },
      { id: '2', completedToday: false },
      { id: '3', completedToday: true }
    ];
    
    const { getByText } = render(DailyProgressSummary, { props: { habits } });
    expect(getByText('67%')).toBeInTheDocument();
    expect(getByText('(2/3)')).toBeInTheDocument();
  });
  
  it('handles empty habits array', () => {
    const { getByText } = render(DailyProgressSummary, { props: { habits: [] } });
    expect(getByText('0%')).toBeInTheDocument();
    expect(getByText('(0/0)')).toBeInTheDocument();
  });
});
```

### 2. Run the Test (It Should Fail)

```bash
pnpm run test DailyProgressSummary
```

The test will fail because the component doesn't exist yet.

### 3. Create the Component with Minimum Code

```svelte
<!-- src/lib/components/dashboard/DailyProgressSummary.svelte -->
<script lang="ts">
  export let habits: { id: string, completedToday: boolean }[] = [];
  
  $: totalHabits = habits.length;
  $: completedHabits = habits.filter(h => h.completedToday).length;
  $: completionPercentage = totalHabits > 0 
    ? Math.round((completedHabits / totalHabits) * 100) 
    : 0;
</script>

<div class="bg-card p-3 rounded-lg border shadow-sm flex flex-col items-center">
  <p class="text-sm font-medium mb-1">Today's Progress</p>
  <div class="flex items-center gap-2">
    <div class="text-2xl font-bold">{completionPercentage}%</div>
    <div class="text-muted-foreground text-sm">({completedHabits}/{totalHabits})</div>
  </div>
</div>
```

### 4. Run the Test Again (It Should Pass)

```bash
pnpm run test DailyProgressSummary
```

The test should now pass.

### 5. Refactor if Needed

Improve the component while keeping tests passing:

```svelte
<!-- Refactored version with better styling and accessibility -->
<script lang="ts">
  export let habits: { id: string, completedToday: boolean }[] = [];
  
  $: totalHabits = habits.length;
  $: completedHabits = habits.filter(h => h.completedToday).length;
  $: completionPercentage = totalHabits > 0 
    ? Math.round((completedHabits / totalHabits) * 100) 
    : 0;
</script>

<div class="bg-card p-3 rounded-lg border shadow-sm flex flex-col items-center" 
     aria-label="Daily habit progress summary">
  <p class="text-sm font-medium mb-1">Today's Progress</p>
  <div class="flex items-center gap-2">
    <div class="text-2xl font-bold" aria-label="Completion percentage">{completionPercentage}%</div>
    <div class="text-muted-foreground text-sm" aria-label="Habits completed">
      ({completedHabits}/{totalHabits})
    </div>
  </div>
</div>
```

### 6. Add More Tests for Edge Cases

```typescript
it('handles non-integer percentages', () => {
  const habits = [
    { id: '1', completedToday: true },
    { id: '2', completedToday: false },
    { id: '3', completedToday: false }
  ];
  
  const { getByText } = render(DailyProgressSummary, { props: { habits } });
  expect(getByText('33%')).toBeInTheDocument();
});
```

## Tips for Effective TDD

1. **Start Simple**: Begin with the simplest test case that could possibly fail
2. **Small Steps**: Make incremental changes and run tests frequently
3. **Test Behavior, Not Implementation**: Focus on what the code should do, not how it does it
4. **Descriptive Test Names**: Use clear, descriptive names for your tests
5. **Arrange-Act-Assert**: Structure your tests with setup, action, and verification phases
6. **Don't Test Framework Code**: Focus on testing your business logic, not framework features
7. **Keep Tests Fast**: Slow tests discourage frequent testing
8. **Independent Tests**: Tests should not depend on each other or run in a specific order

## Common Testing Patterns

### Testing Reactive Variables in Svelte

```typescript
it('updates when reactive variables change', async () => {
  const { component, getByText } = render(MyComponent, { props: { count: 1 } });
  expect(getByText('Count: 1')).toBeInTheDocument();
  
  await component.$set({ count: 2 });
  expect(getByText('Count: 2')).toBeInTheDocument();
});
```

### Testing User Interactions

```typescript
it('increments counter when button is clicked', async () => {
  const { getByText, getByRole } = render(Counter);
  const button = getByRole('button', { name: 'Increment' });
  
  expect(getByText('Count: 0')).toBeInTheDocument();
  await fireEvent.click(button);
  expect(getByText('Count: 1')).toBeInTheDocument();
});
```

### Testing Async Operations

```typescript
it('loads data asynchronously', async () => {
  // Mock fetch response
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data: 'test data' })
  });
  
  const { findByText } = render(AsyncComponent);
  
  // Initially shows loading state
  expect(screen.getByText('Loading...')).toBeInTheDocument();
  
  // Eventually shows the loaded data
  expect(await findByText('test data')).toBeInTheDocument();
});
```

## Additional Resources

- [Vitest Documentation](https://vitest.dev/guide/)
- [Testing Library for Svelte](https://testing-library.com/docs/svelte-testing-library/intro)
- [Kent C. Dodds - Write tests. Not too many. Mostly integration.](https://kentcdodds.com/blog/write-tests)
