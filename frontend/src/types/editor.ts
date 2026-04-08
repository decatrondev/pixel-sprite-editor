export interface Animation {
  frames: number[];
  speed: number;
}

export interface SpriteProject {
  id: number;
  project_name: string;
  image_path: string;
  json_data: string;
  created_at: string;
  updated_at: string;
}

export interface GridConfig {
  width: number;
  height: number;
  isActive: boolean;
}
