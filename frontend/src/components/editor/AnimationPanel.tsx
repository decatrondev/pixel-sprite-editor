import { useState } from 'react';
import { toast } from '../common/Toast';
import type { Animation } from '../../types/editor';

interface AnimationPanelProps {
  animations: Record<string, Animation>;
  activeAnimation: string | null;
  onSelect: (name: string) => void;
  onCreate: (name: string) => void;
  onDelete: (name: string) => void;
  onRename: (oldName: string, newName: string) => void;
  onSpeedChange: (name: string, speed: number) => void;
  onClear: (name: string) => void;
}

export function AnimationPanel({
  animations,
  activeAnimation,
  onSelect,
  onCreate,
  onDelete,
  onRename,
  onSpeedChange,
  onClear,
}: AnimationPanelProps) {
  const [newName, setNewName] = useState('');
  const [renamingKey, setRenamingKey] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) {
      toast('Escribe un nombre para la animacion.', 'error');
      return;
    }
    if (animations[name]) {
      toast('Ya existe una animacion con ese nombre.', 'error');
      return;
    }
    onCreate(name);
    setNewName('');
  };

  const handleRenameStart = (name: string) => {
    setRenamingKey(name);
    setRenameValue(name);
  };

  const handleRenameConfirm = () => {
    if (!renamingKey) return;
    const trimmed = renameValue.trim();
    if (!trimmed) {
      toast('El nombre no puede estar vacio.', 'error');
      return;
    }
    if (trimmed !== renamingKey && animations[trimmed]) {
      toast('Ya existe una animacion con ese nombre.', 'error');
      return;
    }
    onRename(renamingKey, trimmed);
    setRenamingKey(null);
    setRenameValue('');
  };

  const animationNames = Object.keys(animations);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Animaciones</h3>

      {/* Create new */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          placeholder="Nombre..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        <button
          onClick={handleCreate}
          className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          Crear
        </button>
      </div>

      {/* Animation list */}
      {animationNames.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4">
          No hay animaciones. Crea una para empezar.
        </p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {animationNames.map((name) => {
            const anim = animations[name];
            const isActive = activeAnimation === name;
            const isRenaming = renamingKey === name;

            return (
              <div
                key={name}
                className={`p-3 rounded-lg border text-sm transition-colors ${
                  isActive
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  {isRenaming ? (
                    <div className="flex gap-1 flex-1 mr-2">
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRenameConfirm()}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-indigo-500"
                        autoFocus
                      />
                      <button
                        onClick={handleRenameConfirm}
                        className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                      >
                        OK
                      </button>
                      <button
                        onClick={() => setRenamingKey(null)}
                        className="px-2 py-1 bg-gray-400 text-white rounded text-xs hover:bg-gray-500"
                      >
                        X
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => onSelect(name)}
                      className={`font-medium truncate text-left ${
                        isActive ? 'text-indigo-700' : 'text-gray-700'
                      }`}
                    >
                      {name}
                    </button>
                  )}

                  {!isRenaming && (
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => handleRenameStart(name)}
                        className="p-1 text-gray-400 hover:text-indigo-600"
                        title="Renombrar"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => onClear(name)}
                        className="p-1 text-gray-400 hover:text-yellow-600"
                        title="Limpiar frames"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                      <button
                        onClick={() => onDelete(name)}
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="Eliminar"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{anim.frames.length} frames</span>
                  <div className="flex items-center gap-1">
                    <label>FPS:</label>
                    <input
                      type="number"
                      value={anim.speed}
                      onChange={(e) => {
                        const val = Math.min(60, Math.max(1, Number(e.target.value)));
                        onSpeedChange(name, val);
                      }}
                      min={1}
                      max={60}
                      className="w-12 px-1 py-0.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {isActive && anim.frames.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {anim.frames.map((frame, idx) => (
                      <span
                        key={idx}
                        className="inline-block px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-mono"
                      >
                        {frame}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
