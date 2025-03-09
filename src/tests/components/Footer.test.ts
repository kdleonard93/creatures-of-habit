import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import Footer from '$lib/components/Footer.svelte';

describe('Footer Component', () => {
  it('renders correctly', () => {
    const { container } = render(Footer);
    expect(container).toMatchSnapshot();
  });
});