import { vi } from 'vitest';
import axios from 'axios';

vi.mock('axios');

// Mock the axios instance created in services/api.ts
vi.mock('../services/api', () => {
  const mockInstance = {
    post: vi.fn(),
    get: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  };
  return { default: mockInstance };
});

describe('Operator Auth Store', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('sets operator from res.data.user after login (not res.data.operator)', async () => {
    // Import fresh module after resetModules
    const apiModule = await import('../services/api');
    const api = apiModule.default as any;
    api.post.mockResolvedValue({
      data: {
        token: 'test-token',
        user: { id: '1', name: 'Operator', userType: 'operator', phone: '+255700000001', email: '', fleet_name: 'Fleet A', status: 'active' },
      },
    });

    const { useAuthStore } = await import('../store/auth');
    await useAuthStore.getState().login('+255700000001', 'password');

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.operator).not.toBeNull();
    expect(state.operator?.name).toBe('Operator');
  });

  it('stores token in localStorage after login', async () => {
    const apiModule = await import('../services/api');
    const api = apiModule.default as any;
    api.post.mockResolvedValue({
      data: {
        token: 'test-token',
        user: { id: '1', name: 'Operator', userType: 'operator', phone: '+255700000001', email: '', fleet_name: 'Fleet A', status: 'active' },
      },
    });

    const { useAuthStore } = await import('../store/auth');
    await useAuthStore.getState().login('+255700000001', 'password');

    expect(localStorage.getItem('operator_token')).toBe('test-token');
  });

  it('clears state on logout', async () => {
    const { useAuthStore } = await import('../store/auth');
    // Pre-set some state
    localStorage.setItem('operator_token', 'existing-token');
    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.operator).toBeNull();
    expect(localStorage.getItem('operator_token')).toBeNull();
  });

  it('throws error on failed login', async () => {
    const apiModule = await import('../services/api');
    const api = apiModule.default as any;
    api.post.mockRejectedValue(new Error('Network Error'));

    const { useAuthStore } = await import('../store/auth');
    await expect(
      useAuthStore.getState().login('+255700000001', 'wrongpassword')
    ).rejects.toThrow('Network Error');
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
