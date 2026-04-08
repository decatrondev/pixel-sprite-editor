import { useRef, useEffect, useCallback, useState } from 'react';
import type { GridConfig, Animation } from '../../types/editor';

interface SpriteCanvasProps {
  image: HTMLImageElement | null;
  grid: GridConfig;
  animations: Record<string, Animation>;
  activeAnimation: string | null;
  onFrameClick: (frameIndex: number) => void;
  onFrameRightClick: (frameIndex: number) => void;
}

export function SpriteCanvas({
  image,
  grid,
  animations,
  activeAnimation,
  onFrameClick,
  onFrameRightClick,
}: SpriteCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredFrame, setHoveredFrame] = useState<number | null>(null);

  const getFrameFromEvent = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>): number | null => {
      const canvas = canvasRef.current;
      if (!canvas || !image || !grid.isActive) return null;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (event.clientX - rect.left) * scaleX;
      const y = (event.clientY - rect.top) * scaleY;

      if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return null;

      const columns = Math.floor(canvas.width / grid.width);
      const col = Math.floor(x / grid.width);
      const row = Math.floor(y / grid.height);
      const totalFrames = columns * Math.floor(canvas.height / grid.height);
      const frameIndex = row * columns + col;

      return frameIndex < totalFrames ? frameIndex : null;
    },
    [image, grid]
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = image.width;
    canvas.height = image.height;

    // Draw image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0);

    if (!grid.isActive) return;

    const columns = Math.floor(canvas.width / grid.width);
    const rows = Math.floor(canvas.height / grid.height);

    // Draw selected frames (blue overlay)
    if (activeAnimation && animations[activeAnimation]) {
      const selectedFrames = animations[activeAnimation].frames;
      ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
      for (const frameIndex of selectedFrames) {
        const col = frameIndex % columns;
        const row = Math.floor(frameIndex / columns);
        ctx.fillRect(col * grid.width, row * grid.height, grid.width, grid.height);
      }
    }

    // Draw hovered frame (yellow overlay)
    if (hoveredFrame !== null) {
      const col = hoveredFrame % columns;
      const row = Math.floor(hoveredFrame / columns);
      ctx.fillStyle = 'rgba(234, 179, 8, 0.3)';
      ctx.fillRect(col * grid.width, row * grid.height, grid.width, grid.height);
      ctx.strokeStyle = 'rgba(234, 179, 8, 0.8)';
      ctx.lineWidth = 2;
      ctx.strokeRect(col * grid.width, row * grid.height, grid.width, grid.height);
    }

    // Draw grid lines
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.6)';
    ctx.lineWidth = 1;

    for (let x = 0; x <= canvas.width; x += grid.width) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += grid.height) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw frame numbers
    const fontSize = Math.max(10, Math.min(grid.width, grid.height) * 0.25);
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < columns; c++) {
        const frameIndex = r * columns + c;
        const cx = c * grid.width + grid.width / 2;
        const cy = r * grid.height + grid.height / 2;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillText(String(frameIndex), cx + 1, cy + 1);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillText(String(frameIndex), cx, cy);
      }
    }
  }, [image, grid, animations, activeAnimation, hoveredFrame]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const frame = getFrameFromEvent(e);
      if (frame !== null) onFrameClick(frame);
    },
    [getFrameFromEvent, onFrameClick]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const frame = getFrameFromEvent(e);
      if (frame !== null) onFrameRightClick(frame);
    },
    [getFrameFromEvent, onFrameRightClick]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const frame = getFrameFromEvent(e);
      setHoveredFrame(frame);
    },
    [getFrameFromEvent]
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredFrame(null);
  }, []);

  if (!image) return null;

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="w-full h-auto border border-gray-300 rounded-lg cursor-crosshair"
        style={{ imageRendering: 'pixelated' }}
      />
      {hoveredFrame !== null && (
        <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
          Frame: {hoveredFrame}
        </div>
      )}
    </div>
  );
}
