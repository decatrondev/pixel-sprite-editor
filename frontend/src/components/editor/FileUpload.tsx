import { useRef, useState, useCallback } from 'react';
import { toast } from '../common/Toast';
import { parseAseprite } from '../../utils/aseprite';

interface FileUploadProps {
  onImageLoaded: (img: HTMLImageElement, filename: string) => void;
  hasImage: boolean;
}

const VALID_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/bmp'];

export function FileUpload({ onImageLoaded, hasImage }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const loadImageFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        onImageLoaded(img, file.name);
        toast('Imagen cargada correctamente.', 'success');
      };
      img.onerror = () => toast('Error al cargar la imagen.', 'error');
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, [onImageLoaded]);

  const loadAsepriteFile = useCallback(async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const ase = parseAseprite(buffer);

      // Convert aseprite frames to a horizontal spritesheet
      const cols = ase.frames.length;
      const sheetWidth = ase.width * cols;
      const sheetHeight = ase.height;

      const canvas = document.createElement('canvas');
      canvas.width = sheetWidth;
      canvas.height = sheetHeight;
      const ctx = canvas.getContext('2d')!;

      for (let i = 0; i < ase.frames.length; i++) {
        ctx.putImageData(ase.frames[i].imageData, i * ase.width, 0);
      }

      const img = new Image();
      img.onload = () => {
        onImageLoaded(img, file.name.replace(/\.(ase|aseprite)$/i, '.png'));
        toast(`Aseprite importado: ${ase.frames.length} frames como spritesheet (${sheetWidth}x${sheetHeight})`, 'success');
      };
      img.src = canvas.toDataURL('image/png');
    } catch (err) {
      console.error('Error parsing aseprite:', err);
      toast('Error al leer el archivo .aseprite', 'error');
    }
  }, [onImageLoaded]);

  const loadFile = useCallback((file: File) => {
    if (file.name.match(/\.(ase|aseprite)$/i)) {
      loadAsepriteFile(file);
      return;
    }
    if (!VALID_IMAGE_TYPES.includes(file.type)) {
      toast('Formato no soportado. Usa PNG, JPG, GIF, WebP, BMP o .aseprite', 'error');
      return;
    }
    loadImageFile(file);
  }, [loadImageFile, loadAsepriteFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) loadFile(file);
  }, [loadFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragging(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
    e.target.value = '';
  }, [loadFile]);

  if (hasImage) return null;

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
        dragging
          ? 'border-indigo-500 bg-indigo-50'
          : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.ase,.aseprite"
        onChange={handleInputChange}
        className="hidden"
      />
      <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
      </svg>
      <p className="text-gray-600 font-medium mb-1">
        Arrastra tu sprite sheet aqui
      </p>
      <p className="text-gray-400 text-sm">
        o haz clic para seleccionar un archivo
      </p>
      <p className="text-gray-400 text-xs mt-2">
        PNG, JPG, GIF, WebP, BMP, <span className="text-purple-500 font-medium">.aseprite</span>
      </p>
    </div>
  );
}
