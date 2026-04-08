// Project Importer — parses folders, ZIPs, aseprite, GIFs, PNGs
// Detects structure automatically and generates animation definitions

import { parseAseprite, type AsepriteFile } from './aseprite';

export interface ImportedProject {
  name: string;
  width: number;
  height: number;
  frames: ImportedFrame[];
  animations: Record<string, ImportedAnimation>;
  palette: string[];
}

export interface ImportedFrame {
  index: number;
  imageData: ImageData;
  duration: number;
  source: string; // original filename
}

export interface ImportedAnimation {
  frames: number[]; // indices into ImportedProject.frames
  speed: number; // FPS
}

interface VirtualFile {
  path: string;       // full path relative to root (e.g. "Idle/idle_front.aseprite")
  name: string;       // filename only
  folder: string;     // parent folder name (e.g. "Idle")
  data: ArrayBuffer;
  type: string;       // detected type: 'aseprite' | 'png' | 'gif' | 'json'
}

// Direction detection from filename
const DIRECTION_PATTERNS: [RegExp, string][] = [
  [/[_-]front/i, 'front'],
  [/[_-]back/i, 'back'],
  [/[_-]side[_-]?right/i, 'side_right'],
  [/[_-]side[_-]?left/i, 'side_left'],
  [/[_-]right/i, 'right'],
  [/[_-]left/i, 'left'],
  [/[_-]up/i, 'up'],
  [/[_-]down/i, 'down'],
];

function detectDirection(filename: string): string | null {
  for (const [pattern, dir] of DIRECTION_PATTERNS) {
    if (pattern.test(filename)) return dir;
  }
  return null;
}

function getFileType(name: string): string | null {
  const lower = name.toLowerCase();
  if (lower.endsWith('.aseprite') || lower.endsWith('.ase')) return 'aseprite';
  if (lower.endsWith('.png')) return 'png';
  if (lower.endsWith('.gif')) return 'gif';
  if (lower.endsWith('.json')) return 'json';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'png'; // treat as image
  if (lower.endsWith('.webp')) return 'png';
  return null;
}

// Parse files from folder input (webkitdirectory)
export async function parseFromFiles(fileList: FileList): Promise<VirtualFile[]> {
  const files: VirtualFile[] = [];

  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    const type = getFileType(file.name);
    if (!type) continue;

    const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
    const parts = relativePath.split('/');
    // Remove root folder name from path
    const cleanPath = parts.length > 1 ? parts.slice(1).join('/') : file.name;
    const folderParts = cleanPath.split('/');
    const folder = folderParts.length > 1 ? folderParts[folderParts.length - 2] : '';

    const data = await file.arrayBuffer();
    files.push({ path: cleanPath, name: file.name, folder, data, type });
  }

  return files;
}

// Parse files from ZIP
export async function parseFromZip(zipData: ArrayBuffer): Promise<VirtualFile[]> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(zipData);
  const files: VirtualFile[] = [];

  const entries = Object.entries(zip.files).filter(([, f]) => !f.dir);

  for (const [path, zipFile] of entries) {
    const type = getFileType(path);
    if (!type) continue;

    // Clean path: remove root folder if all files share one
    const parts = path.split('/');
    const name = parts[parts.length - 1];
    const cleanPath = parts.length > 1 ? parts.slice(1).join('/') : path;
    const folderParts = cleanPath.split('/');
    const folder = folderParts.length > 1 ? folderParts[folderParts.length - 2] : '';

    const data = await zipFile.async('arraybuffer');
    files.push({ path: cleanPath, name, folder, data, type });
  }

  return files;
}

// Load a PNG/JPG/WebP image into ImageData
async function loadImageToImageData(data: ArrayBuffer, mimeType: string = 'image/png'): Promise<{ imageData: ImageData; width: number; height: number }> {
  const blob = new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = new OffscreenCanvas(img.width, img.height);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      URL.revokeObjectURL(url);
      resolve({ imageData, width: img.width, height: img.height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

// Parse GIF into frames using canvas
async function parseGifFrames(data: ArrayBuffer): Promise<{ frames: { imageData: ImageData; duration: number }[]; width: number; height: number }> {
  // Use ImageDecoder API if available (Chrome/Edge)
  if ('ImageDecoder' in window) {
    try {
      const decoder = new (window as unknown as { ImageDecoder: new (opts: { type: string; data: ArrayBuffer }) => ImageDecoderInstance }).ImageDecoder({
        type: 'image/gif',
        data: data,
      });

      await decoder.tracks.ready;
      const frameCount = decoder.tracks.selectedTrack?.frameCount ?? 0;
      const frames: { imageData: ImageData; duration: number }[] = [];

      for (let i = 0; i < frameCount; i++) {
        const result = await decoder.decode({ frameIndex: i });
        const bitmap = result.image;
        const bw = (bitmap as unknown as { displayWidth?: number }).displayWidth ?? bitmap.width;
        const bh = (bitmap as unknown as { displayHeight?: number }).displayHeight ?? bitmap.height;
        const canvas = new OffscreenCanvas(bw, bh);
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(bitmap, 0, 0);
        const imageData = ctx.getImageData(0, 0, bw, bh);
        frames.push({ imageData, duration: (result.image.duration ?? 100000) / 1000 }); // microseconds to ms
        bitmap.close();
      }

      decoder.close();
      const w = frames[0]?.imageData.width ?? 0;
      const h = frames[0]?.imageData.height ?? 0;
      return { frames, width: w, height: h };
    } catch {
      // Fallback below
    }
  }

  // Fallback: load GIF as single frame
  const { imageData, width, height } = await loadImageToImageData(data, 'image/gif');
  return { frames: [{ imageData, duration: 100 }], width, height };
}

interface ImageDecoderInstance {
  tracks: { ready: Promise<void>; selectedTrack?: { frameCount: number } };
  decode(opts: { frameIndex: number }): Promise<{ image: ImageBitmap & { duration?: number } }>;
  close(): void;
}

// Main import function: takes virtual files and produces an ImportedProject
export async function processImport(
  files: VirtualFile[],
  onProgress?: (msg: string) => void
): Promise<ImportedProject> {
  const log = onProgress || (() => {});

  // Detect structure
  const folders = new Set(files.map(f => f.folder).filter(Boolean));
  const hasSubfolders = folders.size > 0;

  let allFrames: ImportedFrame[] = [];
  const animations: Record<string, ImportedAnimation> = {};
  let projectWidth = 0;
  let projectHeight = 0;
  let palette: string[] = [];
  let frameIndex = 0;

  if (hasSubfolders) {
    // Structure: subfolders = actions, files inside = directions or frames
    log(`Detectadas ${folders.size} carpetas de animacion`);

    const sortedFolders = [...folders].sort();

    for (const folder of sortedFolders) {
      const folderFiles = files.filter(f => f.folder === folder).sort((a, b) => a.name.localeCompare(b.name));
      log(`Procesando: ${folder} (${folderFiles.length} archivos)`);

      for (const file of folderFiles) {
        const direction = detectDirection(file.name);
        // Animation name: folder_direction or just folder
        const cleanFolder = folder.replace(/^[^_]*_(?:lvl\d+_)?/i, '').toLowerCase();
        const animName = direction ? `${cleanFolder}_${direction}` : cleanFolder;

        const frames = await extractFrames(file, log);

        if (frames.length > 0) {
          // Set project dimensions from first frames
          if (projectWidth === 0) {
            projectWidth = frames[0].imageData.width;
            projectHeight = frames[0].imageData.height;
          }

          // Extract palette from first aseprite
          if (palette.length === 0 && file.type === 'aseprite') {
            try {
              const ase = parseAseprite(file.data);
              if (ase.palette.length > 0) palette = ase.palette;
            } catch { /* ignore */ }
          }

          const animFrameIndices: number[] = [];

          for (const frame of frames) {
            allFrames.push({
              index: frameIndex,
              imageData: frame.imageData,
              duration: frame.duration,
              source: `${folder}/${file.name}`,
            });
            animFrameIndices.push(frameIndex);
            frameIndex++;
          }

          // Merge with existing animation of same name or create new
          if (animations[animName]) {
            animations[animName].frames.push(...animFrameIndices);
          } else {
            const speed = frames[0].duration > 0 ? Math.round(1000 / frames[0].duration) : 8;
            animations[animName] = { frames: animFrameIndices, speed: Math.max(1, Math.min(60, speed)) };
          }
        }
      }
    }
  } else {
    // Flat structure: all files in root
    log(`Procesando ${files.length} archivos`);

    // Group by name pattern to detect animations
    const groups = groupFilesByAnimation(files);

    for (const [animName, groupFiles] of Object.entries(groups)) {
      log(`Animacion: ${animName} (${groupFiles.length} archivos)`);

      const animFrameIndices: number[] = [];

      for (const file of groupFiles) {
        const frames = await extractFrames(file, log);

        if (frames.length > 0 && projectWidth === 0) {
          projectWidth = frames[0].imageData.width;
          projectHeight = frames[0].imageData.height;
        }

        for (const frame of frames) {
          allFrames.push({
            index: frameIndex,
            imageData: frame.imageData,
            duration: frame.duration,
            source: file.name,
          });
          animFrameIndices.push(frameIndex);
          frameIndex++;
        }
      }

      if (animFrameIndices.length > 0) {
        const speed = allFrames[animFrameIndices[0]]?.duration > 0
          ? Math.round(1000 / allFrames[animFrameIndices[0]].duration) : 8;
        animations[animName] = { frames: animFrameIndices, speed: Math.max(1, Math.min(60, speed)) };
      }
    }
  }

  // Resize all frames to match project dimensions if needed
  if (projectWidth > 0 && projectHeight > 0) {
    allFrames = allFrames.map(frame => {
      if (frame.imageData.width !== projectWidth || frame.imageData.height !== projectHeight) {
        const canvas = new OffscreenCanvas(projectWidth, projectHeight);
        const ctx = canvas.getContext('2d')!;
        const tempCanvas = new OffscreenCanvas(frame.imageData.width, frame.imageData.height);
        tempCanvas.getContext('2d')!.putImageData(frame.imageData, 0, 0);
        ctx.drawImage(tempCanvas, 0, 0);
        return { ...frame, imageData: ctx.getImageData(0, 0, projectWidth, projectHeight) };
      }
      return frame;
    });
  }

  log(`Importacion completa: ${allFrames.length} frames, ${Object.keys(animations).length} animaciones`);

  // Derive project name from folder structure
  const firstPath = files[0]?.path || 'Proyecto';
  const projectName = firstPath.split('/')[0]?.replace(/\.[^.]+$/, '') || 'Proyecto';

  return {
    name: projectName,
    width: projectWidth || 64,
    height: projectHeight || 64,
    frames: allFrames,
    animations,
    palette,
  };
}

// Extract frames from a single file
async function extractFrames(
  file: VirtualFile,
  log: (msg: string) => void
): Promise<{ imageData: ImageData; duration: number }[]> {
  try {
    if (file.type === 'aseprite') {
      const ase: AsepriteFile = parseAseprite(file.data);
      return ase.frames.map(f => ({ imageData: f.imageData, duration: f.duration }));
    }

    if (file.type === 'gif') {
      const result = await parseGifFrames(file.data);
      return result.frames;
    }

    if (file.type === 'png') {
      const { imageData } = await loadImageToImageData(file.data, 'image/png');
      return [{ imageData, duration: 100 }];
    }
  } catch (err) {
    log(`Error procesando ${file.name}: ${err}`);
  }

  return [];
}

// Group flat files into animation groups by name pattern
function groupFilesByAnimation(files: VirtualFile[]): Record<string, VirtualFile[]> {
  const groups: Record<string, VirtualFile[]> = {};

  for (const file of files) {
    const baseName = file.name.replace(/\.[^.]+$/, '');

    // Try to extract animation name and frame number
    // Patterns: "idle_001.png", "walk-3.png", "attack_front.aseprite"
    const match = baseName.match(/^(.+?)[_-]?(\d+)$/);

    if (match) {
      const animName = match[1].replace(/[_-]$/, '').toLowerCase();
      if (!groups[animName]) groups[animName] = [];
      groups[animName].push(file);
    } else {
      // No number — treat filename as animation name (e.g. aseprite files with internal frames)
      const direction = detectDirection(baseName);
      const cleanName = baseName
        .replace(/[_-]?(front|back|side[_-]?(left|right)|left|right|up|down)$/i, '')
        .replace(/[_-]$/, '')
        .toLowerCase();

      const animName = direction ? `${cleanName}_${direction}` : cleanName;
      if (!groups[animName]) groups[animName] = [];
      groups[animName].push(file);
    }
  }

  // Sort files within each group
  for (const key of Object.keys(groups)) {
    groups[key].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  }

  return groups;
}

// Summary for preview before confirming import
export interface ImportSummary {
  name: string;
  totalFiles: number;
  totalFrames: number;
  animationCount: number;
  animations: { name: string; frameCount: number; speed: number }[];
  width: number;
  height: number;
  fileTypes: Record<string, number>;
}

export function getImportSummary(project: ImportedProject): ImportSummary {
  const fileTypes: Record<string, number> = {};
  for (const frame of project.frames) {
    const ext = frame.source.split('.').pop()?.toLowerCase() || 'unknown';
    fileTypes[ext] = (fileTypes[ext] || 0) + 1;
  }

  return {
    name: project.name,
    totalFiles: new Set(project.frames.map(f => f.source)).size,
    totalFrames: project.frames.length,
    animationCount: Object.keys(project.animations).length,
    animations: Object.entries(project.animations).map(([name, anim]) => ({
      name,
      frameCount: anim.frames.length,
      speed: anim.speed,
    })),
    width: project.width,
    height: project.height,
    fileTypes,
  };
}
