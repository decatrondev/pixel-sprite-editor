import { useRef, useState, useCallback } from 'react';
import type { HistoryEntry } from '../types/pixelart';

const MAX_HISTORY = 50;

export function useHistory() {
  const historyRef = useRef<HistoryEntry[]>([]);
  const indexRef = useRef(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const updateFlags = useCallback(() => {
    setCanUndo(indexRef.current > 0);
    setCanRedo(indexRef.current < historyRef.current.length - 1);
  }, []);

  const saveState = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const imageData = ctx.getImageData(0, 0, width, height);
    // Remove any redo states
    historyRef.current = historyRef.current.slice(0, indexRef.current + 1);
    historyRef.current.push({ imageData, canvasWidth: width, canvasHeight: height });
    // Trim to max
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift();
    }
    indexRef.current = historyRef.current.length - 1;
    updateFlags();
  }, [updateFlags]);

  const undo = useCallback((ctx: CanvasRenderingContext2D, _width: number, _height: number): HistoryEntry | null => {
    if (indexRef.current <= 0) return null;
    indexRef.current--;
    const entry = historyRef.current[indexRef.current];
    ctx.putImageData(entry.imageData, 0, 0);
    updateFlags();
    return entry;
  }, [updateFlags]);

  const redo = useCallback((ctx: CanvasRenderingContext2D, _width: number, _height: number): HistoryEntry | null => {
    if (indexRef.current >= historyRef.current.length - 1) return null;
    indexRef.current++;
    const entry = historyRef.current[indexRef.current];
    ctx.putImageData(entry.imageData, 0, 0);
    updateFlags();
    return entry;
  }, [updateFlags]);

  const clearHistory = useCallback(() => {
    historyRef.current = [];
    indexRef.current = -1;
    updateFlags();
  }, [updateFlags]);

  return { saveState, undo, redo, clearHistory, canUndo, canRedo };
}
