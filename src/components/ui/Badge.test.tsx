import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Badge } from './Badge';

// Phase 0 smoke test: proves the Vitest + Testing Library + jsdom toolchain is
// wired up and can render a component. Deeper flow/integration tests land in
// Phase 7.
describe('Badge', () => {
  it('renders its children', () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('applies the variant class', () => {
    render(<Badge variant="success">Approved</Badge>);
    expect(screen.getByText('Approved').className).toContain('success');
  });
});
