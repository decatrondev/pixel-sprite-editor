import { useState } from 'react';

interface Props {
  canvasWidth: number;
  canvasHeight: number;
  pixelSize: number;
  showGrid: boolean;
  onResize: (w: number, h: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleGrid: () => void;
}

export function CanvasControls({
  canvasWidth,
  canvasHeight,
  pixelSize,
  showGrid,
  onResize,
  onZoomIn,
  onZoomOut,
  onToggleGrid,
}: Props) {
  const [newWidth, setNewWidth] = useState(canvasWidth.toString());
  const [newHeight, setNewHeight] = useState(canvasHeight.toString());

  const handleResize = () => {
    const w = parseInt(newWidth, 10);
    const h = parseInt(newHeight, 10);
    if (w >= 8 && w <= 256 && h >= 8 && h <= 256) {
      onResize(w, h);
    }
  };

  const zoomPercent = Math.round((pixelSize / 12) * 100);

  return (
    <div className="flex flex-wrap items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3">
      {/* Dimensions */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-gray-500">Tamaño:</span>
        <input
          type="number"
          value={newWidth}
          onChange={e => setNewWidth(e.target.value)}
          className="w-14 px-2 py-1 text-sm border border-gray-200 rounded-lg text-center"
          min={8}
          max={256}
        />
        <span className="text-gray-400">x</span>
        <input
          type="number"
          value={newHeight}
          onChange={e => setNewHeight(e.target.value)}
          className="w-14 px-2 py-1 text-sm border border-gray-200 rounded-lg text-center"
          min={8}
          max={256}
        />
        <button
          onClick={handleResize}
          className="px-3 py-1 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition"
        >
          Aplicar
        </button>
      </div>

      {/* Separator */}
      <div className="w-px h-6 bg-gray-200" />

      {/* Zoom */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-gray-500">Zoom:</span>
        <button
          onClick={onZoomOut}
          disabled={pixelSize <= 4}
          className="w-7 h-7 flex items-center justify-center text-sm font-bold rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 disabled:opacity-40 transition"
        >
          -
        </button>
        <span className="text-sm font-medium text-gray-700 w-12 text-center">{zoomPercent}%</span>
        <button
          onClick={onZoomIn}
          disabled={pixelSize >= 24}
          className="w-7 h-7 flex items-center justify-center text-sm font-bold rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 disabled:opacity-40 transition"
        >
          +
        </button>
      </div>

      {/* Separator */}
      <div className="w-px h-6 bg-gray-200" />

      {/* Grid toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={showGrid}
          onChange={onToggleGrid}
          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        <span className="text-xs font-medium text-gray-600">Grilla</span>
      </label>

      <span className="text-xs text-gray-400 ml-auto">{canvasWidth}x{canvasHeight}px</span>
    </div>
  );
}
