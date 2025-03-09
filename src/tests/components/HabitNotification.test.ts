import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import HabitNotification from '$lib/components/habits/HabitNotification.svelte';


describe('HabitNotification Component', () => {
  it('renders correctly with in-app type', () => {
    const mockNotification = {
      id: 'test-1',
      message: 'Test notification',
      type: 'in-app',
      timestamp: new Date('2025-01-01T12:00:00Z')
    };
    
    const { container } = render(HabitNotification, { 
      props: { 
        notification: mockNotification,
        onDismiss: vi.fn()
      } 
    });
    
    expect(container).toMatchSnapshot();
  });
  
  it('renders correctly with email type', () => {
    const mockNotification = {
      id: 'test-2',
      message: 'Email notification',
      type: 'email',
      timestamp: new Date('2025-01-01T12:00:00Z')
    };
    
    const { container } = render(HabitNotification, { 
      props: { 
        notification: mockNotification,
        onDismiss: vi.fn()
      } 
    });
    
    expect(container).toMatchSnapshot();
  });
});