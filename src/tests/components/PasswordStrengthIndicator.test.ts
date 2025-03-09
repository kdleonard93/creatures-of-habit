import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import PasswordStrengthIndicator from '$lib/components/PasswordStrengthIndicator.svelte';

describe('PasswordStrengthIndicator Component', () => {
  it('renders correctly with empty password', () => {
    const { container } = render(PasswordStrengthIndicator, { props: { password: '' } });
    expect(container).toMatchSnapshot();
  });

  it('renders correctly with weak password', () => {
    const { container } = render(PasswordStrengthIndicator, { props: { password: 'pass' } });
    expect(container).toMatchSnapshot();
  });

  it('renders correctly with strong password', () => {
    const { container } = render(PasswordStrengthIndicator, { 
      props: { password: 'StrongP@ss123!' } 
    });
    expect(container).toMatchSnapshot();
  });
});