import { useState, useEffect, type RefObject } from 'react';
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

type BgMode = 'transparent' | 'white' | 'custom';

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
  const [bgMode, setBgMode] = useState<BgMode>('transparent');
  const [bgCustomColor, setBgCustomColor] = useState('#000000');
  const [includeCurrentFrame, setIncludeCurrentFrame] = useState(true);
  const [includeAllFrames, setIncludeAllFrames] = useState(false);
  const [includeSpritesheet, setIncludeSpritesheet] = useState(false);
  const [includeJson, setIncludeJson] = useState(false);
  const [spriteCols, setSpriteCols] = useState(4);
  const [spriteScale, setSpriteScale] = useState(1);
  const [exporting, setExporting] = useState(false);

  // Reset selections when opening
  useEffect(() => {
    if (open) {
      setIncludeCurrentFrame(true);
      setIncludeAllFrames(false);
      setIncludeSpritesheet(false);
      setIncludeJson(false);
      setSpriteCols(Math.min(4, frameCount));
    }
  }, [open, frameCount]);

  if (!open) return null;

  const bgColor = bgMode === 'transparent' ? null : bgMode === 'white' ? '#FFFFFF' : bgCustomColor;
  const selectedCount = [includeCurrentFrame, includeAllFrames, includeSpritesheet, includeJson].filter(Boolean).length;
  const useZip = selectedCount > 1;

  // Apply background to a canvas
  function applyBackground(canvas: HTMLCanvasElement, w: number, h: number) {
    if (!bgColor) return;
    const ctx = canvas.getContext('2d')!;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tctx = tempCanvas.getContext('2d')!;
    tctx.drawImage(canvas, 0, 0);
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(tempCanvas, 0, 0);
  }

  // Get current frame as canvas with bg applied
  function getCurrentFrameCanvas(): HTMLCanvasElement {
    const source = canvasRef.current!;
    const c = document.createElement('canvas');
    c.width = canvasWidth;
    c.height = canvasHeight;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    if (bgColor) {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }
    ctx.drawImage(source, 0, 0);
    return c;
  }

  // Get all frames as canvases with bg applied
  function getAllFrameCanvases(): HTMLCanvasElement[] {
    const urls = getAllFramesAsDataURLs(canvasWidth, canvasHeight);
    return urls.map(url => {
      const c = document.createElement('canvas');
      c.width = canvasWidth;
      c.height = canvasHeight;
      const ctx = c.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;
      // We'll draw after loading - return canvas for now
      // Actually dataURLs need to be loaded as images
      void url;
      return c;
    });
  }

  // Load dataURL into canvas
  function loadDataURLToCanvas(dataURL: string, bg: string | null): Promise<HTMLCanvasElement> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = canvasWidth;
        c.height = canvasHeight;
        const ctx = c.getContext('2d')!;
        ctx.imageSmoothingEnabled = false;
        if (bg) {
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        }
        ctx.drawImage(img, 0, 0);
        resolve(c);
      };
      img.src = dataURL;
    });
  }

  // Generate spritesheet canvas
  async function generateSpritesheet(frameURLs: string[]): Promise<HTMLCanvasElement> {
    const cols = Math.min(spriteCols, frameURLs.length);
    const rows = Math.ceil(frameURLs.length / cols);
    const fw = canvasWidth * spriteScale;
    const fh = canvasHeight * spriteScale;

    const sheet = document.createElement('canvas');
    sheet.width = cols * fw;
    sheet.height = rows * fh;
    const ctx = sheet.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    if (bgColor) {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, sheet.width, sheet.height);
    }

    const promises = frameURLs.map((url, i) => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          ctx.drawImage(img, col * fw, row * fh, fw, fh);
          resolve();
        };
        img.src = url;
      });
    });

    await Promise.all(promises);
    return sheet;
  }

  // Generate clean JSON (no base64)
  function generateProjectJSON(hasFrameFiles: boolean, hasSpritesheetFile: boolean): string {
    const cols = Math.min(spriteCols, frameCount);
    const rows = Math.ceil(frameCount / cols);

    const projectData: Record<string, unknown> = {
      meta: {
        app: 'PixelSprite Editor',
        version: '2.0',
        created: new Date().toISOString(),
      },
      canvas: {
        width: canvasWidth,
        height: canvasHeight,
      },
      totalFrames: frameCount,
      palette: palette || [],
      settings: settings || {},
    };

    if (hasFrameFiles) {
      projectData.frames = Array.from({ length: frameCount }, (_, i) => ({
        file: `frames/frame_${String(i + 1).padStart(3, '0')}.png`,
        index: i,
        duration: 100,
      }));
    }

    if (hasSpritesheetFile) {
      projectData.spritesheet = {
        file: 'spritesheet.png',
        columns: cols,
        rows: rows,
        frameWidth: canvasWidth * spriteScale,
        frameHeight: canvasHeight * spriteScale,
        scale: spriteScale,
      };
    }

    return JSON.stringify(projectData, null, 2);
  }

  // Canvas to blob helper
  function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob!), 'image/png');
    });
  }

  // Download helper
  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  // Main export function
  async function handleExport() {
    if (selectedCount === 0) {
      toast('Selecciona al menos una opcion para exportar.', 'error');
      return;
    }

    setExporting(true);

    try {
      const frameURLs = getAllFramesAsDataURLs(canvasWidth, canvasHeight);

      // Single item — direct download
      if (!useZip) {
        if (includeCurrentFrame) {
          const c = getCurrentFrameCanvas();
          const blob = await canvasToBlob(c);
          downloadBlob(blob, 'pixel-art-frame.png');
          toast('Frame exportado como PNG', 'success');
        } else if (includeAllFrames) {
          await exportFramesAsZip(frameURLs);
        } else if (includeSpritesheet) {
          const sheet = await generateSpritesheet(frameURLs);
          const blob = await canvasToBlob(sheet);
          downloadBlob(blob, 'spritesheet.png');
          toast('Spritesheet exportado', 'success');
        } else if (includeJson) {
          const json = generateProjectJSON(false, false);
          downloadBlob(new Blob([json], { type: 'application/json' }), 'project.json');
          toast('JSON exportado', 'success');
        }
      } else {
        // Multiple items — ZIP
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();

        if (includeCurrentFrame) {
          const c = getCurrentFrameCanvas();
          const blob = await canvasToBlob(c);
          zip.file('current-frame.png', blob);
        }

        if (includeAllFrames) {
          const framesFolder = zip.folder('frames')!;
          for (let i = 0; i < frameURLs.length; i++) {
            const c = await loadDataURLToCanvas(frameURLs[i], bgColor);
            const blob = await canvasToBlob(c);
            framesFolder.file(`frame_${String(i + 1).padStart(3, '0')}.png`, blob);
          }
        }

        if (includeSpritesheet) {
          const sheet = await generateSpritesheet(frameURLs);
          const blob = await canvasToBlob(sheet);
          zip.file('spritesheet.png', blob);
        }

        if (includeJson) {
          const json = generateProjectJSON(includeAllFrames, includeSpritesheet);
          zip.file('project.json', json);
        }

        const blob = await zip.generateAsync({ type: 'blob' });
        downloadBlob(blob, 'pixel-art-export.zip');
        toast('Proyecto exportado como ZIP', 'success');
      }

      onClose();
    } catch (err) {
      console.error('Error exportando:', err);
      toast('Error al exportar', 'error');
    } finally {
      setExporting(false);
    }
  }

  // Fallback for single all-frames export
  async function exportFramesAsZip(frameURLs: string[]) {
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      for (let i = 0; i < frameURLs.length; i++) {
        const c = await loadDataURLToCanvas(frameURLs[i], bgColor);
        const blob = await canvasToBlob(c);
        zip.file(`frame_${String(i + 1).padStart(3, '0')}.png`, blob);
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(blob, 'pixel-art-frames.zip');
      toast('Frames exportados como ZIP', 'success');
    } catch {
      // Fallback: individual downloads
      for (let i = 0; i < frameURLs.length; i++) {
        const c = await loadDataURLToCanvas(frameURLs[i], bgColor);
        const blob = await canvasToBlob(c);
        setTimeout(() => downloadBlob(blob, `frame_${i + 1}.png`), i * 200);
      }
      toast('Frames exportados individualmente', 'success');
    }
  }

  void getAllFrameCanvases;
  void applyBackground;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900 mb-5">Exportar</h3>

        {/* Background options */}
        <div className="mb-5">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Fondo</h4>
          <div className="flex gap-2">
            <button
              onClick={() => setBgMode('transparent')}
              className={`flex-1 py-2 text-xs font-medium rounded-lg border transition ${bgMode === 'transparent' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              <span className="inline-block w-4 h-4 rounded border border-gray-300 mr-1.5 align-middle" style={{ background: 'repeating-conic-gradient(#d1d5db 0% 25%, transparent 0% 50%) 50%/8px 8px' }} />
              Transparente
            </button>
            <button
              onClick={() => setBgMode('white')}
              className={`flex-1 py-2 text-xs font-medium rounded-lg border transition ${bgMode === 'white' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              <span className="inline-block w-4 h-4 rounded border border-gray-300 bg-white mr-1.5 align-middle" />
              Blanco
            </button>
            <button
              onClick={() => setBgMode('custom')}
              className={`flex-1 py-2 text-xs font-medium rounded-lg border transition ${bgMode === 'custom' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              <span className="inline-block w-4 h-4 rounded border border-gray-300 mr-1.5 align-middle" style={{ background: bgCustomColor }} />
              Color
            </button>
          </div>
          {bgMode === 'custom' && (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="color"
                value={bgCustomColor}
                onChange={e => setBgCustomColor(e.target.value)}
                className="w-8 h-8 rounded border border-gray-200 cursor-pointer"
              />
              <span className="text-xs text-gray-500">{bgCustomColor}</span>
            </div>
          )}
        </div>

        {/* What to export */}
        <div className="mb-5">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Incluir</h4>
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer transition">
              <input type="checkbox" checked={includeCurrentFrame} onChange={e => setIncludeCurrentFrame(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">Frame actual</p>
                <p className="text-xs text-gray-400">PNG del frame que estas editando</p>
              </div>
            </label>

            {frameCount > 1 && (
              <label className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer transition">
                <input type="checkbox" checked={includeAllFrames} onChange={e => setIncludeAllFrames(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Todos los frames ({frameCount})</p>
                  <p className="text-xs text-gray-400">Un PNG por cada frame de animacion</p>
                </div>
              </label>
            )}

            {frameCount > 1 && (
              <label className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer transition">
                <input type="checkbox" checked={includeSpritesheet} onChange={e => setIncludeSpritesheet(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Spritesheet</p>
                  <p className="text-xs text-gray-400">Todos los frames en una sola imagen</p>
                </div>
              </label>
            )}

            <label className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer transition">
              <input type="checkbox" checked={includeJson} onChange={e => setIncludeJson(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">JSON de configuracion</p>
                <p className="text-xs text-gray-400">Metadata, paleta, settings (sin base64)</p>
              </div>
            </label>
          </div>
        </div>

        {/* Spritesheet options */}
        {includeSpritesheet && frameCount > 1 && (
          <div className="mb-5 p-3 bg-gray-50 rounded-lg">
            <h4 className="text-xs font-semibold text-gray-600 mb-2">Opciones de spritesheet</h4>
            <div className="flex gap-3">
              <label className="flex-1">
                <span className="text-xs text-gray-500">Columnas</span>
                <input type="number" value={spriteCols} min={1} max={frameCount}
                  onChange={e => setSpriteCols(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-2 py-1 text-sm border border-gray-200 rounded-lg" />
              </label>
              <label className="flex-1">
                <span className="text-xs text-gray-500">Escala</span>
                <input type="number" value={spriteScale} min={1} max={8}
                  onChange={e => setSpriteScale(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-2 py-1 text-sm border border-gray-200 rounded-lg" />
              </label>
              <div className="flex-1">
                <span className="text-xs text-gray-500">Resultado</span>
                <p className="text-xs text-gray-700 mt-1.5">
                  {Math.min(spriteCols, frameCount) * canvasWidth * spriteScale}x{Math.ceil(frameCount / Math.min(spriteCols, frameCount)) * canvasHeight * spriteScale}px
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Export info */}
        <div className="mb-4 text-xs text-gray-400 text-center">
          {selectedCount === 0 && 'Selecciona al menos una opcion'}
          {selectedCount === 1 && 'Descarga directa'}
          {selectedCount > 1 && 'Se exportara como ZIP'}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
            Cancelar
          </button>
          <button onClick={handleExport} disabled={exporting || selectedCount === 0}
            className="flex-1 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50">
            {exporting ? 'Exportando...' : useZip ? 'Exportar ZIP' : 'Exportar'}
          </button>
        </div>
      </div>
    </div>
  );
}
