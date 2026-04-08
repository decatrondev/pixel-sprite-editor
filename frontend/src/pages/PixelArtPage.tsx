import { useState, useRef, useEffect, useCallback } from 'react';
import type { Tool, EditorSettings } from '../types/pixelart';
import { usePixelCanvas } from '../hooks/usePixelCanvas';
import { useHistory } from '../hooks/useHistory';
import { useFrames } from '../hooks/useFrames';
import { drawBrush, eraseBrush, floodFill, getPixelColor, drawLineBresenham, drawRectanglePixels } from '../utils/canvas';
import { COLOR_PRESETS } from '../utils/color';
import { ToolBar } from '../components/pixelart/ToolBar';
import { PalettePanel } from '../components/pixelart/PalettePanel';
import { FramePanel } from '../components/pixelart/FramePanel';
import { CanvasControls } from '../components/pixelart/CanvasControls';
import { ExportDialog } from '../components/pixelart/ExportDialog';
import { ProjectPanel } from '../components/pixelart/ProjectPanel';
import { toast } from '../components/common/Toast';
import { AsepriteImport } from '../components/common/AsepriteImport';
import type { AsepriteFile } from '../utils/aseprite';

export function PixelArtPage() {
  const [canvasWidth, setCanvasWidth] = useState(64);
  const [canvasHeight, setCanvasHeight] = useState(64);
  const [selectedTool, setSelectedTool] = useState<Tool>('brush');
  const [brushSize, setBrushSize] = useState(1);
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [showGrid, setShowGrid] = useState(true);
  const [isDrawing, setIsDrawing] = useState(false);
  const [colorPalette, setColorPalette] = useState<string[]>([...COLOR_PRESETS.default.colors]);
  const [showExport, setShowExport] = useState(false);
  const [_projectId, setProjectId] = useState<number | null>(null);
  const [_projectName, setProjectName] = useState('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gridCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const tempImageDataRef = useRef<ImageData | null>(null);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  const pixelCanvas = usePixelCanvas(canvasRef, gridCanvasRef, previewCanvasRef, canvasWidth, canvasHeight);
  const history = useHistory();
  const frames = useFrames(canvasWidth, canvasHeight);

  // Initialize canvas
  useEffect(() => {
    pixelCanvas.createCanvas(canvasWidth, canvasHeight, pixelCanvas.pixelSize);
    frames.ensureFrames(canvasWidth, canvasHeight);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      history.saveState(ctx, canvasWidth, canvasHeight);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update canvas CSS sizing when pixelSize changes
  useEffect(() => {
    const canvas = canvasRef.current;
    const gridCanvas = gridCanvasRef.current;
    if (canvas) {
      canvas.style.width = `${canvasWidth * pixelCanvas.pixelSize}px`;
      canvas.style.height = `${canvasHeight * pixelCanvas.pixelSize}px`;
    }
    if (gridCanvas) {
      gridCanvas.style.width = `${canvasWidth * pixelCanvas.pixelSize}px`;
      gridCanvas.style.height = `${canvasHeight * pixelCanvas.pixelSize}px`;
    }
    drawGrid();
    pixelCanvas.updatePreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pixelCanvas.pixelSize, canvasWidth, canvasHeight, showGrid]);

  // Draw grid overlay
  const drawGrid = useCallback(() => {
    const gridCanvas = gridCanvasRef.current;
    if (!gridCanvas) return;
    const gctx = gridCanvas.getContext('2d');
    if (!gctx) return;

    gctx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
    if (!showGrid) return;

    gctx.strokeStyle = 'rgba(0,0,0,0.15)';
    gctx.lineWidth = 0.5 / pixelCanvas.pixelSize;

    for (let x = 0; x <= canvasWidth; x++) {
      gctx.beginPath();
      gctx.moveTo(x, 0);
      gctx.lineTo(x, canvasHeight);
      gctx.stroke();
    }
    for (let y = 0; y <= canvasHeight; y++) {
      gctx.beginPath();
      gctx.moveTo(0, y);
      gctx.lineTo(canvasWidth, y);
      gctx.stroke();
    }
  }, [showGrid, canvasWidth, canvasHeight, pixelCanvas.pixelSize]);

  const getCtx = useCallback(() => canvasRef.current?.getContext('2d') ?? null, []);

  // Drawing handlers
  const handleStartDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const ctx = getCtx();
    if (!ctx) return;

    const nativeEvent = 'nativeEvent' in e ? e.nativeEvent : e;
    const { x, y } = pixelCanvas.getCanvasCoordinates(nativeEvent as MouseEvent | TouchEvent);

    setIsDrawing(true);
    lastPosRef.current = { x, y };

    if (selectedTool === 'line' || selectedTool === 'rectangle') {
      startPosRef.current = { x, y };
      tempImageDataRef.current = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
      history.saveState(ctx, canvasWidth, canvasHeight);
    } else if (selectedTool === 'eyedropper') {
      const color = getPixelColor(ctx, x, y, canvasWidth);
      if (color !== 'transparent') {
        setSelectedColor(color);
        toast(`Color: ${color}`, 'info');
      }
      setIsDrawing(false);
    } else if (selectedTool === 'bucket') {
      history.saveState(ctx, canvasWidth, canvasHeight);
      floodFill(ctx, x, y, canvasWidth, canvasHeight, selectedColor);
      history.saveState(ctx, canvasWidth, canvasHeight);
      frames.saveCurrentFrame(ctx, canvasWidth, canvasHeight);
      pixelCanvas.updatePreview();
      setIsDrawing(false);
    } else {
      history.saveState(ctx, canvasWidth, canvasHeight);
      if (selectedTool === 'brush') {
        drawBrush(ctx, x, y, selectedColor, brushSize);
      } else if (selectedTool === 'eraser') {
        eraseBrush(ctx, x, y, brushSize);
      }
      pixelCanvas.updatePreview();
    }
  }, [selectedTool, selectedColor, brushSize, canvasWidth, canvasHeight, pixelCanvas, history, frames, getCtx]);

  const handleDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const ctx = getCtx();
    if (!ctx) return;

    const nativeEvent = 'nativeEvent' in e ? e.nativeEvent : e;
    const { x, y } = pixelCanvas.getCanvasCoordinates(nativeEvent as MouseEvent | TouchEvent);

    if (selectedTool === 'brush') {
      // Interpolate from last position
      const last = lastPosRef.current;
      if (last && (last.x !== x || last.y !== y)) {
        drawLineBresenhamBrush(ctx, last.x, last.y, x, y, selectedColor, brushSize);
      } else {
        drawBrush(ctx, x, y, selectedColor, brushSize);
      }
      lastPosRef.current = { x, y };
      pixelCanvas.updatePreview();
    } else if (selectedTool === 'eraser') {
      const last = lastPosRef.current;
      if (last && (last.x !== x || last.y !== y)) {
        drawLineBresenhamEraser(ctx, last.x, last.y, x, y, brushSize);
      } else {
        eraseBrush(ctx, x, y, brushSize);
      }
      lastPosRef.current = { x, y };
      pixelCanvas.updatePreview();
    } else if (selectedTool === 'line' && tempImageDataRef.current && startPosRef.current) {
      ctx.putImageData(tempImageDataRef.current, 0, 0);
      drawLineBresenham(ctx, startPosRef.current.x, startPosRef.current.y, x, y, selectedColor);
      pixelCanvas.updatePreview();
    } else if (selectedTool === 'rectangle' && tempImageDataRef.current && startPosRef.current) {
      ctx.putImageData(tempImageDataRef.current, 0, 0);
      drawRectanglePixels(ctx, startPosRef.current.x, startPosRef.current.y, x, y, selectedColor, false);
      pixelCanvas.updatePreview();
    }
  }, [isDrawing, selectedTool, selectedColor, brushSize, pixelCanvas, getCtx]);

  const handleStopDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const ctx = getCtx();
    if (!ctx) return;

    if (selectedTool === 'line' && tempImageDataRef.current && startPosRef.current) {
      const nativeEvent = 'nativeEvent' in e ? e.nativeEvent : e;
      const { x, y } = pixelCanvas.getCanvasCoordinates(nativeEvent as MouseEvent | TouchEvent);
      ctx.putImageData(tempImageDataRef.current, 0, 0);
      drawLineBresenham(ctx, startPosRef.current.x, startPosRef.current.y, x, y, selectedColor);
      history.saveState(ctx, canvasWidth, canvasHeight);
    } else if (selectedTool === 'rectangle' && tempImageDataRef.current && startPosRef.current) {
      const nativeEvent = 'nativeEvent' in e ? e.nativeEvent : e;
      const { x, y } = pixelCanvas.getCanvasCoordinates(nativeEvent as MouseEvent | TouchEvent);
      ctx.putImageData(tempImageDataRef.current, 0, 0);
      drawRectanglePixels(ctx, startPosRef.current.x, startPosRef.current.y, x, y, selectedColor, false);
      history.saveState(ctx, canvasWidth, canvasHeight);
    } else if (selectedTool === 'brush' || selectedTool === 'eraser') {
      history.saveState(ctx, canvasWidth, canvasHeight);
    }

    frames.saveCurrentFrame(ctx, canvasWidth, canvasHeight);
    pixelCanvas.updatePreview();
    setIsDrawing(false);
    startPosRef.current = null;
    tempImageDataRef.current = null;
    lastPosRef.current = null;
  }, [isDrawing, selectedTool, selectedColor, canvasWidth, canvasHeight, pixelCanvas, history, frames, getCtx]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault();
          const ctx = getCtx();
          if (ctx) {
            history.undo(ctx, canvasWidth, canvasHeight);
            pixelCanvas.updatePreview();
          }
        } else if (e.key === 'y') {
          e.preventDefault();
          const ctx = getCtx();
          if (ctx) {
            history.redo(ctx, canvasWidth, canvasHeight);
            pixelCanvas.updatePreview();
          }
        }
        return;
      }

      const toolMap: Record<string, Tool> = { b: 'brush', e: 'eraser', g: 'bucket', i: 'eyedropper', l: 'line', r: 'rectangle' };
      const tool = toolMap[e.key.toLowerCase()];
      if (tool) setSelectedTool(tool);
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [canvasWidth, canvasHeight, history, pixelCanvas, getCtx]);

  // Resize handler
  const handleResize = useCallback((w: number, h: number) => {
    const ctx = getCtx();
    if (!ctx) return;

    frames.saveCurrentFrame(ctx, canvasWidth, canvasHeight);
    frames.resizeFrames(w, h);

    setCanvasWidth(w);
    setCanvasHeight(h);

    // Need to defer canvas creation to after state update
    setTimeout(() => {
      pixelCanvas.createCanvas(w, h, pixelCanvas.pixelSize);
      const c = getCtx();
      if (c) {
        frames.loadCurrentFrame(c);
        history.clearHistory();
        history.saveState(c, w, h);
        pixelCanvas.updatePreview();
        drawGrid();
      }
    }, 0);
  }, [canvasWidth, canvasHeight, frames, history, pixelCanvas, getCtx, drawGrid]);

  // Clear canvas
  const handleClear = useCallback(() => {
    const ctx = getCtx();
    if (!ctx) return;
    history.saveState(ctx, canvasWidth, canvasHeight);
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    history.saveState(ctx, canvasWidth, canvasHeight);
    frames.saveCurrentFrame(ctx, canvasWidth, canvasHeight);
    pixelCanvas.updatePreview();
  }, [canvasWidth, canvasHeight, history, frames, pixelCanvas, getCtx]);

  // Frame handlers
  const handleAddFrame = useCallback(() => {
    const ctx = getCtx();
    if (!ctx) return;
    frames.addFrame(ctx, canvasWidth, canvasHeight);
    history.clearHistory();
    history.saveState(ctx, canvasWidth, canvasHeight);
    pixelCanvas.updatePreview();
  }, [canvasWidth, canvasHeight, frames, history, pixelCanvas, getCtx]);

  const handleDuplicateFrame = useCallback(() => {
    const ctx = getCtx();
    if (!ctx) return;
    frames.duplicateFrame(ctx, canvasWidth, canvasHeight);
    history.clearHistory();
    history.saveState(ctx, canvasWidth, canvasHeight);
    pixelCanvas.updatePreview();
  }, [canvasWidth, canvasHeight, frames, history, pixelCanvas, getCtx]);

  const handleDeleteFrame = useCallback(() => {
    const ctx = getCtx();
    if (!ctx) return;
    frames.deleteFrame(ctx, canvasWidth, canvasHeight);
    history.clearHistory();
    history.saveState(ctx, canvasWidth, canvasHeight);
    pixelCanvas.updatePreview();
  }, [canvasWidth, canvasHeight, frames, history, pixelCanvas, getCtx]);

  const handlePrevFrame = useCallback(() => {
    const ctx = getCtx();
    if (!ctx) return;
    frames.prevFrame(ctx, canvasWidth, canvasHeight);
    history.clearHistory();
    history.saveState(ctx, canvasWidth, canvasHeight);
    pixelCanvas.updatePreview();
  }, [canvasWidth, canvasHeight, frames, history, pixelCanvas, getCtx]);

  const handleNextFrame = useCallback(() => {
    const ctx = getCtx();
    if (!ctx) return;
    frames.nextFrame(ctx, canvasWidth, canvasHeight);
    history.clearHistory();
    history.saveState(ctx, canvasWidth, canvasHeight);
    pixelCanvas.updatePreview();
  }, [canvasWidth, canvasHeight, frames, history, pixelCanvas, getCtx]);

  // Load project handler
  const handleLoadProject = useCallback((data: {
    width: number;
    height: number;
    imageData: string;
    palette: string[];
    settings: EditorSettings;
    projectId: number;
    projectName: string;
  }) => {
    setCanvasWidth(data.width);
    setCanvasHeight(data.height);
    setColorPalette(data.palette);
    setSelectedTool(data.settings.selectedTool || 'brush');
    setBrushSize(data.settings.brushSize || 1);
    setSelectedColor(data.settings.selectedColor || '#000000');
    setShowGrid(data.settings.showGrid ?? true);
    setProjectId(data.projectId);
    setProjectName(data.projectName);

    setTimeout(() => {
      pixelCanvas.createCanvas(data.width, data.height, pixelCanvas.pixelSize);
      const ctx = getCtx();
      if (ctx) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, data.width, data.height);
          ctx.drawImage(img, 0, 0);
          frames.loadCurrentFrame(ctx);
          history.clearHistory();
          history.saveState(ctx, data.width, data.height);
          pixelCanvas.updatePreview();
          drawGrid();
        };
        img.src = data.imageData;
      }
    }, 0);
  }, [pixelCanvas, history, frames, getCtx, drawGrid]);

  const handleAsepriteImport = useCallback((aseFile: AsepriteFile) => {
    const w = aseFile.width;
    const h = aseFile.height;
    setCanvasWidth(w);
    setCanvasHeight(h);

    if (aseFile.palette.length > 0) {
      setColorPalette(aseFile.palette);
    }

    setTimeout(() => {
      pixelCanvas.createCanvas(w, h, pixelCanvas.pixelSize);
      const ctx = getCtx();
      if (!ctx) return;

      // Load first frame to canvas
      ctx.putImageData(aseFile.frames[0].imageData, 0, 0);

      // Load all frames
      const frameImageDatas = aseFile.frames.map(f => f.imageData);
      frames.loadFromImageDatas(frameImageDatas, w, h);

      history.clearHistory();
      history.saveState(ctx, w, h);
      pixelCanvas.updatePreview();
      drawGrid();

      // Log tags info
      if (aseFile.tags.length > 0) {
        const tagNames = aseFile.tags.map(t => `${t.name} (${t.from}-${t.to})`).join(', ');
        toast(`Tags encontrados: ${tagNames}`, 'info');
      }
    }, 0);
  }, [pixelCanvas, history, frames, getCtx, drawGrid]);

  const currentSettings: EditorSettings = {
    showGrid,
    brushSize,
    selectedTool,
    selectedColor,
  };

  const cursorStyle = selectedTool === 'eyedropper' ? 'crosshair'
    : selectedTool === 'bucket' ? 'cell'
    : 'default';

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Editor de Pixel Art</h1>
        <div className="flex gap-2">
          <button
            onClick={() => { const ctx = getCtx(); if (ctx) { history.undo(ctx, canvasWidth, canvasHeight); pixelCanvas.updatePreview(); } }}
            disabled={!history.canUndo}
            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 transition"
            title="Deshacer (Ctrl+Z)"
          >
            ↩ Deshacer
          </button>
          <button
            onClick={() => { const ctx = getCtx(); if (ctx) { history.redo(ctx, canvasWidth, canvasHeight); pixelCanvas.updatePreview(); } }}
            disabled={!history.canRedo}
            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 transition"
            title="Rehacer (Ctrl+Y)"
          >
            ↪ Rehacer
          </button>
          <button
            onClick={handleClear}
            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition"
          >
            Limpiar
          </button>
          <AsepriteImport
            onImport={handleAsepriteImport}
            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 transition"
            label=".aseprite"
          />
          <button
            onClick={() => setShowExport(true)}
            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
          >
            Exportar
          </button>
        </div>
      </div>

      {/* Canvas controls bar */}
      <CanvasControls
        canvasWidth={canvasWidth}
        canvasHeight={canvasHeight}
        pixelSize={pixelCanvas.pixelSize}
        showGrid={showGrid}
        onResize={handleResize}
        onZoomIn={pixelCanvas.zoomIn}
        onZoomOut={pixelCanvas.zoomOut}
        onToggleGrid={() => setShowGrid(g => !g)}
      />

      {/* Main 3-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr_240px] gap-4 mt-4">
        {/* Left panel */}
        <div className="space-y-4">
          <ToolBar
            selectedTool={selectedTool}
            brushSize={brushSize}
            onSelectTool={setSelectedTool}
            onSetBrushSize={setBrushSize}
          />
          <PalettePanel
            colorPalette={colorPalette}
            selectedColor={selectedColor}
            onSelectColor={setSelectedColor}
            onSetPalette={setColorPalette}
          />
        </div>

        {/* Center: Canvas */}
        <div className="flex flex-col items-center gap-4">
          <div
            className="relative overflow-auto bg-gray-100 rounded-xl border border-gray-200 p-4"
            style={{ maxHeight: '70vh' }}
          >
            {/* Checkerboard background for transparency */}
            <div
              className="relative"
              style={{
                width: canvasWidth * pixelCanvas.pixelSize,
                height: canvasHeight * pixelCanvas.pixelSize,
                backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
                backgroundSize: `${pixelCanvas.pixelSize * 2}px ${pixelCanvas.pixelSize * 2}px`,
                backgroundPosition: `0 0, 0 ${pixelCanvas.pixelSize}px, ${pixelCanvas.pixelSize}px -${pixelCanvas.pixelSize}px, -${pixelCanvas.pixelSize}px 0`,
              }}
            >
              <canvas
                ref={canvasRef}
                className="absolute top-0 left-0"
                style={{
                  imageRendering: 'pixelated',
                  cursor: cursorStyle,
                }}
                onMouseDown={handleStartDrawing}
                onMouseMove={handleDraw}
                onMouseUp={handleStopDrawing}
                onMouseLeave={handleStopDrawing}
                onTouchStart={handleStartDrawing}
                onTouchMove={handleDraw}
                onTouchEnd={handleStopDrawing}
              />
              <canvas
                ref={gridCanvasRef}
                className="absolute top-0 left-0 pointer-events-none"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>
          </div>

          {/* Preview */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Vista previa</h3>
            <div className="inline-block bg-gray-100 rounded-lg p-2">
              <canvas
                ref={previewCanvasRef}
                style={{ imageRendering: 'pixelated' }}
                className="border border-gray-200"
              />
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          <FramePanel
            frameCount={frames.frameCount}
            currentFrameIndex={frames.currentFrameIndex}
            onAddFrame={handleAddFrame}
            onDuplicateFrame={handleDuplicateFrame}
            onDeleteFrame={handleDeleteFrame}
            onPrevFrame={handlePrevFrame}
            onNextFrame={handleNextFrame}
          />
          <ProjectPanel
            canvasRef={canvasRef}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            colorPalette={colorPalette}
            settings={currentSettings}
            getAllFramesAsDataURLs={frames.getAllFramesAsDataURLs}
            loadFramesFromData={frames.loadFramesFromData}
            onLoadProject={handleLoadProject}
          />
        </div>
      </div>

      {/* Export dialog */}
      <ExportDialog
        open={showExport}
        onClose={() => setShowExport(false)}
        canvasRef={canvasRef}
        canvasWidth={canvasWidth}
        canvasHeight={canvasHeight}
        getAllFramesAsDataURLs={frames.getAllFramesAsDataURLs}
        frameCount={frames.frameCount}
      />
    </div>
  );
}

// Helper: draw brush along a bresenham line (for smooth strokes)
function drawLineBresenhamBrush(
  ctx: CanvasRenderingContext2D,
  x0: number, y0: number,
  x1: number, y1: number,
  color: string, size: number
) {
  let dx = Math.abs(x1 - x0);
  let dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  while (true) {
    drawBrush(ctx, x0, y0, color, size);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

function drawLineBresenhamEraser(
  ctx: CanvasRenderingContext2D,
  x0: number, y0: number,
  x1: number, y1: number,
  size: number
) {
  let dx = Math.abs(x1 - x0);
  let dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  while (true) {
    eraseBrush(ctx, x0, y0, size);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}
