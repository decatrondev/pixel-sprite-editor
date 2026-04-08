import { useState } from 'react';
import { COLOR_PRESETS, validateHexColor } from '../../utils/color';

interface Props {
  colorPalette: string[];
  selectedColor: string;
  onSelectColor: (color: string) => void;
  onSetPalette: (palette: string[]) => void;
}

export function PalettePanel({ colorPalette, selectedColor, onSelectColor, onSetPalette }: Props) {
  const [hexInput, setHexInput] = useState(selectedColor);
  const [selectedPreset, setSelectedPreset] = useState('default');

  const handleHexSubmit = () => {
    const valid = validateHexColor(hexInput);
    if (valid) {
      onSelectColor(valid);
      setHexInput(valid);
    }
  };

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    const p = COLOR_PRESETS[preset];
    if (p) onSetPalette([...p.colors]);
  };

  const addCurrentColor = () => {
    if (colorPalette.length >= 32) return;
    if (!colorPalette.includes(selectedColor)) {
      onSetPalette([...colorPalette, selectedColor]);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Colores</h3>

      {/* Current color preview + picker */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-lg border-2 border-gray-300 shadow-inner"
          style={{ backgroundColor: selectedColor }}
        />
        <input
          type="color"
          value={selectedColor}
          onChange={e => {
            onSelectColor(e.target.value);
            setHexInput(e.target.value);
          }}
          className="w-10 h-10 rounded cursor-pointer border-0 p-0"
        />
        <div className="flex-1">
          <div className="flex gap-1">
            <input
              type="text"
              value={hexInput}
              onChange={e => setHexInput(e.target.value)}
              onBlur={handleHexSubmit}
              onKeyDown={e => { if (e.key === 'Enter') handleHexSubmit(); }}
              className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded-lg font-mono"
              placeholder="#000000"
            />
          </div>
        </div>
      </div>

      {/* Preset selector */}
      <div className="mb-3">
        <select
          value={selectedPreset}
          onChange={e => handlePresetChange(e.target.value)}
          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg bg-white"
        >
          {Object.entries(COLOR_PRESETS).map(([key, preset]) => (
            <option key={key} value={key}>{preset.name}</option>
          ))}
        </select>
      </div>

      {/* Palette grid */}
      <div className="grid grid-cols-8 gap-1 mb-3">
        {colorPalette.map((color, i) => (
          <button
            key={`${color}-${i}`}
            onClick={() => {
              onSelectColor(color);
              setHexInput(color);
            }}
            className={`w-full aspect-square rounded border transition
              ${selectedColor === color
                ? 'ring-2 ring-indigo-400 border-indigo-400 scale-110 z-10'
                : 'border-gray-200 hover:border-gray-400'
              }`}
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>

      {/* Add color */}
      {colorPalette.length < 32 && (
        <button
          onClick={addCurrentColor}
          className="w-full py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition"
        >
          + Agregar color actual
        </button>
      )}
    </div>
  );
}
