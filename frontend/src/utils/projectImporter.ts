// Project Importer — parses folders/ZIPs into an editable project tree

import { parseAseprite } from './aseprite';

// Tree structure for the project manager
export interface ProjectTree {
  name: string; // editable project name
  folders: ProjectFolder[];
}

export interface ProjectFolder {
  id: string;
  name: string; // editable folder/animation name
  originalName: string;
  files: ProjectFile[];
  included: boolean;
}

export interface ProjectFile {
  id: string;
  name: string; // editable file name
  originalName: string;
  direction: string | null; // detected direction
  frames: ProjectFrame[];
  included: boolean;
  thumbnail: string; // dataURL of first frame
}

export interface ProjectFrame {
  imageData: ImageData;
  duration: number;
}

// For flat export
export interface ExportedAnimation {
  name: string;
  frames: { imageData: ImageData; duration: number }[];
  speed: number;
}

export interface ExportedProject {
  name: string;
  width: number;
  height: number;
  animations: ExportedAnimation[];
  palette: string[];
}

// Direction detection
const DIRECTION_PATTERNS: [RegExp, string][] = [
  [/[_-]side[_-]?right/i, 'side_right'],
  [/[_-]side[_-]?left/i, 'side_left'],
  [/[_-]front/i, 'front'],
  [/[_-]back/i, 'back'],
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
  if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.webp')) return 'image';
  if (lower.endsWith('.gif')) return 'gif';
  return null;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

// Generate thumbnail dataURL from first frame
function frameThumbnail(imageData: ImageData): string {
  const size = 48;
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const src = new OffscreenCanvas(imageData.width, imageData.height);
  src.getContext('2d')!.putImageData(imageData, 0, 0);

  // Fit within thumbnail keeping aspect ratio
  const scale = Math.min(size / imageData.width, size / imageData.height);
  const w = imageData.width * scale;
  const h = imageData.height * scale;
  const x = (size - w) / 2;
  const y = (size - h) / 2;
  ctx.drawImage(src, x, y, w, h);

  return '';
}

// Clean animation name from folder name
function cleanFolderName(name: string): string {
  // Remove common prefixes like "Swordsman_lvl1_"
  return name
    .replace(/^[^_]*_(?:lvl\d+_)?/i, '')
    .replace(/[_-]+$/, '')
    .trim() || name;
}

// Clean file name for display
function cleanFileName(name: string): string {
  return name.replace(/\.[^.]+$/, ''); // remove extension
}

interface RawFile {
  path: string;
  name: string;
  folder: string;
  data: ArrayBuffer;
  type: string;
}

// Parse files from folder input
export async function parseFromFiles(fileList: FileList): Promise<RawFile[]> {
  const files: RawFile[] = [];
  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    const type = getFileType(file.name);
    if (!type) continue;

    const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
    const parts = relativePath.split('/');
    const cleanPath = parts.length > 1 ? parts.slice(1).join('/') : file.name;
    const folderParts = cleanPath.split('/');
    const folder = folderParts.length > 1 ? folderParts[folderParts.length - 2] : '';

    const data = await file.arrayBuffer();
    files.push({ path: cleanPath, name: file.name, folder, data, type });
  }
  return files;
}

// Parse files from ZIP
export async function parseFromZip(zipData: ArrayBuffer): Promise<RawFile[]> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(zipData);
  const files: RawFile[] = [];

  const entries = Object.entries(zip.files).filter(([, f]) => !f.dir);
  for (const [path, zipFile] of entries) {
    const type = getFileType(path);
    if (!type) continue;

    const parts = path.split('/');
    const name = parts[parts.length - 1];

    // Find the deepest meaningful folder
    // Skip root folder if all files share one
    const cleanParts = parts.length > 2 ? parts.slice(1) : parts;
    const folder = cleanParts.length > 1 ? cleanParts[cleanParts.length - 2] : '';

    const data = await zipFile.async('arraybuffer');
    files.push({ path, name, folder, data, type });
  }
  return files;
}

// Load image file to frames
async function loadImageFrames(data: ArrayBuffer, type: string): Promise<ProjectFrame[]> {
  if (type === 'aseprite') {
    const ase = parseAseprite(data);
    return ase.frames.map(f => ({ imageData: f.imageData, duration: f.duration }));
  }

  if (type === 'image') {
    const blob = new Blob([data], { type: 'image/png' });
    const url = URL.createObjectURL(blob);
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const c = new OffscreenCanvas(img.width, img.height);
        const ctx = c.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        resolve([{ imageData: ctx.getImageData(0, 0, img.width, img.height), duration: 100 }]);
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve([]); };
      img.src = url;
    });
  }

  if (type === 'gif') {
    // Try ImageDecoder API for animated GIFs
    if ('ImageDecoder' in window) {
      try {
        const ImageDecoderClass = (window as unknown as { ImageDecoder: new (opts: { type: string; data: ArrayBuffer }) => { tracks: { ready: Promise<void>; selectedTrack?: { frameCount: number } }; decode: (o: { frameIndex: number }) => Promise<{ image: ImageBitmap }>; close: () => void } }).ImageDecoder;
        const decoder = new ImageDecoderClass({ type: 'image/gif', data });
        await decoder.tracks.ready;
        const count = decoder.tracks.selectedTrack?.frameCount ?? 0;
        const frames: ProjectFrame[] = [];
        for (let i = 0; i < count; i++) {
          const result = await decoder.decode({ frameIndex: i });
          const bmp = result.image;
          const c = new OffscreenCanvas(bmp.width, bmp.height);
          c.getContext('2d')!.drawImage(bmp, 0, 0);
          frames.push({ imageData: c.getContext('2d')!.getImageData(0, 0, bmp.width, bmp.height), duration: 100 });
          bmp.close();
        }
        decoder.close();
        if (frames.length > 0) return frames;
      } catch { /* fallback below */ }
    }
  }

  // Image (png, jpg, gif fallback) — single frame
  const blob = new Blob([data], { type: type === 'gif' ? 'image/gif' : 'image/png' });
  const url = URL.createObjectURL(blob);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = new OffscreenCanvas(img.width, img.height);
      const ctx = c.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      resolve([{ imageData: ctx.getImageData(0, 0, img.width, img.height), duration: 100 }]);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve([]); };
    img.src = url;
  });
}

// Build the project tree from raw files
export async function buildProjectTree(
  rawFiles: RawFile[],
  onProgress?: (msg: string) => void
): Promise<{ tree: ProjectTree; palette: string[]; width: number; height: number }> {
  const log = onProgress || (() => {});

  // Group by folder
  const folderMap = new Map<string, RawFile[]>();
  for (const f of rawFiles) {
    const key = f.folder || '__root__';
    if (!folderMap.has(key)) folderMap.set(key, []);
    folderMap.get(key)!.push(f);
  }

  let palette: string[] = [];
  let width = 0;
  let height = 0;
  const folders: ProjectFolder[] = [];

  const sortedFolders = [...folderMap.keys()].sort();

  for (const folderName of sortedFolders) {
    const folderFiles = folderMap.get(folderName)!;
    folderFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    log(`Procesando: ${folderName} (${folderFiles.length} archivos)`);

    const projectFiles: ProjectFile[] = [];

    for (const rawFile of folderFiles) {
      try {
        const frames = await loadImageFrames(rawFile.data, rawFile.type);
        if (frames.length === 0) continue;

        // Set project dimensions from first file
        if (width === 0) {
          width = frames[0].imageData.width;
          height = frames[0].imageData.height;
        }

        // Extract palette from first aseprite
        if (palette.length === 0 && rawFile.type === 'aseprite') {
          try {
            const ase = parseAseprite(rawFile.data);
            if (ase.palette.length > 0) palette = ase.palette;
          } catch { /* ignore */ }
        }

        // Generate thumbnail
        const thumbCanvas = new OffscreenCanvas(48, 48);
        const thumbCtx = thumbCanvas.getContext('2d')!;
        thumbCtx.imageSmoothingEnabled = false;
        const srcCanvas = new OffscreenCanvas(frames[0].imageData.width, frames[0].imageData.height);
        srcCanvas.getContext('2d')!.putImageData(frames[0].imageData, 0, 0);
        const scale = Math.min(48 / frames[0].imageData.width, 48 / frames[0].imageData.height);
        const tw = frames[0].imageData.width * scale;
        const th = frames[0].imageData.height * scale;
        thumbCtx.drawImage(srcCanvas, (48 - tw) / 2, (48 - th) / 2, tw, th);

        // Convert to dataURL via regular canvas
        const thumbHtml = document.createElement('canvas');
        thumbHtml.width = 48;
        thumbHtml.height = 48;
        thumbHtml.getContext('2d')!.drawImage(thumbCanvas as unknown as CanvasImageSource, 0, 0);
        const thumbnail = thumbHtml.toDataURL('image/png');

        const direction = detectDirection(rawFile.name);

        projectFiles.push({
          id: generateId(),
          name: cleanFileName(rawFile.name),
          originalName: rawFile.name,
          direction,
          frames,
          included: true,
          thumbnail,
        });
      } catch (err) {
        log(`Error en ${rawFile.name}: ${err}`);
      }
    }

    if (projectFiles.length > 0) {
      folders.push({
        id: generateId(),
        name: cleanFolderName(folderName),
        originalName: folderName,
        files: projectFiles,
        included: true,
      });
    }
  }

  // Derive project name
  const rootName = rawFiles[0]?.path.split('/')[0] || 'Proyecto';
  const projectName = rootName.replace(/\.[^.]+$/, '');

  log(`Listo: ${folders.length} animaciones, ${folders.reduce((s, f) => s + f.files.reduce((s2, fi) => s2 + fi.frames.length, 0), 0)} frames`);

  void frameThumbnail;

  return {
    tree: { name: projectName, folders },
    palette,
    width: width || 64,
    height: height || 64,
  };
}

// Convert tree to flat export (respecting included/excluded)
export function treeToExport(tree: ProjectTree, width: number, height: number, palette: string[]): ExportedProject {
  const animations: ExportedAnimation[] = [];

  for (const folder of tree.folders) {
    if (!folder.included) continue;

    for (const file of folder.files) {
      if (!file.included) continue;

      const animName = file.direction
        ? `${folder.name}_${file.direction}`
        : (folder.files.length === 1 ? folder.name : `${folder.name}_${file.name}`);

      animations.push({
        name: animName.toLowerCase().replace(/\s+/g, '_'),
        frames: file.frames,
        speed: 8, // default 8 FPS
      });
    }
  }

  return { name: tree.name, width, height, animations, palette };
}

// Stats summary
export interface TreeSummary {
  totalFolders: number;
  totalFiles: number;
  totalFrames: number;
  includedFolders: number;
  includedFiles: number;
  includedFrames: number;
  width: number;
  height: number;
}

export function getTreeSummary(tree: ProjectTree, width: number, height: number): TreeSummary {
  let totalFiles = 0, totalFrames = 0, includedFolders = 0, includedFiles = 0, includedFrames = 0;

  for (const folder of tree.folders) {
    totalFiles += folder.files.length;
    totalFrames += folder.files.reduce((s, f) => s + f.frames.length, 0);

    if (folder.included) {
      includedFolders++;
      for (const file of folder.files) {
        if (file.included) {
          includedFiles++;
          includedFrames += file.frames.length;
        }
      }
    }
  }

  return {
    totalFolders: tree.folders.length,
    totalFiles,
    totalFrames,
    includedFolders,
    includedFiles,
    includedFrames,
    width,
    height,
  };
}
