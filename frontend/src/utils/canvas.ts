export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace('#', '');
  let r: number, g: number, b: number;
  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16);
    g = parseInt(clean[1] + clean[1], 16);
    b = parseInt(clean[2] + clean[2], 16);
  } else if (clean.length === 6) {
    r = parseInt(clean.substring(0, 2), 16);
    g = parseInt(clean.substring(2, 4), 16);
    b = parseInt(clean.substring(4, 6), 16);
  } else {
    return null;
  }
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  return { r, g, b };
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
}

export function getPixelColor(ctx: CanvasRenderingContext2D, x: number, y: number, _width: number): string | 'transparent' {
  const pixel = ctx.getImageData(x, y, 1, 1).data;
  if (pixel[3] === 0) return 'transparent';
  return rgbToHex(pixel[0], pixel[1], pixel[2]);
}

export function setPixelColor(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  const rgb = hexToRgb(color);
  if (!rgb) return;
  const id = ctx.createImageData(1, 1);
  id.data[0] = rgb.r;
  id.data[1] = rgb.g;
  id.data[2] = rgb.b;
  id.data[3] = 255;
  ctx.putImageData(id, x, y);
}

export function clearPixel(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.clearRect(x, y, 1, 1);
}

export function floodFill(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  canvasWidth: number,
  canvasHeight: number,
  fillColor: string
): void {
  const rgb = hexToRgb(fillColor);
  if (!rgb) return;

  const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
  const data = imageData.data;

  const idx = (startY * canvasWidth + startX) * 4;
  const targetR = data[idx];
  const targetG = data[idx + 1];
  const targetB = data[idx + 2];
  const targetA = data[idx + 3];

  if (targetR === rgb.r && targetG === rgb.g && targetB === rgb.b && targetA === 255) return;

  const visited = new Set<number>();
  const stack: [number, number][] = [[startX, startY]];

  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    const key = y * canvasWidth + x;
    if (x < 0 || x >= canvasWidth || y < 0 || y >= canvasHeight) continue;
    if (visited.has(key)) continue;

    const i = key * 4;
    if (data[i] !== targetR || data[i + 1] !== targetG || data[i + 2] !== targetB || data[i + 3] !== targetA) continue;

    visited.add(key);
    data[i] = rgb.r;
    data[i + 1] = rgb.g;
    data[i + 2] = rgb.b;
    data[i + 3] = 255;

    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  ctx.putImageData(imageData, 0, 0);
}

export function drawLineBresenham(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string
): void {
  let dx = Math.abs(x1 - x0);
  let dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;

  while (true) {
    setPixelColor(ctx, x0, y0, color);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
}

export function drawRectanglePixels(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string,
  filled: boolean
): void {
  const minX = Math.min(x0, x1);
  const maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1);
  const maxY = Math.max(y0, y1);

  if (filled) {
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        setPixelColor(ctx, x, y, color);
      }
    }
  } else {
    for (let x = minX; x <= maxX; x++) {
      setPixelColor(ctx, x, minY, color);
      setPixelColor(ctx, x, maxY, color);
    }
    for (let y = minY; y <= maxY; y++) {
      setPixelColor(ctx, minX, y, color);
      setPixelColor(ctx, maxX, y, color);
    }
  }
}

export function drawBrush(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  size: number
): void {
  if (size <= 1) {
    setPixelColor(ctx, x, y, color);
    return;
  }
  const radius = Math.floor(size / 2);
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy <= radius * radius) {
        setPixelColor(ctx, x + dx, y + dy, color);
      }
    }
  }
}

export function eraseBrush(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
): void {
  if (size <= 1) {
    ctx.clearRect(x, y, 1, 1);
    return;
  }
  const radius = Math.floor(size / 2);
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy <= radius * radius) {
        ctx.clearRect(x + dx, y + dy, 1, 1);
      }
    }
  }
}
