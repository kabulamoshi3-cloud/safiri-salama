/**
 * Unit tests for auth store
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuthStore } from '../store/auth';

// Mock api module
vi.mock('../services/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

// Mock firebase
vi.mock('../services/firebase', () => ({
  signInWithGoogle: vi.fn(),
}));

describe('authStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      loading: false,
    });
    vi.clearAllMocks();
  });

  it('starts unauthenticated when no token', () => {
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('is authenticated when token exists in localStorage', () => {
    localStorage.setItem('safiri_token', 'test-token');
    // Re-init
    useAuthStore.setState({ isAuthenticated: true });
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('login sets user and token on success', async () => {
    const api = await import('../services/api');
    (api.default.post as any).mockResolvedValue({
      data: {
        token: 'jwt-token-123',
        user: { id: '1', name: 'Test User', phone_number: '255700000001' },
      },
    });

    await useAuthStore.getState().login('+255700000001', 'password123');
    expect(localStorage.getItem('safiri_token')).toBe('jwt-token-123');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user?.name).toBe('Test User');
  });

  it('login throws on API error', async () => {
    const api = await import('../services/api');
    (api.default.post as any).mockRejectedValue({
      response: { data: { error: 'Invalid credentials' } },
    });

    await expect(
      useAuthStore.getState().login('+255700000001', 'wrongpass')
    ).rejects.toThrow('Invalid credentials');
  });

  it('register sets user and token on success', async () => {
    const api = await import('../services/api');
    (api.default.post as any).mockResolvedValue({
      data: {
        token: 'new-token',
        user: { id: '2', name: 'New User', phone_number: '255700000002' },
      },
    });

    await useAuthStore.getState().register('+255700000002', 'pass123', 'New User');
    expect(localStorage.getItem('safiri_token')).toBe('new-token');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('logout clears user and token', () => {
    localStorage.setItem('safiri_token', 'some-token');
    useAuthStore.setState({
      user: { id: '1', name: 'Test', phone_number: '255700000001' },
      isAuthenticated: true,
    });

    useAuthStore.getState().logout();
    expect(localStorage.getItem('safiri_token')).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('fetchProfile updates user on success', async () => {
    const api = await import('../services/api');
    (api.default.get as any).mockResolvedValue({
      data: { user: { id: '1', name: 'Updated User', phone_number: '255700000001' } },
    });

    await useAuthStore.getState().fetchProfile();
    expect(useAuthStore.getState().user?.name).toBe('Updated User');
  });
});
