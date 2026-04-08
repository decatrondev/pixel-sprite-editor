import { useRef } from 'react';
import { parseAseprite, type AsepriteFile } from '../../utils/aseprite';
import { toast } from './Toast';

interface Props {
  onImport: (file: AsepriteFile) => void;
  className?: string;
  label?: string;
}

export function AsepriteImport({ onImport, className, label = 'Importar .aseprite' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.name.match(/\.(ase|aseprite)$/i)) {
      toast('Solo se aceptan archivos .ase o .aseprite', 'error');
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const aseFile = parseAseprite(buffer);
      toast(`Importado: ${aseFile.width}x${aseFile.height}, ${aseFile.frames.length} frames, ${aseFile.palette.length} colores`, 'success');
      onImport(aseFile);
    } catch (err) {
      console.error('Error parsing aseprite:', err);
      toast('Error al leer el archivo .aseprite', 'error');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <>
      <input ref={inputRef} type="file" accept=".ase,.aseprite" onChange={handleChange} className="hidden" />
      <button
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        className={className || 'w-full px-3 py-2 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition'}
      >
        {label}
      </button>
    </>
  );
}
