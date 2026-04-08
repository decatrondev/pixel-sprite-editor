import { useState, type RefObject } from 'react';
import { toast } from '../common/Toast';

interface Props {
  open: boolean;
  onClose: () => void;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  canvasWidth: number;
  canvasHeight: number;
  getAllFramesAsDataURLs: (w: number, h: number) => string[];
  frameCount: number;
  palette?: string[];
  settings?: object;
}

export function ExportDialog({
  open,
  onClose,
  canvasRef,
  canvasWidth,
  canvasHeight,
  getAllFramesAsDataURLs,
  frameCount,
  palette,
  settings,
}: Props) {
  const [spriteCols, setSpriteCols] = useState(4);
  const [spriteScale, setSpriteScale] = useState(1);
  const [exporting, setExporting] = useState(false);

  if (!open) return null;

  const downloadDataURL = (dataURL: string, filename: string) => {
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = filename;
    a.click();
  };

  const exportProjectJSON = () => {
    const urls = getAllFramesAsDataURLs(canvasWidth, canvasHeight);
    const projectData = {
      meta: {
        app: 'PixelSprite Editor',
        version: '2.0',
        format: 'pixelart-project',
        created: new Date().toISOString(),
      },
      canvas: {
        width: canvasWidth,
        height: canvasHeight,
      },
      frames: urls.map((url, i) => ({
        index: i,
        duration: 100,
        dataURL: url,
      })),
      totalFrames: urls.length,
      palette: palette || [],
      settings: settings || {},
    };

    const json = JSON.stringify(projectData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pixel-art-project.json';
    a.click();
    URL.revokeObjectURL(url);
    toast('Proyecto exportado como JSON', 'success');
  };

  const exportCurrentFrame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvasWidth;
    exportCanvas.height = canvasHeight;
    const ctx = exportCanvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(canvas, 0, 0);
    downloadDataURL(exportCanvas.toDataURL('image/png'), 'pixel-art-frame.png');
    toast('Frame exportado como PNG', 'success');
  };

  const exportAllFrames = async () => {
    setExporting(true);
    try {
      const urls = getAllFramesAsDataURLs(canvasWidth, canvasHeight);

      // Try JSZip
      try {
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        for (let i = 0; i < urls.length; i++) {
          const base64 = urls[i].split(',')[1];
          zip.file(`frame_${String(i + 1).padStart(3, '0')}.png`, base64, { base64: true });
        }
        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'pixel-art-frames.zip';
        a.click();
        URL.revokeObjectURL(url);
        toast('Frames exportados como ZIP', 'success');
      } catch {
        // Fallback: download individually
        urls.forEach((url, i) => {
          setTimeout(() => downloadDataURL(url, `frame_${i + 1}.png`), i * 200);
        });
        toast('Frames exportados individualmente', 'success');
      }
    } finally {
      setExporting(false);
    }
  };

  const exportSpritesheet = () => {
    setExporting(true);
    try {
      const urls = getAllFramesAsDataURLs(canvasWidth, canvasHeight);
      const cols = Math.min(spriteCols, urls.length);
      const rows = Math.ceil(urls.length / cols);
      const sw = canvasWidth * spriteScale;
      const sh = canvasHeight * spriteScale;

      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = cols * sw;
      exportCanvas.height = rows * sh;
      const ctx = exportCanvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;

      let loaded = 0;
      urls.forEach((url, i) => {
        const img = new Image();
        img.onload = () => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          ctx.drawImage(img, col * sw, row * sh, sw, sh);
          loaded++;
          if (loaded === urls.length) {
            downloadDataURL(exportCanvas.toDataURL('image/png'), 'spritesheet.png');
            toast('Spritesheet exportado', 'success');
            setExporting(false);
          }
        };
        img.src = url;
      });
    } catch {
      setExporting(false);
      toast('Error al exportar spritesheet', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900 mb-4">Exportar</h3>

        <div className="space-y-4">
          {/* Export current frame */}
          <div>
            <button
              onClick={exportCurrentFrame}
              className="w-full py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition"
            >
              Exportar frame actual (PNG)
            </button>
          </div>

          {/* Export all frames */}
          {frameCount > 1 && (
            <div>
              <button
                onClick={exportAllFrames}
                disabled={exporting}
                className="w-full py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
              >
                {exporting ? 'Exportando...' : `Exportar ${frameCount} frames (ZIP)`}
              </button>
            </div>
          )}

          {/* Spritesheet */}
          {frameCount > 1 && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Spritesheet</h4>
              <div className="flex gap-3 mb-3">
                <label className="flex-1">
                  <span className="text-xs text-gray-500">Columnas</span>
                  <input
                    type="number"
                    value={spriteCols}
                    onChange={e => setSpriteCols(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-2 py-1 text-sm border border-gray-200 rounded-lg"
                    min={1}
                    max={frameCount}
                  />
                </label>
                <label className="flex-1">
                  <span className="text-xs text-gray-500">Escala</span>
                  <input
                    type="number"
                    value={spriteScale}
                    onChange={e => setSpriteScale(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-2 py-1 text-sm border border-gray-200 rounded-lg"
                    min={1}
                    max={8}
                  />
                </label>
              </div>
              <button
                onClick={exportSpritesheet}
                disabled={exporting}
                className="w-full py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
              >
                {exporting ? 'Generando...' : 'Exportar spritesheet'}
              </button>
            </div>
          )}
        </div>

        {/* JSON export */}
        <div className="border-t pt-4 mt-4">
          <button
            onClick={exportProjectJSON}
            className="w-full py-2 text-sm font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition"
          >
            Exportar proyecto (JSON)
          </button>
          <p className="text-xs text-gray-400 mt-1 text-center">
            Incluye frames, paleta y configuracion
          </p>
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
