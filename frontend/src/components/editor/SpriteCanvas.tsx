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
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredFrame, setHoveredFrame] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);

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

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0);

    if (!grid.isActive) return;

    const columns = Math.floor(canvas.width / grid.width);
    const rows = Math.floor(canvas.height / grid.height);

    // Draw selected frames with visible border and order number
    if (activeAnimation && animations[activeAnimation]) {
      const selectedFrames = animations[activeAnimation].frames;

      for (let i = 0; i < selectedFrames.length; i++) {
        const frameIndex = selectedFrames[i];
        const col = frameIndex % columns;
        const row = Math.floor(frameIndex / columns);
        const fx = col * grid.width;
        const fy = row * grid.height;

        // Blue overlay
        ctx.fillStyle = 'rgba(59, 130, 246, 0.25)';
        ctx.fillRect(fx, fy, grid.width, grid.height);

        // Visible border
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.9)';
        ctx.lineWidth = 3;
        ctx.strokeRect(fx + 1.5, fy + 1.5, grid.width - 3, grid.height - 3);

        // Order badge (top-left corner)
        const badgeSize = Math.max(14, Math.min(grid.width, grid.height) * 0.3);
        const badgePad = 3;
        ctx.fillStyle = 'rgba(59, 130, 246, 0.95)';
        ctx.beginPath();
        ctx.roundRect(fx + badgePad, fy + badgePad, badgeSize, badgeSize, 3);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.max(9, badgeSize * 0.65)}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(i + 1), fx + badgePad + badgeSize / 2, fy + badgePad + badgeSize / 2);
      }
    }

    // Draw hovered frame (yellow overlay)
    if (hoveredFrame !== null) {
      const col = hoveredFrame % columns;
      const row = Math.floor(hoveredFrame / columns);
      ctx.fillStyle = 'rgba(234, 179, 8, 0.25)';
      ctx.fillRect(col * grid.width, row * grid.height, grid.width, grid.height);
      ctx.strokeStyle = 'rgba(234, 179, 8, 0.9)';
      ctx.lineWidth = 2;
      ctx.strokeRect(col * grid.width, row * grid.height, grid.width, grid.height);
    }

    // Draw grid lines
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.5)';
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

    // Draw frame numbers (center of each frame)
    const fontSize = Math.max(10, Math.min(grid.width, grid.height) * 0.2);
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < columns; c++) {
        const frameIndex = r * columns + c;
        const cx = c * grid.width + grid.width / 2;
        const cy = r * grid.height + grid.height / 2;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillText(String(frameIndex), cx + 1, cy + 1);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillText(String(frameIndex), cx, cy);
      }
    }
  }, [image, grid, animations, activeAnimation, hoveredFrame]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Reset zoom when image changes
  useEffect(() => {
    setZoom(1);
  }, [image]);

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

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoom(prev => {
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        return Math.max(0.25, Math.min(5, prev + delta));
      });
    }
  }, []);

  const zoomIn = () => setZoom(prev => Math.min(5, prev + 0.25));
  const zoomOut = () => setZoom(prev => Math.max(0.25, prev - 0.25));
  const zoomReset = () => setZoom(1);

  if (!image) return null;

  return (
    <div className="space-y-3">
      {/* Zoom controls */}
      <div className="flex items-center gap-2">
        <button onClick={zoomOut} className="px-2 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200 transition" title="Alejar">
          -
        </button>
        <button onClick={zoomReset} className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200 transition min-w-[60px]">
          {Math.round(zoom * 100)}%
        </button>
        <button onClick={zoomIn} className="px-2 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200 transition" title="Acercar">
          +
        </button>
        <span className="text-xs text-gray-400 ml-2">Ctrl + scroll para zoom</span>
      </div>

      {/* Canvas container with scroll */}
      <div
        ref={containerRef}
        className="overflow-auto border border-gray-200 rounded-lg bg-[repeating-conic-gradient(#e5e7eb_0%_25%,transparent_0%_50%)_50%/16px_16px]"
        style={{ maxHeight: '70vh' }}
        onWheel={handleWheel}
      >
        <canvas
          ref={canvasRef}
          onClick={handleClick}
          onContextMenu={handleContextMenu}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="cursor-crosshair block"
          style={{
            imageRendering: 'pixelated',
            width: image ? `${image.width * zoom}px` : undefined,
            height: image ? `${image.height * zoom}px` : undefined,
          }}
        />
      </div>

      {/* Info bar */}
      <div className="flex items-center gap-4 text-xs text-gray-400">
        <span>{image.width}x{image.height}px</span>
        {hoveredFrame !== null && (
          <span className="text-gray-600">Frame: {hoveredFrame}</span>
        )}
        {activeAnimation && animations[activeAnimation] && (
          <span className="text-indigo-500">
            {animations[activeAnimation].frames.length} frames seleccionados
          </span>
        )}
      </div>
    </div>
  );
}
