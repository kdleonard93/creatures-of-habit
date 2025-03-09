import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import HabitForm from '$lib/components/habits/HabitForm.svelte';

describe('HabitForm Component', () => {
  it('renders correctly for new habit creation', () => {
    const mockCategories = [
      { id: 'cat1', name: 'Health' },
      { id: 'cat2', name: 'Career' }
    ];
    
    const { container } = render(HabitForm, { 
      props: { 
        onSubmit: vi.fn(),
        categories: mockCategories
      } 
    });
    
    expect(container).toMatchSnapshot();
  });
  
  it('renders correctly for editing existing habit', () => {
    const mockCategories = [
      { id: 'cat1', name: 'Health' },
      { id: 'cat2', name: 'Career' }
    ];
    
    const existingHabit = {
      title: 'Existing Habit',
      description: 'Description of existing habit',
      frequency: 'daily',
      difficulty: 'medium',
      startDate: '2025-01-01',
      categoryId: 'cat1',
      customFrequency: {
        days: []
      }
    };
    
    const { container } = render(HabitForm, { 
      props: { 
        onSubmit: vi.fn(),
        initialData: existingHabit,
        categories: mockCategories
      } 
    });
    
    expect(container).toMatchSnapshot();
  });
});