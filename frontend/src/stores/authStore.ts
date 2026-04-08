import { create } from 'zustand';
import type { User } from '../types/auth';
import { authApi } from '../services/api';

interface AuthState {
  user: User | null;
  loading: boolean;
  checkAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (username: string, email: string, password: string, password2: string) => Promise<{ success: boolean; message?: string; errors?: { msg: string }[] }>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  checkAuth: async () => {
    try {
      const { data } = await authApi.me();
      set({ user: data.user || null, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },

  login: async (email, password) => {
    try {
      const { data } = await authApi.login({ email, password });
      if (data.success && data.user) {
        set({ user: data.user });
        return { success: true };
      }
      return { success: false, message: data.message || 'Error al iniciar sesión.' };
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al iniciar sesión.';
      return { success: false, message };
    }
  },

  register: async (username, email, password, password2) => {
    try {
      const { data } = await authApi.register({ username, email, password, password2 });
      if (data.success) {
        return { success: true };
      }
      return { success: false, message: data.message, errors: data.errors };
    } catch (err: unknown) {
      const resp = (err as { response?: { data?: { message?: string; errors?: { msg: string }[] } } })?.response?.data;
      return { success: false, message: resp?.message || 'Error al registrarse.', errors: resp?.errors };
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch { /* ignore */ }
    set({ user: null });
  }
}));
