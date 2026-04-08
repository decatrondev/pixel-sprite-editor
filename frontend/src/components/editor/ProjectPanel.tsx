import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { toast } from '../common/Toast';
import type { GridConfig, Animation, SpriteProject } from '../../types/editor';

interface ProjectPanelProps {
  image: HTMLImageElement | null;
  imageName: string;
  grid: GridConfig;
  animations: Record<string, Animation>;
  onLoadProject: (data: {
    image: HTMLImageElement;
    imageName: string;
    grid: GridConfig;
    animations: Record<string, Animation>;
  }) => void;
}

export function ProjectPanel({ image, imageName, grid, animations, onLoadProject }: ProjectPanelProps) {
  const user = useAuthStore((s) => s.user);
  const [projects, setProjects] = useState<SpriteProject[]>([]);
  const [projectName, setProjectName] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchProjects = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await api.get<{ success: boolean; projects: SpriteProject[] }>('/api/get-projects');
      if (data.success) {
        setProjects(data.projects);
      }
    } catch {
      // silent
    }
  }, [user]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleSave = async () => {
    if (!image) {
      toast('Carga una imagen primero.', 'error');
      return;
    }
    if (!projectName.trim()) {
      toast('Escribe un nombre para el proyecto.', 'error');
      return;
    }
    if (!user) {
      toast('Inicia sesion para guardar proyectos.', 'error');
      return;
    }

    setSaving(true);
    try {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = image.width;
      tempCanvas.height = image.height;
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) throw new Error('No canvas context');
      ctx.drawImage(image, 0, 0);

      const blob = await new Promise<Blob>((resolve, reject) => {
        tempCanvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Failed to create blob'))),
          'image/png'
        );
      });

      const jsonData = JSON.stringify({
        imageName,
        grid: { width: grid.width, height: grid.height },
        animations,
      });

      const formData = new FormData();
      formData.append('project_name', projectName.trim());
      formData.append('image', blob, imageName || 'sprite.png');
      formData.append('json_data', jsonData);

      const { data } = await api.post('/api/save-project', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (data.success) {
        toast('Proyecto guardado correctamente.', 'success');
        fetchProjects();
      } else {
        toast(data.message || 'Error al guardar el proyecto.', 'error');
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al guardar el proyecto.';
      toast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLoad = async (id: number) => {
    setLoading(true);
    try {
      const { data } = await api.get<{
        success: boolean;
        project: SpriteProject;
      }>(`/api/load-project/${id}`);

      if (!data.success || !data.project) {
        toast('Error al cargar el proyecto.', 'error');
        return;
      }

      const project = data.project;
      const parsed = JSON.parse(project.json_data) as {
        imageName: string;
        grid: { width: number; height: number };
        animations: Record<string, Animation>;
      };

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        onLoadProject({
          image: img,
          imageName: parsed.imageName,
          grid: { width: parsed.grid.width, height: parsed.grid.height, isActive: true },
          animations: parsed.animations,
        });
        setProjectName(project.project_name);
        toast('Proyecto cargado correctamente.', 'success');
      };
      img.onerror = () => {
        toast('Error al cargar la imagen del proyecto.', 'error');
      };
      img.src = project.image_path;
    } catch {
      toast('Error al cargar el proyecto.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Eliminar este proyecto?')) return;
    try {
      const { data } = await api.delete(`/api/delete-project/${id}`);
      if (data.success) {
        toast('Proyecto eliminado.', 'success');
        fetchProjects();
      } else {
        toast('Error al eliminar.', 'error');
      }
    } catch {
      toast('Error al eliminar el proyecto.', 'error');
    }
  };

  if (!user) {
    return (
      <div className="text-center text-xs text-gray-400 py-4">
        Inicia sesion para guardar y cargar proyectos.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Proyectos</h3>

      {/* Save */}
      <div className="flex gap-2">
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="Nombre del proyecto..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        <button
          onClick={handleSave}
          disabled={saving || !image}
          className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>

      {/* Project list */}
      {projects.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-2">No hay proyectos guardados.</p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {projects.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between p-2 border border-gray-200 rounded-lg text-sm bg-white"
            >
              <div className="truncate flex-1 mr-2">
                <span className="font-medium text-gray-700">{p.project_name}</span>
                <span className="text-xs text-gray-400 ml-2">
                  {new Date(p.updated_at).toLocaleDateString()}
                </span>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => handleLoad(p.id)}
                  disabled={loading}
                  className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs hover:bg-indigo-200 disabled:opacity-50"
                >
                  Cargar
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
