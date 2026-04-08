import { useRef, useEffect, useState, useCallback } from 'react';

interface PixelAnimation {
  frames: number[];
  speed: number;
}

interface Props {
  animations: Record<string, PixelAnimation>;
  activeAnimation: string | null;
  canvasWidth: number;
  canvasHeight: number;
  getAllFramesAsDataURLs: (w: number, h: number) => string[];
}

export function AnimationPreview({
  animations,
  activeAnimation,
  canvasWidth,
  canvasHeight,
  getAllFramesAsDataURLs,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(true);
  const [currentFrame, setCurrentFrame] = useState(0);
  const frameImagesRef = useRef<HTMLImageElement[]>([]);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const anim = activeAnimation ? animations[activeAnimation] : null;
  const animFrames = anim?.frames ?? [];
  const speed = anim?.speed ?? 8;

  // Load frame images when frames change
  useEffect(() => {
    if (animFrames.length === 0) {
      frameImagesRef.current = [];
      return;
    }

    const urls = getAllFramesAsDataURLs(canvasWidth, canvasHeight);
    const images: HTMLImageElement[] = [];
    let loaded = 0;

    animFrames.forEach((frameIdx) => {
      const img = new Image();
      img.onload = () => {
        loaded++;
        if (loaded === animFrames.length) {
          frameImagesRef.current = images;
        }
      };
      img.src = urls[frameIdx] || '';
      images.push(img);
    });

    setCurrentFrame(0);
  }, [animFrames.join(','), canvasWidth, canvasHeight, getAllFramesAsDataURLs]);

  // Animation loop
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = Math.max(canvasWidth, canvasHeight);
    canvas.width = size;
    canvas.height = size;

    // Checkerboard background
    const tileSize = Math.max(4, Math.floor(size / 16));
    for (let y = 0; y < size; y += tileSize) {
      for (let x = 0; x < size; x += tileSize) {
        ctx.fillStyle = ((x + y) / tileSize) % 2 === 0 ? '#f0f0f0' : '#e0e0e0';
        ctx.fillRect(x, y, tileSize, tileSize);
      }
    }

    const images = frameImagesRef.current;
    if (images.length === 0 || currentFrame >= images.length) return;

    const img = images[currentFrame];
    if (!img || !img.complete) return;

    // Center the frame
    const offsetX = Math.floor((size - canvasWidth) / 2);
    const offsetY = Math.floor((size - canvasHeight) / 2);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, offsetX, offsetY);
  }, [currentFrame, canvasWidth, canvasHeight]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Animation timer
  useEffect(() => {
    if (!playing || animFrames.length <= 1) return;

    const interval = 1000 / speed;
    let running = true;

    const tick = (time: number) => {
      if (!running) return;
      if (time - lastTimeRef.current >= interval) {
        lastTimeRef.current = time;
        setCurrentFrame(prev => (prev + 1) % animFrames.length);
      }
      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [playing, speed, animFrames.length]);

  if (!activeAnimation || !anim || animFrames.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Vista previa</h3>
        <div className="aspect-square bg-gray-50 rounded-lg flex items-center justify-center">
          <p className="text-xs text-gray-400 text-center px-4">
            Crea una animacion y agrega frames para ver la vista previa
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">Vista previa: {activeAnimation}</h3>

      <canvas
        ref={canvasRef}
        className="w-full aspect-square rounded-lg border border-gray-200"
        style={{ imageRendering: 'pixelated' }}
      />

      {/* Controls */}
      <div className="flex items-center justify-between mt-3">
        <button
          onClick={() => setPlaying(!playing)}
          className="px-3 py-1 text-xs font-medium rounded-lg bg-gray-100 hover:bg-gray-200 transition"
        >
          {playing ? 'Pausar' : 'Play'}
        </button>

        <span className="text-[10px] text-gray-400">
          {currentFrame + 1}/{animFrames.length}
        </span>

        <div className="flex items-center gap-1">
          <span className="text-[10px] text-gray-400">{speed} FPS</span>
        </div>
      </div>
    </div>
  );
}
