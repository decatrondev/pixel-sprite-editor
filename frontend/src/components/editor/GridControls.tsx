import { useState } from 'react';
import { toast } from '../common/Toast';

interface GridControlsProps {
  image: HTMLImageElement | null;
  onApplyGrid: (width: number, height: number) => void;
  gridActive: boolean;
}

export function GridControls({ image, onApplyGrid, gridActive }: GridControlsProps) {
  const [width, setWidth] = useState(64);
  const [height, setHeight] = useState(64);

  const handleApply = () => {
    if (!image) {
      toast('Carga una imagen primero.', 'error');
      return;
    }
    if (width <= 0 || height <= 0) {
      toast('El ancho y alto deben ser numeros positivos.', 'error');
      return;
    }
    if (image.width % width !== 0) {
      toast(`El ancho de la imagen (${image.width}px) no es divisible por ${width}.`, 'error');
      return;
    }
    if (image.height % height !== 0) {
      toast(`El alto de la imagen (${image.height}px) no es divisible por ${height}.`, 'error');
      return;
    }
    onApplyGrid(width, height);
    toast(`Grilla aplicada: ${Math.floor(image.width / width)}x${Math.floor(image.height / height)} frames.`, 'success');
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Grilla</h3>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">Ancho (px)</label>
          <input
            type="number"
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
            min={1}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">Alto (px)</label>
          <input
            type="number"
            value={height}
            onChange={(e) => setHeight(Number(e.target.value))}
            min={1}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>
      <button
        onClick={handleApply}
        disabled={!image}
        className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {gridActive ? 'Actualizar Grilla' : 'Aplicar Grilla'}
      </button>
      {image && (
        <p className="text-xs text-gray-400">
          Imagen: {image.width} x {image.height}px
        </p>
      )}
    </div>
  );
}
