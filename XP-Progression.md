# XP Progression System

This document explains how experience (XP) and leveling work in Creatures of Habit.

## Goals

- **Smooth progression**: Each level requires more XP than the previous one, with no plateaus.
- **Simple formula**: One clear function that is easy to reason about and test.
- **Symmetric server/client logic**: Same XP math on server and client.

## Core Formula

We model total XP required to reach a given level with a polynomial curve:

```ts
const BASE_XP = 25;
const GROWTH_EXPONENT = 1.8;

// Total XP required to REACH a given level (level >= 1)
function getXpRequiredForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(BASE_XP * (level - 1) ** GROWTH_EXPONENT);
}
```

- `BASE_XP` controls the overall scale.
- `GROWTH_EXPONENT` controls how sharply XP requirements increase.
- We use `level - 1` so that level 1 always starts at 0 XP.

This formula is implemented in both:

- `src/lib/server/xp/calculations.ts`
- `src/lib/client/xp/calculations.ts`

## Sample Progression

Below are selected levels using the formula `25 * (level - 1)^1.8` (floored):

| Level | Total XP | XP Gap from Previous |
|-------|----------|----------------------|
| 1     | 0        | -                    |
| 2     | 25       | 25                   |
| 3     | 87       | 62                   |
| 4     | 180      | 93                   |
| 5     | 303      | 123                  |
| 10    | 1,304    | 249                  |
| 15    | 2,890    | 361                  |
| 20    | 5,008    | 465                  |
| 30    | 10,721   | 656                  |
| 50    | 27,560   | 1,004                |

Observations:

- XP gaps between levels **increase** as level rises (no flat 50 XP plateaus).
- Early levels are relatively quick to earn.
- Mid and late game become meaningfully harder but not absurd.

## Helper Functions

All helpers live alongside the formula in `src/lib/server/xp/calculations.ts` and `src/lib/client/xp/calculations.ts`.

### `getXpRequiredForLevel(level)`

- Returns **total XP required to reach** a given level.
- Level 1 always returns `0`.

### `getXpForLevelUp(level)`

```ts
function getXpForLevelUp(level: number): number {
  return getXpRequiredForLevel(level + 1) - getXpRequiredForLevel(level);
}
```

- Returns the **XP gap** between `level` and `level + 1`.
- Used in tests to verify that gaps are always positive and generally increasing.

### `getLevelFromXp(xp)`

```ts
function getLevelFromXp(xp: number): number {
  if (xp < 0) return 1;

  let level = 1;
  while (getXpRequiredForLevel(level + 1) <= xp) {
    level++;
  }

  return level;
}
```

- Maps a total XP value back to the current level.
- Uses the same threshold function as `getXpRequiredForLevel` to stay consistent.

### `getLevelProgress(xp)`

Used for UI progress bars:

```ts
function getLevelProgress(xp: number) {
  const currentLevel = getLevelFromXp(xp);
  const currentLevelXp = getXpRequiredForLevel(currentLevel);
  const nextLevelXp = getXpRequiredForLevel(currentLevel + 1);
  const xpProgress = xp - currentLevelXp;
  const progressPercentage = Math.min(
    100,
    Math.floor((xpProgress / (nextLevelXp - currentLevelXp)) * 100)
  );

  return {
    currentLevel,
    currentLevelXp,
    nextLevelXp,
    xpProgress,
    progressPercentage
  };
}
```

The `XPBar` component displays:

- `currentLevel`
- `xpProgress`
- `nextLevelXp - currentLevelXp` (XP needed for the next level)
- `progressPercentage` for the visual bar.

## Testing Strategy

XP logic is covered by `src/tests/utils/calculations.test.ts`.

Tests verify:

- **Threshold values** at early/mid/late levels:
  - Level 2, 3, 4, 5
  - Level 10, 15, 20
  - Level 30, 50
- **Monotonic gaps**:
  - XP gaps between levels are positive and generally increasing.
- **Level mapping**:
  - `getLevelFromXp` returns expected levels for boundary and mid-range XP values.
- **Progress calculation**:
  - `getLevelProgress` returns consistent `currentLevel`, `currentLevelXp`, `nextLevelXp`, and `progressPercentage`.
- **Habit XP rewards**:
  - `calculateHabitXp` respects difficulty, streaks, and bonus multipliers.

To run just these tests:

```bash
pnpm test -- src/tests/utils/calculations.test.ts
```

## Migration Notes

If XP formulas change again in the future:

- Keep server and client formulas in sync.
- Update this document with the new progression table.
- Update `calculations.test.ts` to match new expected thresholds.
- Consider whether existing user XP should be remapped or if level shifts are acceptable.
