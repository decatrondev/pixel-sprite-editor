import { useState, useEffect, type RefObject } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { toast } from '../common/Toast';
import { ConfirmDialog } from '../common/ConfirmDialog';
import api from '../../services/api';
import type { EditorSettings } from '../../types/pixelart';

interface ProjectInfo {
  id: number;
  project_name: string;
  canvas_width: number;
  canvas_height: number;
  created_at: string;
  updated_at: string;
}

interface Props {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  canvasWidth: number;
  canvasHeight: number;
  colorPalette: string[];
  settings: EditorSettings;
  getAllFramesAsDataURLs: (w: number, h: number) => string[];
  loadFramesFromData: (urls: string[], w: number, h: number) => Promise<void>;
  onLoadProject: (data: {
    width: number;
    height: number;
    imageData: string;
    palette: string[];
    settings: EditorSettings;
    projectId: number;
    projectName: string;
  }) => void;
}

export function ProjectPanel({
  canvasRef,
  canvasWidth,
  canvasHeight,
  colorPalette,
  settings,
  getAllFramesAsDataURLs,
  loadFramesFromData,
  onLoadProject,
}: Props) {
  const { user } = useAuthStore();
  const [projectName, setProjectName] = useState('');
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => {
    if (user) loadProjects();
  }, [user]);

  const loadProjects = async () => {
    try {
      const { data } = await api.get('/api/pixelart/get-projects');
      if (data.success) setProjects(data.projects ?? []);
    } catch {
      // silently fail
    }
  };

  const saveProject = async () => {
    if (!projectName.trim()) {
      toast('Ingresa un nombre para el proyecto', 'error');
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;

    setLoading(true);
    try {
      const framesData = getAllFramesAsDataURLs(canvasWidth, canvasHeight);
      const body = {
        name: projectName,
        width: canvasWidth,
        height: canvasHeight,
        imageData: canvas.toDataURL(),
        frames_data: JSON.stringify({ frames: framesData }),
        palette: JSON.stringify(colorPalette),
        settings: JSON.stringify(settings),
      };
      const { data } = await api.post('/api/pixelart/save-project', body);
      if (data.success) {
        toast('Proyecto guardado', 'success');
        loadProjects();
      } else {
        toast(data.message ?? 'Error al guardar', 'error');
      }
    } catch {
      toast('Error al guardar proyecto', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadProject = async (id: number) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/pixelart/load-project/${id}`);
      if (data.success && data.project) {
        const p = data.project;
        const palette = typeof p.palette === 'string' ? JSON.parse(p.palette) : p.palette;
        const s = typeof p.settings === 'string' ? JSON.parse(p.settings) : p.settings;
        const framesRaw = typeof p.frames_data === 'string' ? JSON.parse(p.frames_data) : p.frames_data;

        // Load frames
        if (framesRaw?.frames?.length) {
          await loadFramesFromData(framesRaw.frames, p.canvas_width, p.canvas_height);
        }

        onLoadProject({
          width: p.canvas_width,
          height: p.canvas_height,
          imageData: p.image_data,
          palette: palette || colorPalette,
          settings: s || settings,
          projectId: p.id,
          projectName: p.project_name,
        });
        setProjectName(p.project_name);
        toast('Proyecto cargado', 'success');
      }
    } catch {
      toast('Error al cargar proyecto', 'error');
    } finally {
      setLoading(false);
    }
  };

  const deleteProject = async () => {
    if (deleteId === null) return;
    try {
      await api.delete(`/api/pixelart/delete-project/${deleteId}`);
      toast('Proyecto eliminado', 'success');
      loadProjects();
    } catch {
      toast('Error al eliminar', 'error');
    }
    setDeleteId(null);
  };

  if (!user) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Proyectos</h3>
        <p className="text-xs text-gray-500">Inicia sesion para guardar y cargar proyectos.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Proyectos</h3>

      {/* Save */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={projectName}
          onChange={e => setProjectName(e.target.value)}
          placeholder="Nombre del proyecto"
          className="flex-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg"
        />
        <button
          onClick={saveProject}
          disabled={loading}
          className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
        >
          {loading ? '...' : 'Guardar'}
        </button>
      </div>

      {/* Project list */}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {projects.length === 0 && (
          <p className="text-xs text-gray-400">No hay proyectos guardados</p>
        )}
        {projects.map(p => (
          <div key={p.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-700 truncate">{p.project_name}</div>
              <div className="text-xs text-gray-400">{p.canvas_width}x{p.canvas_height}</div>
            </div>
            <button
              onClick={() => loadProject(p.id)}
              className="px-2 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100 transition"
            >
              Cargar
            </button>
            <button
              onClick={() => setDeleteId(p.id)}
              className="px-2 py-1 text-xs font-medium text-red-600 bg-red-50 rounded hover:bg-red-100 transition"
            >
              Eliminar
            </button>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={deleteId !== null}
        title="Eliminar proyecto"
        message="Esta accion no se puede deshacer. ¿Estas seguro?"
        confirmText="Eliminar"
        danger
        onConfirm={deleteProject}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
