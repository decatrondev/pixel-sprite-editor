export interface User {
  id: number;
  username: string;
  email: string;
  role: 'user' | 'admin';
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  password2: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  message?: string;
  errors?: { msg: string; path?: string }[];
}
