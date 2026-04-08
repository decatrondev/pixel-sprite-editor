import axios from 'axios';
import type { AuthResponse, LoginRequest, RegisterRequest } from '../types/auth';
import type { AdminStats, AdminUser, AdminProject, AdminActivity } from '../types/api';

const api = axios.create({
  baseURL: '',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
});

// Auth
export const authApi = {
  login: (data: LoginRequest) => api.post<AuthResponse>('/auth/login', data),
  register: (data: RegisterRequest) => api.post<AuthResponse>('/auth/register', data),
  logout: () => api.post<AuthResponse>('/auth/logout'),
  me: () => api.get<AuthResponse>('/auth/me'),
};

// Admin
export const adminApi = {
  getStats: () => api.get<{ success: boolean; stats: AdminStats }>('/api/admin/stats'),
  getUsers: () => api.get<{ success: boolean; users: AdminUser[] }>('/api/admin/users'),
  getUser: (id: number) => api.get<{ success: boolean; user: AdminUser; projects: { sprites: AdminProject[]; pixelart: AdminProject[] } }>(`/api/admin/users/${id}`),
  updateUser: (id: number, data: { role?: string; is_active?: boolean }) => api.patch(`/api/admin/users/${id}`, data),
  getProjects: (type?: string) => api.get<{ success: boolean; projects: { sprites: AdminProject[]; pixelart: AdminProject[] } }>('/api/admin/projects', { params: type ? { type } : {} }),
  deleteProject: (type: string, id: number) => api.delete(`/api/admin/projects/${type}/${id}`),
  getActivity: () => api.get<{ success: boolean; activity: AdminActivity }>('/api/admin/activity'),
};

export default api;
