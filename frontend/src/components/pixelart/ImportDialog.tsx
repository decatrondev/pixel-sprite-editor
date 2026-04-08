import { useState, useRef, useCallback } from 'react';
import { toast } from '../common/Toast';
import {
  parseFromFiles,
  parseFromZip,
  processImport,
  getImportSummary,
  type ImportedProject,
  type ImportSummary,
} from '../../utils/projectImporter';

interface Props {
  open: boolean;
  onClose: () => void;
  onImport: (project: ImportedProject) => void;
}

type Stage = 'select' | 'processing' | 'preview' | 'error';

export function ImportDialog({ open, onClose, onImport }: Props) {
  const [stage, setStage] = useState<Stage>('select');
  const [progress, setProgress] = useState('');
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [project, setProject] = useState<ImportedProject | null>(null);
  const [error, setError] = useState('');

  const folderInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setStage('select');
    setProgress('');
    setSummary(null);
    setProject(null);
    setError('');
  }, []);

  const handleClose = () => {
    reset();
    onClose();
  };

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

      setProgress(`Encontrados ${files.length} archivos. Procesando...`);

      const imported = await processImport(files, (msg) => setProgress(msg));
      const sum = getImportSummary(imported);

      setProject(imported);
      setSummary(sum);
      setStage('preview');
    } catch (err) {
      console.error('Import error:', err);
      setError(`Error al importar: ${err instanceof Error ? err.message : 'desconocido'}`);
      setStage('error');
    }
  };

  const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    await processFiles('folder', fileList);
    e.target.value = '';
  };

  const handleZipSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const buffer = await file.arrayBuffer();
    await processFiles('zip', buffer);
    e.target.value = '';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    // Check if it's a ZIP file
    const firstFile = e.dataTransfer.files[0];
    if (firstFile?.name.match(/\.zip$/i)) {
      const buffer = await firstFile.arrayBuffer();
      await processFiles('zip', buffer);
      return;
    }

    // Try as file list (folder drop)
    if (e.dataTransfer.files.length > 0) {
      await processFiles('folder', e.dataTransfer.files);
    }
  };

  const handleConfirmImport = () => {
    if (!project) return;
    onImport(project);
    toast(`Proyecto "${project.name}" importado: ${project.frames.length} frames, ${Object.keys(project.animations).length} animaciones`, 'success');
    handleClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleClose}>
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-gray-900">Importar Proyecto</h3>
          {stage !== 'select' && (
            <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600">
              Volver
            </button>
          )}
        </div>

        {/* Stage: Select source */}
        {stage === 'select' && (
          <div>
            {/* Drop zone */}
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

            {/* Buttons */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={() => folderInputRef.current?.click()}
                className="py-2.5 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition"
              >
                Seleccionar carpeta
              </button>
              <button
                onClick={() => zipInputRef.current?.click()}
                className="py-2.5 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition"
              >
                Subir ZIP
              </button>
            </div>

            {/* Hidden inputs */}
            <input ref={folderInputRef} type="file" className="hidden"
              {...{ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>}
              onChange={handleFolderSelect} />
            <input ref={zipInputRef} type="file" accept=".zip" className="hidden" onChange={handleZipSelect} />

            {/* Supported formats */}
            <div className="bg-gray-50 rounded-lg p-3">
              <h4 className="text-xs font-semibold text-gray-600 mb-2">Formatos soportados</h4>
              <div className="grid grid-cols-2 gap-1 text-xs text-gray-500">
                <span><span className="text-purple-600 font-medium">.aseprite</span> — frames + paleta</span>
                <span><span className="text-blue-600 font-medium">.png</span> — imagen/frame</span>
                <span><span className="text-green-600 font-medium">.gif</span> — animacion</span>
                <span><span className="text-orange-600 font-medium">.zip</span> — proyecto completo</span>
              </div>
              <p className="text-[10px] text-gray-400 mt-2">
                Estructura: carpetas = animaciones, archivos = frames. Detecta direcciones automaticamente (_front, _back, _left, _right).
              </p>
            </div>
          </div>
        )}

        {/* Stage: Processing */}
        {stage === 'processing' && (
          <div className="py-8 text-center">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-gray-600">{progress}</p>
          </div>
        )}

        {/* Stage: Preview */}
        {stage === 'preview' && summary && (
          <div>
            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-indigo-50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-indigo-700">{summary.totalFrames}</p>
                <p className="text-[10px] text-indigo-500">Frames</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-purple-700">{summary.animationCount}</p>
                <p className="text-[10px] text-purple-500">Animaciones</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-blue-700">{summary.width}x{summary.height}</p>
                <p className="text-[10px] text-blue-500">Dimensiones</p>
              </div>
            </div>

            {/* File types */}
            <div className="flex gap-2 mb-4">
              {Object.entries(summary.fileTypes).map(([ext, count]) => (
                <span key={ext} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium">
                  {count} .{ext}
                </span>
              ))}
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium">
                {summary.totalFiles} archivos
              </span>
            </div>

            {/* Animation list */}
            <div className="bg-gray-50 rounded-lg p-3 mb-4 max-h-48 overflow-y-auto">
              <h4 className="text-xs font-semibold text-gray-600 mb-2">Animaciones detectadas</h4>
              <div className="space-y-1">
                {summary.animations.map((anim) => (
                  <div key={anim.name} className="flex items-center justify-between py-1 px-2 bg-white rounded text-xs">
                    <span className="font-medium text-gray-700 truncate">{anim.name}</span>
                    <div className="flex gap-2 text-gray-400 shrink-0">
                      <span>{anim.frameCount} frames</span>
                      <span>{anim.speed} FPS</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button onClick={handleClose}
                className="flex-1 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
                Cancelar
              </button>
              <button onClick={handleConfirmImport}
                className="flex-1 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition">
                Importar ({summary.totalFrames} frames)
              </button>
            </div>
          </div>
        )}

        {/* Stage: Error */}
        {stage === 'error' && (
          <div className="py-6 text-center">
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
    </div>
  );
}
