import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../hooks/useAppInit', () => ({
  useAppInit: () => ({ initialized: true, loading: false }),
}));

import App from '../App';
import { useAuthStore } from '../store/auth';

describe('web app startup', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ user: null, isAuthenticated: false, loading: false });
    window.history.replaceState({}, '', '/');
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }) as any;
  });

  it('renders the splash screen without a router context error', () => {
    render(<App />);

    expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument();
  });
});
