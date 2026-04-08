import type { Tool } from '../../types/pixelart';

interface Props {
  selectedTool: Tool;
  brushSize: number;
  onSelectTool: (tool: Tool) => void;
  onSetBrushSize: (size: number) => void;
}

const tools: { id: Tool; label: string; icon: string; shortcut: string }[] = [
  { id: 'brush', label: 'Pincel', icon: '✏️', shortcut: 'B' },
  { id: 'eraser', label: 'Borrador', icon: '🧹', shortcut: 'E' },
  { id: 'bucket', label: 'Relleno', icon: '🪣', shortcut: 'G' },
  { id: 'eyedropper', label: 'Cuentagotas', icon: '💉', shortcut: 'I' },
  { id: 'line', label: 'Línea', icon: '📏', shortcut: 'L' },
  { id: 'rectangle', label: 'Rectángulo', icon: '⬜', shortcut: 'R' },
];

export function ToolBar({ selectedTool, brushSize, onSelectTool, onSetBrushSize }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Herramientas</h3>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {tools.map(tool => (
          <button
            key={tool.id}
            onClick={() => onSelectTool(tool.id)}
            className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg text-xs font-medium transition
              ${selectedTool === tool.id
                ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-400'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            title={`${tool.label} (${tool.shortcut})`}
          >
            <span className="text-lg">{tool.icon}</span>
            <span>{tool.label}</span>
          </button>
        ))}
      </div>

      <h3 className="text-sm font-semibold text-gray-700 mb-2">Tamaño de pincel</h3>
      <div className="flex gap-2">
        {[1, 2, 3].map(size => (
          <button
            key={size}
            onClick={() => onSetBrushSize(size)}
            className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition
              ${brushSize === size
                ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-400'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
          >
            {size}px
          </button>
        ))}
      </div>
    </div>
  );
}
