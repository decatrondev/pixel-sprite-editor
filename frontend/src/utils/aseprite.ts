// Aseprite (.ase/.aseprite) parser for browser
// Based on Aseprite file format spec: https://github.com/aseprite/aseprite/blob/main/docs/ase-file-specs.md

import pako from 'pako';

export interface AsepriteFile {
  width: number;
  height: number;
  frames: AsepriteFrame[];
  layers: AsepriteLayer[];
  tags: AsepriteTag[];
  palette: string[];
}

export interface AsepriteFrame {
  duration: number;
  imageData: ImageData;
}

export interface AsepriteLayer {
  name: string;
  visible: boolean;
  opacity: number;
  blendMode: number;
}

export interface AsepriteTag {
  name: string;
  from: number;
  to: number;
  direction: number;
}

interface Cel {
  layerIndex: number;
  x: number;
  y: number;
  opacity: number;
  celType: number;
  width: number;
  height: number;
  linkedFrame?: number;
  pixels?: Uint8Array;
}

class DataReader {
  private view: DataView;
  private offset = 0;

  constructor(buffer: ArrayBuffer) {
    this.view = new DataView(buffer);
  }

  get pos() { return this.offset; }
  set pos(v: number) { this.offset = v; }

  byte() { return this.view.getUint8(this.offset++); }
  word() { const v = this.view.getUint16(this.offset, true); this.offset += 2; return v; }
  short() { const v = this.view.getInt16(this.offset, true); this.offset += 2; return v; }
  dword() { const v = this.view.getUint32(this.offset, true); this.offset += 4; return v; }
  skip(n: number) { this.offset += n; }

  bytes(n: number): Uint8Array {
    const arr = new Uint8Array(this.view.buffer, this.offset, n);
    this.offset += n;
    return new Uint8Array(arr);
  }

  string() {
    const len = this.word();
    const bytes = this.bytes(len);
    return new TextDecoder().decode(bytes);
  }
}

export function parseAseprite(buffer: ArrayBuffer): AsepriteFile {
  const r = new DataReader(buffer);

  // Header
  r.dword(); // file size
  const magic = r.word();
  if (magic !== 0xA5E0) throw new Error('Not a valid Aseprite file');

  const numFrames = r.word();
  const width = r.word();
  const height = r.word();
  const colorDepth = r.word(); // 32=RGBA, 16=Grayscale, 8=Indexed

  r.dword(); // flags
  r.word();  // speed (deprecated)
  r.skip(8); // reserved
  const transparentIndex = r.byte();
  r.skip(3); // ignore
  r.word();  // numColors
  r.byte();  // pixel width (1 byte)
  r.byte();  // pixel height (1 byte)
  r.skip(2); // grid x
  r.skip(2); // grid y
  r.skip(2); // grid width
  r.skip(2); // grid height
  r.skip(84); // reserved

  const layers: AsepriteLayer[] = [];
  const tags: AsepriteTag[] = [];
  let palette: Array<[number, number, number, number]> = [];
  const frameCels: Cel[][] = [];

  // Parse frames
  for (let f = 0; f < numFrames; f++) {
    const frameStart = r.pos;
    const frameSize = r.dword();
    const frameMagic = r.word();
    if (frameMagic !== 0xF1FA) throw new Error(`Invalid frame magic at frame ${f}`);

    const oldChunks = r.word();
    r.word(); // frame duration (we'll read from chunks)
    r.skip(2); // reserved
    const newChunks = r.dword();
    const numChunks = newChunks === 0 ? oldChunks : newChunks;

    // Read frame duration from header area
    const savedPos = r.pos;
    r.pos = frameStart + 6; // after size + magic
    r.word(); // old chunks
    const frameDuration = r.word(); void frameDuration;
    r.pos = savedPos;

    const cels: Cel[] = [];

    for (let c = 0; c < numChunks; c++) {
      const chunkStart = r.pos;
      const chunkSize = r.dword();
      const chunkType = r.word();

      switch (chunkType) {
        case 0x2004: { // Layer
          const flags = r.word();
          const type = r.word();
          r.word(); // child level
          r.word(); // default width
          r.word(); // default height
          const blendMode = r.word();
          const opacity = r.byte();
          r.skip(3);
          const name = r.string();
          if (type === 2) r.dword(); // tileset index
          layers.push({
            name,
            visible: (flags & 1) !== 0,
            opacity,
            blendMode
          });
          break;
        }

        case 0x2005: { // Cel
          const layerIndex = r.word();
          const x = r.short();
          const y = r.short();
          const opacity = r.byte();
          const celType = r.word();
          const zIndex = r.short();
          r.skip(5); // reserved

          const cel: Cel = { layerIndex, x, y, opacity, celType, width: 0, height: 0 };

          if (celType === 0 || celType === 2) {
            // Raw or compressed
            cel.width = r.word();
            cel.height = r.word();
            const dataLen = chunkSize - (r.pos - chunkStart);
            const rawData = r.bytes(dataLen);

            if (celType === 2) {
              // zlib compressed
              try {
                cel.pixels = pako.inflate(rawData);
              } catch {
                cel.pixels = new Uint8Array(cel.width * cel.height * (colorDepth / 8));
              }
            } else {
              cel.pixels = rawData;
            }
          } else if (celType === 1) {
            // Linked cel
            cel.linkedFrame = r.word();
          } else {
            // Skip tilemap or unknown
            const remaining = chunkSize - (r.pos - chunkStart);
            if (remaining > 0) r.skip(remaining);
          }

          void zIndex;
          cels.push(cel);
          break;
        }

        case 0x2019: { // Palette
          const paletteSize = r.dword();
          const firstColor = r.dword();
          const lastColor = r.dword();
          r.skip(8); // reserved

          // Ensure palette is big enough
          while (palette.length < paletteSize) {
            palette.push([0, 0, 0, 255]);
          }

          for (let i = firstColor; i <= lastColor; i++) {
            const hasName = r.word();
            const red = r.byte();
            const green = r.byte();
            const blue = r.byte();
            const alpha = r.byte();
            palette[i] = [red, green, blue, alpha];
            if (hasName & 1) r.string();
          }
          break;
        }

        case 0x2018: { // Tags
          const numTags = r.word();
          r.skip(8); // reserved
          for (let t = 0; t < numTags; t++) {
            const from = r.word();
            const to = r.word();
            const direction = r.byte();
            const repeat = r.word();
            r.skip(6); // reserved
            r.skip(1); // tag color (deprecated)
            const name = r.string();
            void repeat;
            tags.push({ name, from, to, direction });
          }
          break;
        }

        default:
          break;
      }

      // Ensure we advance to next chunk
      r.pos = chunkStart + chunkSize;
    }

    frameCels.push(cels);

    // Ensure we advance to next frame
    r.pos = frameStart + frameSize;
  }

  // Render frames by compositing layers
  const frames: AsepriteFrame[] = [];

  for (let f = 0; f < numFrames; f++) {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, width, height);

    // Read frame duration
    let duration = 100; // default
    // We already parsed it above, let's get it from frame header
    // Re-parse just the duration
    const frameR = new DataReader(buffer);
    let fPos = 128; // after main header
    for (let fi = 0; fi < f; fi++) {
      const fView = new DataView(buffer);
      const fSize = fView.getUint32(fPos, true);
      fPos += fSize;
    }
    frameR.pos = fPos + 6; // skip size + magic
    frameR.word(); // old chunks
    duration = frameR.word();

    const cels = frameCels[f];

    for (const cel of cels) {
      // Check layer visibility
      if (cel.layerIndex < layers.length && !layers[cel.layerIndex].visible) continue;

      let pixels = cel.pixels;
      let celW = cel.width;
      let celH = cel.height;

      // Handle linked cels
      if (cel.celType === 1 && cel.linkedFrame !== undefined) {
        const linkedCels = frameCels[cel.linkedFrame];
        const linked = linkedCels?.find(c => c.layerIndex === cel.layerIndex);
        if (linked?.pixels) {
          pixels = linked.pixels;
          celW = linked.width;
          celH = linked.height;
        }
      }

      if (!pixels || celW === 0 || celH === 0) continue;

      // Convert pixels to RGBA ImageData
      const celImageData = ctx.createImageData(celW, celH);

      if (colorDepth === 32) {
        // RGBA - direct copy
        celImageData.data.set(pixels.subarray(0, celW * celH * 4));
      } else if (colorDepth === 16) {
        // Grayscale (2 bytes per pixel: gray, alpha)
        for (let i = 0; i < celW * celH; i++) {
          const gray = pixels[i * 2];
          const alpha = pixels[i * 2 + 1];
          celImageData.data[i * 4] = gray;
          celImageData.data[i * 4 + 1] = gray;
          celImageData.data[i * 4 + 2] = gray;
          celImageData.data[i * 4 + 3] = alpha;
        }
      } else if (colorDepth === 8) {
        // Indexed (1 byte per pixel)
        for (let i = 0; i < celW * celH; i++) {
          const idx = pixels[i];
          if (idx === transparentIndex) {
            celImageData.data[i * 4 + 3] = 0;
          } else if (palette[idx]) {
            celImageData.data[i * 4] = palette[idx][0];
            celImageData.data[i * 4 + 1] = palette[idx][1];
            celImageData.data[i * 4 + 2] = palette[idx][2];
            celImageData.data[i * 4 + 3] = palette[idx][3];
          }
        }
      }

      // Apply layer opacity
      const layerOpacity = cel.layerIndex < layers.length ? layers[cel.layerIndex].opacity / 255 : 1;
      const celOpacity = cel.opacity / 255;
      const totalOpacity = layerOpacity * celOpacity;

      if (totalOpacity < 1) {
        for (let i = 3; i < celImageData.data.length; i += 4) {
          celImageData.data[i] = Math.round(celImageData.data[i] * totalOpacity);
        }
      }

      // Draw cel onto frame canvas
      const tempCanvas = new OffscreenCanvas(celW, celH);
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCtx.putImageData(celImageData, 0, 0);
      ctx.drawImage(tempCanvas, cel.x, cel.y);
    }

    const imageData = ctx.getImageData(0, 0, width, height);
    frames.push({ duration, imageData });
  }

  // Convert palette to hex strings
  const paletteHex = palette
    .filter(c => c[3] > 0)
    .map(([r, g, b]) => '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join(''))
    .filter((v, i, a) => a.indexOf(v) === i) // unique
    .slice(0, 32);

  return { width, height, frames, layers, tags, palette: paletteHex };
}
