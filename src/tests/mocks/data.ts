// Mock data for testing
import { CreatureClass, CreatureRace } from '$lib/types';

// Generate consistent timestamps for testing
const NOW = new Date();
const TODAY = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate()).toISOString();
const YESTERDAY = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - 1).toISOString();
const TOMORROW = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() + 1).toISOString();
const LAST_WEEK = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - 7).toISOString();

// Mock users
export const mockUsers = {
  standard: {
    id: 'user-1',
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: 'hashed_password_1',
    age: 30,
    createdAt: LAST_WEEK
  },
  premium: {
    id: 'user-2',
    username: 'premiumuser',
    email: 'premium@example.com',
    passwordHash: 'hashed_password_2',
    age: 35,
    createdAt: LAST_WEEK
  }
};

// Mock creatures
export const mockCreatures = {
  elf: {
    id: 'creature-1',
    userId: mockUsers.standard.id,
    name: 'Elrond',
    class: CreatureClass.WIZARD,
    race: CreatureRace.ELF,
    experience: 250,
    level: 3,
    createdAt: LAST_WEEK
  },
  dwarf: {
    id: 'creature-2',
    userId: mockUsers.premium.id,
    name: 'Gimli',
    class: CreatureClass.WARRIOR,
    race: CreatureRace.DWARF,
    experience: 500,
    level: 5,
    createdAt: LAST_WEEK
  }
};

// Mock creature stats
export const mockCreatureStats = {
  elf: {
    id: 'stats-1',
    creatureId: mockCreatures.elf.id,
    strength: 8,
    dexterity: 14,
    constitution: 10,
    intelligence: 16,
    wisdom: 14,
    charisma: 12,
    createdAt: LAST_WEEK,
    updatedAt: LAST_WEEK
  },
  dwarf: {
    id: 'stats-2',
    creatureId: mockCreatures.dwarf.id,
    strength: 16,
    dexterity: 10,
    constitution: 14,
    intelligence: 8,
    wisdom: 10,
    charisma: 8,
    createdAt: LAST_WEEK,
    updatedAt: LAST_WEEK
  }
};

// Mock habit categories
export const mockHabitCategories = {
  health: {
    id: 'category-1',
    userId: mockUsers.standard.id,
    name: 'Health',
    description: 'Health-related habits',
    isDefault: true,
    createdAt: LAST_WEEK
  },
  productivity: {
    id: 'category-2',
    userId: mockUsers.standard.id,
    name: 'Productivity',
    description: 'Work and productivity habits',
    isDefault: false,
    createdAt: LAST_WEEK
  }
};

// Mock habit frequencies
export const mockHabitFrequencies = {
  daily: {
    id: 'frequency-1',
    name: 'daily',
    days: null,
    everyX: null,
    createdAt: LAST_WEEK
  },
  weekly: {
    id: 'frequency-2',
    name: 'weekly',
    days: null,
    everyX: null,
    createdAt: LAST_WEEK
  },
  custom: {
    id: 'frequency-3',
    name: 'custom',
    days: JSON.stringify([1, 3, 5]), // Mon, Wed, Fri
    everyX: null,
    createdAt: LAST_WEEK
  }
};

// Mock habits
export const mockHabits = {
  exercise: {
    id: 'habit-1',
    userId: mockUsers.standard.id,
    categoryId: mockHabitCategories.health.id,
    title: 'Daily Exercise',
    description: '30 minutes of physical activity',
    frequencyId: mockHabitFrequencies.daily.id,
    difficulty: 'medium',
    baseExperience: 10,
    isActive: true,
    isArchived: false,
    startDate: LAST_WEEK,
    endDate: null,
    createdAt: LAST_WEEK,
    updatedAt: LAST_WEEK
  },
  reading: {
    id: 'habit-2',
    userId: mockUsers.standard.id,
    categoryId: mockHabitCategories.productivity.id,
    title: 'Read Books',
    description: 'Read for 20 minutes',
    frequencyId: mockHabitFrequencies.custom.id,
    difficulty: 'easy',
    baseExperience: 5,
    isActive: true,
    isArchived: false,
    startDate: LAST_WEEK,
    endDate: null,
    createdAt: LAST_WEEK,
    updatedAt: LAST_WEEK
  },
  meditation: {
    id: 'habit-3',
    userId: mockUsers.standard.id,
    categoryId: mockHabitCategories.health.id,
    title: 'Meditation',
    description: '10 minutes of mindfulness',
    frequencyId: mockHabitFrequencies.daily.id,
    difficulty: 'easy',
    baseExperience: 5,
    isActive: true,
    isArchived: false,
    startDate: LAST_WEEK,
    endDate: null,
    createdAt: LAST_WEEK,
    updatedAt: LAST_WEEK
  },
  coding: {
    id: 'habit-4',
    userId: mockUsers.standard.id,
    categoryId: mockHabitCategories.productivity.id,
    title: 'Coding Practice',
    description: 'Work on personal projects',
    frequencyId: mockHabitFrequencies.weekly.id,
    difficulty: 'hard',
    baseExperience: 20,
    isActive: true,
    isArchived: false,
    startDate: LAST_WEEK,
    endDate: null,
    createdAt: LAST_WEEK,
    updatedAt: LAST_WEEK
  }
};

// Mock habit streaks
export const mockHabitStreaks = {
  exercise: {
    id: 'streak-1',
    habitId: mockHabits.exercise.id,
    userId: mockUsers.standard.id,
    currentStreak: 5,
    longestStreak: 10,
    lastCompletedAt: YESTERDAY,
    createdAt: LAST_WEEK,
    updatedAt: YESTERDAY
  },
  reading: {
    id: 'streak-2',
    habitId: mockHabits.reading.id,
    userId: mockUsers.standard.id,
    currentStreak: 2,
    longestStreak: 7,
    lastCompletedAt: YESTERDAY,
    createdAt: LAST_WEEK,
    updatedAt: YESTERDAY
  }
};

// Mock habit completions
export const mockHabitCompletions = {
  exercise: [
    {
      id: 'completion-1',
      habitId: mockHabits.exercise.id,
      userId: mockUsers.standard.id,
      completedAt: YESTERDAY,
      value: 1,
      experienceEarned: 10,
      note: 'Went for a run',
      createdAt: YESTERDAY
    },
    {
      id: 'completion-2',
      habitId: mockHabits.exercise.id,
      userId: mockUsers.standard.id,
      completedAt: new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - 2).toISOString(),
      value: 1,
      experienceEarned: 10,
      note: 'Did yoga',
      createdAt: new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - 2).toISOString()
    }
  ],
  reading: [
    {
      id: 'completion-3',
      habitId: mockHabits.reading.id,
      userId: mockUsers.standard.id,
      completedAt: YESTERDAY,
      value: 1,
      experienceEarned: 5,
      note: 'Read a chapter',
      createdAt: YESTERDAY
    }
  ]
};

// Mock sessions
export const mockSessions = {
  standard: {
    id: 'session-1',
    userId: mockUsers.standard.id,
    expiresAt: TOMORROW
  }
};

// Helper function to get a deep copy of mock data to prevent test pollution
export function getMockData<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}
