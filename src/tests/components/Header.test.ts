import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import Header from '$lib/components/Header.svelte';

// Mock the $app/stores module
vi.mock('$app/stores', () => {
  return {
    page: {
      subscribe: vi.fn((fn) => {
        fn({ url: { pathname: '/' } });
        return () => {};
      })
    }
  };
});

describe('Header Component', () => {
  it('renders correctly', () => {
    const { container } = render(Header);
    expect(container).toMatchSnapshot();
  });
});