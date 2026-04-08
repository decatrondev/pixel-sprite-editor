import { useState, useCallback } from 'react';
import { toast } from '../components/common/Toast';
import { FileUpload } from '../components/editor/FileUpload';
import { SpriteCanvas } from '../components/editor/SpriteCanvas';
import { GridControls } from '../components/editor/GridControls';
import { AnimationPanel } from '../components/editor/AnimationPanel';
import { AnimationPreview } from '../components/editor/AnimationPreview';
import { JsonExport } from '../components/editor/JsonExport';
import { ProjectPanel } from '../components/editor/ProjectPanel';
import type { GridConfig, Animation } from '../types/editor';

export function SpriteEditorPage() {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [imageName, setImageName] = useState('');
  const [grid, setGrid] = useState<GridConfig>({ width: 64, height: 64, isActive: false });
  const [animations, setAnimations] = useState<Record<string, Animation>>({});
  const [activeAnimation, setActiveAnimation] = useState<string | null>(null);

  const handleImageLoaded = useCallback((img: HTMLImageElement, filename: string) => {
    setImage(img);
    setImageName(filename);
    setGrid({ width: 64, height: 64, isActive: false });
    setAnimations({});
    setActiveAnimation(null);
  }, []);

  const handleApplyGrid = useCallback((width: number, height: number) => {
    setGrid({ width, height, isActive: true });
  }, []);

  const handleFrameClick = useCallback(
    (frameIndex: number) => {
      if (!activeAnimation) {
        toast('Selecciona o crea una animacion primero.', 'info');
        return;
      }
      setAnimations((prev) => {
        const anim = prev[activeAnimation];
        if (!anim) return prev;
        if (anim.frames.includes(frameIndex)) return prev;
        return {
          ...prev,
          [activeAnimation]: { ...anim, frames: [...anim.frames, frameIndex] },
        };
      });
    },
    [activeAnimation]
  );

  const handleFrameRightClick = useCallback(
    (frameIndex: number) => {
      if (!activeAnimation) return;
      setAnimations((prev) => {
        const anim = prev[activeAnimation];
        if (!anim) return prev;
        const idx = anim.frames.lastIndexOf(frameIndex);
        if (idx === -1) return prev;
        const newFrames = [...anim.frames];
        newFrames.splice(idx, 1);
        return {
          ...prev,
          [activeAnimation]: { ...anim, frames: newFrames },
        };
      });
    },
    [activeAnimation]
  );

  const handleCreateAnimation = useCallback((name: string) => {
    setAnimations((prev) => ({
      ...prev,
      [name]: { frames: [], speed: 8 },
    }));
    setActiveAnimation(name);
  }, []);

  const handleDeleteAnimation = useCallback(
    (name: string) => {
      setAnimations((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
      if (activeAnimation === name) {
        setActiveAnimation(null);
      }
    },
    [activeAnimation]
  );

  const handleRenameAnimation = useCallback(
    (oldName: string, newName: string) => {
      if (oldName === newName) return;
      setAnimations((prev) => {
        const next: Record<string, Animation> = {};
        for (const [key, val] of Object.entries(prev)) {
          next[key === oldName ? newName : key] = val;
        }
        return next;
      });
      if (activeAnimation === oldName) {
        setActiveAnimation(newName);
      }
    },
    [activeAnimation]
  );

  const handleSpeedChange = useCallback((name: string, speed: number) => {
    setAnimations((prev) => {
      const anim = prev[name];
      if (!anim) return prev;
      return { ...prev, [name]: { ...anim, speed } };
    });
  }, []);

  const handleClearFrames = useCallback((name: string) => {
    setAnimations((prev) => {
      const anim = prev[name];
      if (!anim) return prev;
      return { ...prev, [name]: { ...anim, frames: [] } };
    });
  }, []);

  const handleLoadProject = useCallback(
    (data: {
      image: HTMLImageElement;
      imageName: string;
      grid: GridConfig;
      animations: Record<string, Animation>;
    }) => {
      setImage(data.image);
      setImageName(data.imageName);
      setGrid(data.grid);
      setAnimations(data.animations);
      const firstAnim = Object.keys(data.animations)[0] ?? null;
      setActiveAnimation(firstAnim);
    },
    []
  );

  const handleResetImage = useCallback(() => {
    setImage(null);
    setImageName('');
    setGrid({ width: 64, height: 64, isActive: false });
    setAnimations({});
    setActiveAnimation(null);
  }, []);

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Editor de Sprites</h1>
          {imageName && (
            <p className="text-sm text-gray-500 mt-1">{imageName}</p>
          )}
        </div>
        {image && (
          <button
            onClick={handleResetImage}
            className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
          >
            Nueva imagen
          </button>
        )}
      </div>

      {!image ? (
        <div className="max-w-xl mx-auto">
          <FileUpload onImageLoaded={handleImageLoaded} hasImage={!!image} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-6">
          {/* Left panel - Controls */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-6">
              <GridControls
                image={image}
                onApplyGrid={handleApplyGrid}
                gridActive={grid.isActive}
              />

              <div className="border-t border-gray-100" />

              <AnimationPanel
                animations={animations}
                activeAnimation={activeAnimation}
                onSelect={setActiveAnimation}
                onCreate={handleCreateAnimation}
                onDelete={handleDeleteAnimation}
                onRename={handleRenameAnimation}
                onSpeedChange={handleSpeedChange}
                onClear={handleClearFrames}
              />

              <div className="border-t border-gray-100" />

              <JsonExport
                imageName={imageName}
                grid={grid}
                animations={animations}
                image={image}
              />
            </div>
          </div>

          {/* Center - Canvas */}
          <div className="min-w-0">
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              {grid.isActive && (
                <div className="mb-3 flex items-center gap-4 text-xs text-gray-500">
                  <span>
                    Grilla: {grid.width}x{grid.height}px
                  </span>
                  <span>
                    Frames: {Math.floor((image?.width ?? 0) / grid.width) * Math.floor((image?.height ?? 0) / grid.height)}
                  </span>
                  {activeAnimation && (
                    <span className="text-indigo-600 font-medium">
                      Editando: {activeAnimation}
                    </span>
                  )}
                </div>
              )}
              <SpriteCanvas
                image={image}
                grid={grid}
                animations={animations}
                activeAnimation={activeAnimation}
                onFrameClick={handleFrameClick}
                onFrameRightClick={handleFrameRightClick}
              />
              {grid.isActive && (
                <p className="mt-2 text-xs text-gray-400">
                  Clic izquierdo: agregar frame | Clic derecho: quitar frame
                </p>
              )}
            </div>
          </div>

          {/* Right panel - Preview & Projects */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <AnimationPreview
                image={image}
                grid={grid}
                animations={animations}
                activeAnimation={activeAnimation}
              />
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <ProjectPanel
                image={image}
                imageName={imageName}
                grid={grid}
                animations={animations}
                onLoadProject={handleLoadProject}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
