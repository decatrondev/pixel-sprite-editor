import { useState, useRef, useCallback } from 'react';

export function useFrames(initialWidth: number, initialHeight: number) {
  const framesRef = useRef<ImageData[]>([]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [frameCount, setFrameCount] = useState(1);
  const [exportBackgroundColor, setExportBackgroundColor] = useState('transparent');

  // Initialize first frame if empty
  const ensureFrames = useCallback((w: number, h: number) => {
    if (framesRef.current.length === 0) {
      framesRef.current = [new ImageData(w, h)];
      setFrameCount(1);
      setCurrentFrameIndex(0);
    }
  }, []);

  const saveCurrentFrame = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ensureFrames(w, h);
    framesRef.current[currentFrameIndex] = ctx.getImageData(0, 0, w, h);
  }, [currentFrameIndex, ensureFrames]);

  const loadCurrentFrame = useCallback((ctx: CanvasRenderingContext2D) => {
    if (framesRef.current[currentFrameIndex]) {
      ctx.putImageData(framesRef.current[currentFrameIndex], 0, 0);
    }
  }, [currentFrameIndex]);

  const addFrame = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    saveCurrentFrame(ctx, w, h);
    framesRef.current.push(new ImageData(w, h));
    const newIndex = framesRef.current.length - 1;
    setCurrentFrameIndex(newIndex);
    setFrameCount(framesRef.current.length);
    ctx.clearRect(0, 0, w, h);
  }, [saveCurrentFrame]);

  const duplicateFrame = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    saveCurrentFrame(ctx, w, h);
    const current = framesRef.current[currentFrameIndex];
    const copy = new ImageData(new Uint8ClampedArray(current.data), current.width, current.height);
    framesRef.current.splice(currentFrameIndex + 1, 0, copy);
    setCurrentFrameIndex(currentFrameIndex + 1);
    setFrameCount(framesRef.current.length);
  }, [currentFrameIndex, saveCurrentFrame]);

  const deleteFrame = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    if (framesRef.current.length <= 1) return;
    framesRef.current.splice(currentFrameIndex, 1);
    const newIndex = Math.min(currentFrameIndex, framesRef.current.length - 1);
    setCurrentFrameIndex(newIndex);
    setFrameCount(framesRef.current.length);
    const frame = framesRef.current[newIndex];
    if (frame) {
      ctx.clearRect(0, 0, w, h);
      ctx.putImageData(frame, 0, 0);
    }
  }, [currentFrameIndex]);

  const prevFrame = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    if (currentFrameIndex <= 0) return;
    saveCurrentFrame(ctx, w, h);
    const newIndex = currentFrameIndex - 1;
    setCurrentFrameIndex(newIndex);
    ctx.clearRect(0, 0, w, h);
    ctx.putImageData(framesRef.current[newIndex], 0, 0);
  }, [currentFrameIndex, saveCurrentFrame]);

  const nextFrame = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    if (currentFrameIndex >= framesRef.current.length - 1) return;
    saveCurrentFrame(ctx, w, h);
    const newIndex = currentFrameIndex + 1;
    setCurrentFrameIndex(newIndex);
    ctx.clearRect(0, 0, w, h);
    ctx.putImageData(framesRef.current[newIndex], 0, 0);
  }, [currentFrameIndex, saveCurrentFrame]);

  const setCurrentFrame = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, index: number) => {
    if (index < 0 || index >= framesRef.current.length) return;
    saveCurrentFrame(ctx, w, h);
    setCurrentFrameIndex(index);
    ctx.clearRect(0, 0, w, h);
    ctx.putImageData(framesRef.current[index], 0, 0);
  }, [saveCurrentFrame]);

  const getAllFramesAsDataURLs = useCallback((w: number, h: number): string[] => {
    const urls: string[] = [];
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tctx = tempCanvas.getContext('2d')!;
    tctx.imageSmoothingEnabled = false;

    for (const frame of framesRef.current) {
      tctx.clearRect(0, 0, w, h);
      if (exportBackgroundColor !== 'transparent') {
        tctx.fillStyle = exportBackgroundColor;
        tctx.fillRect(0, 0, w, h);
      }
      tctx.putImageData(frame, 0, 0);
      urls.push(tempCanvas.toDataURL('image/png'));
    }
    return urls;
  }, [exportBackgroundColor]);

  const loadFramesFromData = useCallback((dataURLs: string[], w: number, h: number) => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tctx = tempCanvas.getContext('2d')!;

    const loaded: ImageData[] = [];
    let remaining = dataURLs.length;

    return new Promise<void>((resolve) => {
      dataURLs.forEach((url, i) => {
        const img = new Image();
        img.onload = () => {
          tctx.clearRect(0, 0, w, h);
          tctx.drawImage(img, 0, 0);
          loaded[i] = tctx.getImageData(0, 0, w, h);
          remaining--;
          if (remaining === 0) {
            framesRef.current = loaded;
            setFrameCount(loaded.length);
            setCurrentFrameIndex(0);
            resolve();
          }
        };
        img.src = url;
      });
    });
  }, []);

  const resizeFrames = useCallback((newW: number, newH: number) => {
    const tempCanvas = document.createElement('canvas');
    const tctx = tempCanvas.getContext('2d')!;

    framesRef.current = framesRef.current.map(frame => {
      tempCanvas.width = frame.width;
      tempCanvas.height = frame.height;
      tctx.putImageData(frame, 0, 0);

      const newCanvas = document.createElement('canvas');
      newCanvas.width = newW;
      newCanvas.height = newH;
      const nctx = newCanvas.getContext('2d')!;
      nctx.drawImage(tempCanvas, 0, 0);
      return nctx.getImageData(0, 0, newW, newH);
    });
  }, []);

  const getFrameCount = useCallback(() => framesRef.current.length, []);

  // Expose initialWidth/Height for external reference
  void initialWidth;
  void initialHeight;

  return {
    frames: framesRef,
    currentFrameIndex,
    frameCount,
    addFrame,
    duplicateFrame,
    deleteFrame,
    prevFrame,
    nextFrame,
    saveCurrentFrame,
    loadCurrentFrame,
    setCurrentFrame,
    getAllFramesAsDataURLs,
    loadFramesFromData,
    resizeFrames,
    getFrameCount,
    exportBackgroundColor,
    setExportBackgroundColor,
    ensureFrames,
  };
}
