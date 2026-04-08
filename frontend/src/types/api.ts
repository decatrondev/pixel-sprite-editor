export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface AdminStats {
  users: {
    total: number;
    active: number;
    admins: number;
    recentWeek: number;
  };
  projects: {
    sprites: number;
    pixelart: number;
    total: number;
  };
  system: {
    dbSize: string;
    uploadsSize: string;
    nodeVersion: string;
    uptime: string;
  };
}

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login: string | null;
  sprite_count: string;
  pixelart_count: string;
}

export interface AdminProject {
  id: number;
  project_name: string;
  created_at: string;
  updated_at: string;
  username: string;
  user_id: number;
  image_path?: string;
  canvas_width?: number;
  canvas_height?: number;
}

export interface AdminActivity {
  recentLogins: { id: number; username: string; last_login: string }[];
  recentProjects: { id: number; project_name: string; updated_at: string; username: string; type: string }[];
  recentUsers: { id: number; username: string; created_at: string }[];
}
