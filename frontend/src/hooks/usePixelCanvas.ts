import { useState, useCallback, type RefObject } from 'react';

export function usePixelCanvas(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  gridCanvasRef: RefObject<HTMLCanvasElement | null>,
  previewCanvasRef: RefObject<HTMLCanvasElement | null>,
  canvasWidth: number,
  canvasHeight: number
) {
  const [pixelSize, setPixelSizeState] = useState(12);

  const setPixelSize = useCallback((size: number) => {
    setPixelSizeState(Math.max(4, Math.min(24, size)));
  }, []);

  const zoomIn = useCallback(() => {
    setPixelSizeState(prev => Math.min(24, prev + 2));
  }, []);

  const zoomOut = useCallback(() => {
    setPixelSizeState(prev => Math.max(4, prev - 2));
  }, []);

  const createCanvas = useCallback((w: number, h: number, currentPixelSize?: number) => {
    const ps = currentPixelSize ?? pixelSize;
    const canvas = canvasRef.current;
    const gridCanvas = gridCanvasRef.current;
    const preview = previewCanvasRef.current;

    if (canvas) {
      canvas.width = w;
      canvas.height = h;
      canvas.style.width = `${w * ps}px`;
      canvas.style.height = `${h * ps}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.imageSmoothingEnabled = false;
    }

    if (gridCanvas) {
      gridCanvas.width = w;
      gridCanvas.height = h;
      gridCanvas.style.width = `${w * ps}px`;
      gridCanvas.style.height = `${h * ps}px`;
    }

    if (preview) {
      const pw = Math.max(w * 4, 128);
      const ph = Math.max(h * 4, 128);
      preview.width = pw;
      preview.height = ph;
      const pctx = preview.getContext('2d');
      if (pctx) pctx.imageSmoothingEnabled = false;
    }
  }, [canvasRef, gridCanvasRef, previewCanvasRef, pixelSize]);

  const resizeCanvas = useCallback((newW: number, newH: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    createCanvas(newW, newH);
    ctx.putImageData(imageData, 0, 0);
  }, [canvasRef, createCanvas]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, [canvasRef]);

  const updatePreview = useCallback(() => {
    const canvas = canvasRef.current;
    const preview = previewCanvasRef.current;
    if (!canvas || !preview) return;
    const pctx = preview.getContext('2d');
    if (!pctx) return;
    pctx.imageSmoothingEnabled = false;
    pctx.clearRect(0, 0, preview.width, preview.height);
    pctx.drawImage(canvas, 0, 0, preview.width, preview.height);
  }, [canvasRef, previewCanvasRef]);

  const getCanvasCoordinates = useCallback((e: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;

    let clientX: number, clientY: number;
    if ('touches' in e) {
      const touch = e.touches[0] || (e as TouchEvent).changedTouches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    }

    const x = Math.floor((clientX - rect.left) / scaleX);
    const y = Math.floor((clientY - rect.top) / scaleY);

    return {
      x: Math.max(0, Math.min(canvasWidth - 1, x)),
      y: Math.max(0, Math.min(canvasHeight - 1, y)),
    };
  }, [canvasRef, canvasWidth, canvasHeight]);

  const getImageData = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }, [canvasRef]);

  const putImageData = useCallback((data: ImageData) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.putImageData(data, 0, 0);
  }, [canvasRef]);

  const getDataURL = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return '';
    return canvas.toDataURL('image/png');
  }, [canvasRef]);

  return {
    pixelSize,
    setPixelSize,
    zoomIn,
    zoomOut,
    createCanvas,
    resizeCanvas,
    clearCanvas,
    updatePreview,
    getCanvasCoordinates,
    getImageData,
    putImageData,
    getDataURL,
  };
}
