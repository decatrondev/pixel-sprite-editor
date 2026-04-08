import { toast } from '../common/Toast';
import type { GridConfig, Animation } from '../../types/editor';

interface JsonExportProps {
  imageName: string;
  grid: GridConfig;
  animations: Record<string, Animation>;
  image: HTMLImageElement | null;
}

export function JsonExport({ imageName, grid, animations, image }: JsonExportProps) {
  const handleExport = () => {
    if (!image || !grid.isActive) {
      toast('Aplica la grilla primero.', 'error');
      return;
    }

    const columns = Math.floor(image.width / grid.width);
    const rows = Math.floor(image.height / grid.height);
    const totalFrames = columns * rows;

    const config = {
      imageName,
      frameWidth: grid.width,
      frameHeight: grid.height,
      totalFrames,
      columns,
      rows,
      animations: Object.fromEntries(
        Object.entries(animations).map(([name, anim]) => [
          name,
          { frames: anim.frames, speed: anim.speed },
        ])
      ),
    };

    const json = JSON.stringify(config, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    const baseName = imageName.replace(/\.[^.]+$/, '') || 'sprite';
    a.download = `${baseName}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast('Archivo JSON descargado.', 'success');
  };

  return (
    <button
      onClick={handleExport}
      disabled={!image || !grid.isActive}
      className="w-full px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      Descargar JSON
    </button>
  );
}
