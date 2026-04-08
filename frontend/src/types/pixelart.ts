export type Tool = 'brush' | 'eraser' | 'bucket' | 'eyedropper' | 'line' | 'rectangle';

export interface PixelArtProject {
  id: number;
  project_name: string;
  canvas_width: number;
  canvas_height: number;
  image_data: string;
  frames_data: string;
  palette: string[];
  settings: EditorSettings;
  created_at: string;
  updated_at: string;
}

export interface EditorSettings {
  showGrid: boolean;
  brushSize: number;
  selectedTool: Tool;
  selectedColor: string;
}

export interface HistoryEntry {
  imageData: ImageData;
  canvasWidth: number;
  canvasHeight: number;
}

export interface FrameData {
  imageData: ImageData;
}
