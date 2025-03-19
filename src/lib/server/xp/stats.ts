import type { CreatureStats } from '$lib/types';

export const STAT_MIN = 8;
export const STAT_MAX = 15;
export const INITIAL_STAT_POINTS = 27;

export function createInitialStats(): CreatureStats {
  return {
    strength: 8,
    dexterity: 8,
    constitution: 8,
    intelligence: 8,
    wisdom: 8,
    charisma: 8
  };
}

export function calculateStatCost(currentValue: number): number {
  if (currentValue <= 13) return currentValue - 8;
  if (currentValue === 14) return 5;
  if (currentValue === 15) return 7;
  return 0;
}

export function allocateStatPoints(
  currentStats: CreatureStats, 
  statToModify: keyof CreatureStats, 
  increment: boolean
): { stats: CreatureStats; remainingPoints: number } {
  const newStats = {...currentStats};
  let remainingPoints = INITIAL_STAT_POINTS;

  // Calculate current total point cost
  Object.values(currentStats).forEach((value) => {
    remainingPoints -= calculateStatCost(value);
  });

  const currentValue = newStats[statToModify];
  const costOfChange = calculateStatCost(increment ? currentValue + 1 : currentValue - 1);
  const costDifference = increment ? costOfChange : -calculateStatCost(currentValue);

  if (
    increment && currentValue < STAT_MAX && 
    remainingPoints >= costOfChange
  ) {
    newStats[statToModify]++;
    remainingPoints -= costOfChange;
  }

  if (
    !increment && currentValue > STAT_MIN && 
    remainingPoints + costDifference >= 0
  ) {
    newStats[statToModify]--;
    remainingPoints += costDifference;
  }

  return { stats: newStats, remainingPoints };
}

export function calculateStatModifier(statValue: number): number {
  return Math.floor((statValue - 10) / 2);
}

export function getTotalStatPoints(stats: CreatureStats): number {
  return Object.values(stats).reduce((total, value) => {
    return total + calculateStatCost(value);
  }, 0);
}