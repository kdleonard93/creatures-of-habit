import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import RaceInfoCard from '$lib/components/character/RaceInfoCard.svelte';
import { CreatureRace } from '$lib/types';

// Mock the raceDefinitions module
vi.mock('$lib/data/races', () => {
  return {
    raceDefinitions: {
      human: {
        name: 'Human',
        description: 'Versatile and adaptable',
        statBonuses: { strength: 1, constitution: 1 },
        abilities: [
          { name: 'Adaptability', description: 'Can adapt to various situations' }
        ],
        backgroundOptions: [
          { title: 'Urban', description: 'Grew up in a city' }
        ]
      }
    }
  };
});

// Mock the raceIcons module
vi.mock('$lib/assets/raceIcons', () => {
  return {
    raceIcons: {
      human: '<svg></svg>'
    }
  };
});

describe('RaceInfoCard Component', () => {
  it('renders correctly with human race', () => {
    const { container } = render(RaceInfoCard, { 
      props: { selectedRace: CreatureRace.HUMAN }
    });
    
    expect(container).toMatchSnapshot();
  });
});