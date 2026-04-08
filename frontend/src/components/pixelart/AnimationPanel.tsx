import { useState } from 'react';
import { toast } from '../common/Toast';

interface PixelAnimation {
  frames: number[];
  speed: number;
}

interface Props {
  animations: Record<string, PixelAnimation>;
  activeAnimation: string | null;
  frameCount: number;
  currentFrameIndex: number;
  onSelect: (name: string) => void;
  onCreate: (name: string) => void;
  onDelete: (name: string) => void;
  onRename: (oldName: string, newName: string) => void;
  onAddFrame: (name: string, frameIndex: number) => void;
  onRemoveFrame: (name: string, frameIndex: number) => void;
  onSpeedChange: (name: string, speed: number) => void;
}

export function AnimationPanel({
  animations,
  activeAnimation,
  currentFrameIndex,
  onSelect,
  onCreate,
  onDelete,
  onRename,
  onAddFrame,
  onRemoveFrame,
  onSpeedChange,
}: Props) {
  const [newName, setNewName] = useState('');
  const [renamingAnim, setRenamingAnim] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    if (!/^[a-zA-Z0-9\s\-_]+$/.test(name)) {
      toast('Solo letras, numeros, espacios, guiones y guiones bajos.', 'error');
      return;
    }
    if (animations[name]) {
      toast('Ya existe una animacion con ese nombre.', 'error');
      return;
    }
    onCreate(name);
    setNewName('');
  };

  const handleRename = (oldName: string) => {
    const name = renameValue.trim();
    if (!name || name === oldName) {
      setRenamingAnim(null);
      return;
    }
    if (animations[name]) {
      toast('Ya existe una animacion con ese nombre.', 'error');
      return;
    }
    onRename(oldName, name);
    setRenamingAnim(null);
  };

  const animNames = Object.keys(animations);
  const active = activeAnimation ? animations[activeAnimation] : null;

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Animaciones</h3>

      {/* Create */}
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          placeholder="Nombre..."
          className="flex-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none"
        />
        <button onClick={handleCreate}
          className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition">
          Crear
        </button>
      </div>

      {/* List */}
      {animNames.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-2">Sin animaciones</p>
      ) : (
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {animNames.map(name => (
            <div key={name}
              onClick={() => onSelect(name)}
              className={`flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer text-sm transition ${
                activeAnimation === name ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'hover:bg-gray-50 text-gray-700'
              }`}>
              {renamingAnim === name ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onBlur={() => handleRename(name)}
                  onKeyDown={e => { if (e.key === 'Enter') handleRename(name); if (e.key === 'Escape') setRenamingAnim(null); }}
                  onClick={e => e.stopPropagation()}
                  className="flex-1 px-1 py-0.5 text-xs border border-indigo-300 rounded outline-none"
                />
              ) : (
                <span className="text-xs font-medium truncate">{name}</span>
              )}
              <div className="flex items-center gap-1 ml-2">
                <span className="text-[10px] text-gray-400">{animations[name].frames.length}f</span>
                <button onClick={e => { e.stopPropagation(); setRenamingAnim(name); setRenameValue(name); }}
                  className="text-[10px] text-gray-400 hover:text-gray-600" title="Renombrar">R</button>
                <button onClick={e => { e.stopPropagation(); onDelete(name); }}
                  className="text-[10px] text-red-400 hover:text-red-600" title="Eliminar">X</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Active animation details */}
      {activeAnimation && active && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-600">{activeAnimation}</span>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-gray-400">FPS:</span>
              <input type="number" value={active.speed} min={1} max={60}
                onChange={e => onSpeedChange(activeAnimation, Math.max(1, Math.min(60, parseInt(e.target.value) || 1)))}
                className="w-12 px-1 py-0.5 text-xs border border-gray-200 rounded text-center" />
            </div>
          </div>

          {/* Add current frame button */}
          <button onClick={() => onAddFrame(activeAnimation, currentFrameIndex)}
            className="w-full mb-2 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition">
            + Agregar frame {currentFrameIndex + 1} actual
          </button>

          {/* Frame list */}
          {active.frames.length === 0 ? (
            <p className="text-[10px] text-gray-400 text-center">Navega a un frame y haz clic en agregar</p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {active.frames.map((frameIdx, i) => (
                <div key={i} className="flex items-center gap-0.5 px-1.5 py-0.5 bg-indigo-50 border border-indigo-200 rounded text-[10px] text-indigo-700">
                  <span className="font-medium">{frameIdx + 1}</span>
                  <button onClick={() => onRemoveFrame(activeAnimation, i)}
                    className="text-indigo-400 hover:text-red-500 ml-0.5">x</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
