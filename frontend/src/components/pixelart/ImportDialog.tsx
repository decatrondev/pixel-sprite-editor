import { useState, useRef, useCallback } from 'react';
import { toast } from '../common/Toast';
import {
  parseFromFiles,
  parseFromZip,
  buildProjectTree,
  treeToExport,
  getTreeSummary,
  type ProjectTree,
  type ProjectFolder,
  type ExportedProject,
} from '../../utils/projectImporter';

interface Props {
  open: boolean;
  onClose: () => void;
  onImport: (project: ExportedProject) => void;
}

type Stage = 'select' | 'processing' | 'tree' | 'error';

export function ImportDialog({ open, onClose, onImport }: Props) {
  const [stage, setStage] = useState<Stage>('select');
  const [progress, setProgress] = useState('');
  const [tree, setTree] = useState<ProjectTree | null>(null);
  const [projectWidth, setProjectWidth] = useState(0);
  const [projectHeight, setProjectHeight] = useState(0);
  const [palette, setPalette] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const folderInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setStage('select');
    setProgress('');
    setTree(null);
    setError('');
    setExpandedFolders(new Set());
  }, []);

  const handleClose = () => { reset(); onClose(); };

  const processFiles = async (source: 'folder' | 'zip', data: FileList | ArrayBuffer) => {
    setStage('processing');
    setProgress('Leyendo archivos...');

    try {
      const files = source === 'folder'
        ? await parseFromFiles(data as FileList)
        : await parseFromZip(data as ArrayBuffer);

      if (files.length === 0) {
        setError('No se encontraron archivos soportados (.aseprite, .png, .gif)');
        setStage('error');
        return;
      }

      const result = await buildProjectTree(files, setProgress);
      setTree(result.tree);
      setProjectWidth(result.width);
      setProjectHeight(result.height);
      setPalette(result.palette);

      // Expand first folder by default
      if (result.tree.folders.length > 0) {
        setExpandedFolders(new Set([result.tree.folders[0].id]));
      }

      setStage('tree');
    } catch (err) {
      console.error('Import error:', err);
      setError(`Error al importar: ${err instanceof Error ? err.message : 'desconocido'}`);
      setStage('error');
    }
  };

  const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fl = e.target.files;
    if (!fl || fl.length === 0) return;
    await processFiles('folder', fl);
    e.target.value = '';
  };

  const handleZipSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFiles('zip', await file.arrayBuffer());
    e.target.value = '';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const first = e.dataTransfer.files[0];
    if (first?.name.match(/\.zip$/i)) {
      await processFiles('zip', await first.arrayBuffer());
    } else if (e.dataTransfer.files.length > 0) {
      await processFiles('folder', e.dataTransfer.files);
    }
  };

  // Tree editing functions
  const updateTree = (updater: (t: ProjectTree) => ProjectTree) => {
    setTree(prev => prev ? updater({ ...prev, folders: prev.folders.map(f => ({ ...f, files: [...f.files] })) }) : prev);
  };

  const setProjectName = (name: string) => updateTree(t => ({ ...t, name }));

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      next.has(folderId) ? next.delete(folderId) : next.add(folderId);
      return next;
    });
  };

  const setFolderName = (folderId: string, name: string) => {
    updateTree(t => ({
      ...t,
      folders: t.folders.map(f => f.id === folderId ? { ...f, name } : f)
    }));
  };

  const toggleFolderIncluded = (folderId: string) => {
    updateTree(t => ({
      ...t,
      folders: t.folders.map(f => {
        if (f.id !== folderId) return f;
        const newIncluded = !f.included;
        return { ...f, included: newIncluded, files: f.files.map(fi => ({ ...fi, included: newIncluded })) };
      })
    }));
  };

  const setFileName = (folderId: string, fileId: string, name: string) => {
    updateTree(t => ({
      ...t,
      folders: t.folders.map(f => f.id !== folderId ? f : {
        ...f,
        files: f.files.map(fi => fi.id === fileId ? { ...fi, name } : fi)
      })
    }));
  };

  const toggleFileIncluded = (folderId: string, fileId: string) => {
    updateTree(t => ({
      ...t,
      folders: t.folders.map(f => f.id !== folderId ? f : {
        ...f,
        files: f.files.map(fi => fi.id === fileId ? { ...fi, included: !fi.included } : fi)
      })
    }));
  };

  // Load selected into editor
  const handleLoadToEditor = () => {
    if (!tree) return;
    const exported = treeToExport(tree, projectWidth, projectHeight, palette);
    if (exported.animations.length === 0) {
      toast('No hay animaciones seleccionadas para importar.', 'error');
      return;
    }
    onImport(exported);
    toast(`Proyecto "${exported.name}" importado: ${exported.animations.length} animaciones`, 'success');
    handleClose();
  };

  // Export as ZIP directly
  const handleExportZip = async () => {
    if (!tree) return;
    const exported = treeToExport(tree, projectWidth, projectHeight, palette);
    if (exported.animations.length === 0) {
      toast('No hay animaciones seleccionadas.', 'error');
      return;
    }

    setProgress('Generando ZIP...');

    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const safeName = exported.name.replace(/[^a-zA-Z0-9\s\-_]/g, '').replace(/\s+/g, '-') || 'project';

      // Generate spritesheet and JSON
      let globalFrameIndex = 0;
      const jsonAnimations: Record<string, { frames: number[]; speed: number; frameDuration: number }> = {};
      const allFrameCanvases: { canvas: HTMLCanvasElement; animName: string; localIndex: number }[] = [];

      for (const anim of exported.animations) {
        const frameIndices: number[] = [];

        for (const frame of anim.frames) {
          const c = document.createElement('canvas');
          c.width = exported.width;
          c.height = exported.height;
          const ctx = c.getContext('2d')!;
          ctx.putImageData(frame.imageData, 0, 0);

          allFrameCanvases.push({ canvas: c, animName: anim.name, localIndex: frameIndices.length });
          frameIndices.push(globalFrameIndex);
          globalFrameIndex++;
        }

        jsonAnimations[anim.name] = {
          frames: frameIndices,
          speed: anim.speed,
          frameDuration: Math.round(1000 / anim.speed),
        };
      }

      // Create spritesheet
      const totalFrames = allFrameCanvases.length;
      const cols = Math.min(Math.ceil(Math.sqrt(totalFrames)), totalFrames);
      const rows = Math.ceil(totalFrames / cols);
      const sheetCanvas = document.createElement('canvas');
      sheetCanvas.width = cols * exported.width;
      sheetCanvas.height = rows * exported.height;
      const sheetCtx = sheetCanvas.getContext('2d')!;
      sheetCtx.imageSmoothingEnabled = false;

      const framesJson: { index: number; x: number; y: number; w: number; h: number; animation: string }[] = [];

      allFrameCanvases.forEach(({ canvas }, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        sheetCtx.drawImage(canvas, col * exported.width, row * exported.height);
        framesJson.push({
          index: i,
          x: col * exported.width,
          y: row * exported.height,
          w: exported.width,
          h: exported.height,
          animation: allFrameCanvases[i].animName,
        });
      });

      // Add spritesheet to ZIP
      const sheetBlob = await new Promise<Blob>(r => sheetCanvas.toBlob(b => r(b!), 'image/png'));
      zip.file('spritesheet.png', sheetBlob);

      // Add individual frames per animation
      for (const anim of exported.animations) {
        const folder = zip.folder(anim.name)!;
        anim.frames.forEach((frame, i) => {
          const c = document.createElement('canvas');
          c.width = exported.width;
          c.height = exported.height;
          c.getContext('2d')!.putImageData(frame.imageData, 0, 0);
          const dataURL = c.toDataURL('image/png');
          const base64 = dataURL.split(',')[1];
          folder.file(`frame_${String(i + 1).padStart(3, '0')}.png`, base64, { base64: true });
        });
      }

      // Add JSON
      const projectJson = {
        name: exported.name,
        meta: { app: 'PixelSprite Editor', version: '2.0', created: new Date().toISOString() },
        canvas: { width: exported.width, height: exported.height },
        totalFrames,
        spritesheet: { file: 'spritesheet.png', columns: cols, rows, frameWidth: exported.width, frameHeight: exported.height },
        frames: framesJson,
        animations: jsonAnimations,
        palette: exported.palette,
      };
      zip.file(`${safeName}.json`, JSON.stringify(projectJson, null, 2));

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeName}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      toast('Proyecto exportado como ZIP', 'success');
      setProgress('');
    } catch (err) {
      console.error('Export error:', err);
      toast('Error al exportar', 'error');
      setProgress('');
    }
  };

  if (!open) return null;

  const summary = tree ? getTreeSummary(tree, projectWidth, projectHeight) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
          <h3 className="text-lg font-bold text-gray-900">
            {stage === 'tree' ? 'Proyecto' : 'Importar Proyecto'}
          </h3>
          {stage === 'tree' && (
            <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600">Volver</button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* Select stage */}
          {stage === 'select' && (
            <div>
              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center mb-4 hover:border-indigo-400 hover:bg-indigo-50/50 transition cursor-pointer"
                onClick={() => folderInputRef.current?.click()}
              >
                <svg className="mx-auto h-10 w-10 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <p className="text-sm font-medium text-gray-600 mb-1">Arrastra una carpeta o ZIP aqui</p>
                <p className="text-xs text-gray-400">o haz clic para seleccionar</p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <button onClick={() => folderInputRef.current?.click()}
                  className="py-2.5 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition">
                  Seleccionar carpeta
                </button>
                <button onClick={() => zipInputRef.current?.click()}
                  className="py-2.5 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition">
                  Subir ZIP
                </button>
              </div>

              <input ref={folderInputRef} type="file" className="hidden"
                {...{ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>}
                onChange={handleFolderSelect} />
              <input ref={zipInputRef} type="file" accept=".zip" className="hidden" onChange={handleZipSelect} />

              <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500">
                <p className="font-semibold text-gray-600 mb-1">Estructura soportada</p>
                <p>Carpetas = animaciones, archivos = frames/direcciones.</p>
                <p className="mt-1">Formatos: <span className="text-purple-600 font-medium">.aseprite</span> <span className="text-blue-600 font-medium">.png</span> <span className="text-green-600 font-medium">.gif</span></p>
              </div>
            </div>
          )}

          {/* Processing stage */}
          {stage === 'processing' && (
            <div className="py-12 text-center">
              <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-gray-600">{progress}</p>
            </div>
          )}

          {/* Tree stage */}
          {stage === 'tree' && tree && summary && (
            <div>
              {/* Project name */}
              <div className="mb-4">
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Nombre del proyecto</label>
                <input type="text" value={tree.name} onChange={e => setProjectName(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-medium border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none" />
              </div>

              {/* Stats bar */}
              <div className="flex gap-2 mb-4 text-xs">
                <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded font-medium">
                  {summary.includedFrames}/{summary.totalFrames} frames
                </span>
                <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded font-medium">
                  {summary.includedFiles}/{summary.totalFiles} archivos
                </span>
                <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded font-medium">
                  {summary.width}x{summary.height}px
                </span>
              </div>

              {/* Tree */}
              <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
                {tree.folders.map(folder => (
                  <FolderRow
                    key={folder.id}
                    folder={folder}
                    expanded={expandedFolders.has(folder.id)}
                    onToggleExpand={() => toggleFolder(folder.id)}
                    onToggleIncluded={() => toggleFolderIncluded(folder.id)}
                    onRename={(name) => setFolderName(folder.id, name)}
                    onFileRename={(fileId, name) => setFileName(folder.id, fileId, name)}
                    onFileToggle={(fileId) => toggleFileIncluded(folder.id, fileId)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Error stage */}
          {stage === 'error' && (
            <div className="py-8 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-red-600 text-xl font-bold">!</span>
              </div>
              <p className="text-sm text-red-600 mb-4">{error}</p>
              <button onClick={reset}
                className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
                Intentar de nuevo
              </button>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {stage === 'tree' && summary && (
          <div className="p-5 border-t border-gray-100 shrink-0">
            {progress && <p className="text-xs text-gray-400 text-center mb-3">{progress}</p>}
            <div className="flex gap-3">
              <button onClick={handleClose}
                className="flex-1 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
                Cancelar
              </button>
              <button onClick={handleExportZip}
                className="flex-1 py-2.5 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition">
                Exportar ZIP
              </button>
              <button onClick={handleLoadToEditor}
                className="flex-1 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition">
                Cargar al editor
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Folder Row Component ---

function FolderRow({ folder, expanded, onToggleExpand, onToggleIncluded, onRename, onFileRename, onFileToggle }: {
  folder: ProjectFolder;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleIncluded: () => void;
  onRename: (name: string) => void;
  onFileRename: (fileId: string, name: string) => void;
  onFileToggle: (fileId: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(folder.name);
  const totalFrames = folder.files.reduce((s, f) => s + f.frames.length, 0);

  const handleSave = () => {
    if (editValue.trim()) onRename(editValue.trim());
    setEditing(false);
  };

  return (
    <div className={`${!folder.included ? 'opacity-50' : ''}`}>
      {/* Folder header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 transition">
        <input type="checkbox" checked={folder.included} onChange={onToggleIncluded}
          className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600 shrink-0" />

        <button onClick={onToggleExpand} className="text-gray-400 hover:text-gray-600 shrink-0">
          <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <svg className="w-4 h-4 text-yellow-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
        </svg>

        {editing ? (
          <input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)}
            onBlur={handleSave} onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
            className="flex-1 px-1 py-0.5 text-sm border border-indigo-300 rounded outline-none" />
        ) : (
          <span onClick={() => { setEditValue(folder.name); setEditing(true); }}
            className="flex-1 text-sm font-medium text-gray-800 cursor-text hover:text-indigo-600" title="Click para renombrar">
            {folder.name}
          </span>
        )}

        <span className="text-[10px] text-gray-400 shrink-0">
          {folder.files.length} archivos, {totalFrames} frames
        </span>
      </div>

      {/* Files */}
      {expanded && (
        <div className="pl-10">
          {folder.files.map(file => (
            <FileRow key={file.id} file={file}
              onToggle={() => onFileToggle(file.id)}
              onRename={(name) => onFileRename(file.id, name)} />
          ))}
        </div>
      )}
    </div>
  );
}

// --- File Row Component ---

function FileRow({ file, onToggle, onRename }: {
  file: { id: string; name: string; direction: string | null; frames: { imageData: ImageData }[]; included: boolean; thumbnail: string };
  onToggle: () => void;
  onRename: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(file.name);

  const handleSave = () => {
    if (editValue.trim()) onRename(editValue.trim());
    setEditing(false);
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 border-t border-gray-50 hover:bg-gray-50 transition ${!file.included ? 'opacity-40' : ''}`}>
      <input type="checkbox" checked={file.included} onChange={onToggle}
        className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600 shrink-0" />

      {/* Thumbnail */}
      {file.thumbnail && (
        <img src={file.thumbnail} alt="" className="w-8 h-8 rounded border border-gray-200 shrink-0"
          style={{ imageRendering: 'pixelated' }} />
      )}

      {editing ? (
        <input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)}
          onBlur={handleSave} onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
          className="flex-1 px-1 py-0.5 text-xs border border-indigo-300 rounded outline-none" />
      ) : (
        <span onClick={() => { setEditValue(file.name); setEditing(true); }}
          className="flex-1 text-xs text-gray-700 cursor-text hover:text-indigo-600 truncate" title="Click para renombrar">
          {file.name}
        </span>
      )}

      {file.direction && (
        <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-medium shrink-0">
          {file.direction}
        </span>
      )}

      <span className="text-[10px] text-gray-400 shrink-0">
        {file.frames.length}f
      </span>
    </div>
  );
}
