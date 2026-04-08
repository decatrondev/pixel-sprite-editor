import { useRef, useEffect, useState, useCallback } from 'react';
import type { GridConfig, Animation } from '../../types/editor';

interface AnimationPreviewProps {
  image: HTMLImageElement | null;
  grid: GridConfig;
  animations: Record<string, Animation>;
  activeAnimation: string | null;
}

export function AnimationPreview({ image, grid, animations, activeAnimation }: AnimationPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(true);
  const [currentFrameIdx, setCurrentFrameIdx] = useState(0);
  const frameIdxRef = useRef(0);
  const lastTimeRef = useRef(0);
  const rafRef = useRef<number>(0);

  const anim = activeAnimation ? animations[activeAnimation] : null;
  const frames = anim?.frames ?? [];
  const speed = anim?.speed ?? 8;

  const drawFrame = useCallback(
    (frameIndex: number) => {
      const canvas = canvasRef.current;
      if (!canvas || !image || !grid.isActive) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;

      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      // Checkerboard background
      const checkSize = 8;
      for (let y = 0; y < canvasHeight; y += checkSize) {
        for (let x = 0; x < canvasWidth; x += checkSize) {
          ctx.fillStyle = (Math.floor(x / checkSize) + Math.floor(y / checkSize)) % 2 === 0
            ? '#e5e7eb'
            : '#f3f4f6';
          ctx.fillRect(x, y, checkSize, checkSize);
        }
      }

      if (frames.length === 0) return;

      const columns = Math.floor(image.width / grid.width);
      const col = frameIndex % columns;
      const row = Math.floor(frameIndex / columns);

      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        image,
        col * grid.width,
        row * grid.height,
        grid.width,
        grid.height,
        0,
        0,
        canvasWidth,
        canvasHeight
      );
    },
    [image, grid, frames.length]
  );

  useEffect(() => {
    frameIdxRef.current = 0;
    setCurrentFrameIdx(0);
    lastTimeRef.current = 0;
  }, [activeAnimation]);

  useEffect(() => {
    if (!playing || frames.length === 0) {
      drawFrame(frames.length > 0 ? frames[frameIdxRef.current % frames.length] : 0);
      return;
    }

    const interval = 1000 / speed;

    const animate = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;

      const elapsed = timestamp - lastTimeRef.current;
      if (elapsed >= interval) {
        lastTimeRef.current = timestamp - (elapsed % interval);
        frameIdxRef.current = (frameIdxRef.current + 1) % frames.length;
        setCurrentFrameIdx(frameIdxRef.current);
      }

      drawFrame(frames[frameIdxRef.current]);
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, frames, speed, drawFrame]);

  // Draw initial frame when not animating
  useEffect(() => {
    if (!playing && frames.length > 0) {
      drawFrame(frames[frameIdxRef.current % frames.length]);
    } else if (frames.length === 0) {
      drawFrame(0);
    }
  }, [playing, frames, drawFrame]);

  if (!activeAnimation) {
    return (
      <div className="text-center text-xs text-gray-400 py-8">
        Selecciona una animacion para ver la vista previa.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Vista Previa</h3>

      <div className="flex justify-center">
        <canvas
          ref={canvasRef}
          width={128}
          height={128}
          className="border border-gray-300 rounded-lg"
          style={{ imageRendering: 'pixelated', width: 128, height: 128 }}
        />
      </div>

      {frames.length > 0 && (
        <>
          <div className="text-center text-xs text-gray-500 font-mono">
            Frame {currentFrameIdx + 1} / {frames.length}
            {' '}(#{frames[currentFrameIdx % frames.length]})
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setPlaying(!playing)}
              className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              {playing ? 'Pausar' : 'Reproducir'}
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Velocidad:</span>
            <input
              type="range"
              min={1}
              max={60}
              value={speed}
              disabled
              className="flex-1"
            />
            <span className="font-mono w-10 text-right">{speed} FPS</span>
          </div>
        </>
      )}

      {frames.length === 0 && (
        <p className="text-xs text-gray-400 text-center">
          Haz clic en los frames del canvas para agregarlos a esta animacion.
        </p>
      )}
    </div>
  );
}
