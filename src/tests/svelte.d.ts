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

// Server module declarations
declare module '$lib/server/streaks/calculations' {
  export interface StreakStatus {
    streakMaintained: boolean;
    daysInStreak: number;
    streakWeeks?: number;
  }
  
  export interface StreakUpdateResult {
    currentStreak: number;
    longestStreak: number;
    lastCompletedAt: string;
  }
  
  export function determineStreakStatus(
    habitData: { id: string; userId: string; frequencyId: string },
    currentDate: Date
  ): Promise<StreakStatus>;
  
  export function updateStreakAfterCompletion(
    habitId: string,
    userId: string
  ): Promise<StreakUpdateResult>;
}

declare module '$lib/utils/dailyHabitProgress' {
  interface Habit {
    id: string;
    completedToday: boolean;
  }
  
  interface DailyProgressStats {
    total: number;
    completed: number;
    percentage: number;
  }
  
  export function calculateDailyProgress(habits: Habit[] | undefined): DailyProgressStats;
}

declare module '$lib/server/db' {
  type MockFunction<T = any> = T & {
    mockReturnThis: () => MockFunction<T>;
    mockImplementation: (fn: (...args: any[]) => any) => MockFunction<T>;
    mockImplementationOnce: (fn: (...args: any[]) => any) => MockFunction<T>;
    mockReturnValue: (value: any) => MockFunction<T>;
  };

  type MockDB = {
    select: MockFunction<() => MockDB>;
    from: MockFunction<(table: any) => MockDB>;
    where: MockFunction<(condition: any) => MockDB>;
    orderBy: MockFunction<(field: any) => MockDB>;
    limit: MockFunction<(num: number) => MockDB>;
    update: MockFunction<(table: any) => MockDB>;
    set: MockFunction<(data: any) => MockDB>;
    execute: MockFunction<() => any[]>;
  };

  export const db: MockDB;
}
