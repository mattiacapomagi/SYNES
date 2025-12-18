import { useCallback, useState } from 'react';

interface UploadZoneProps {
  onUpload: (file: File) => void;
}

export const UploadZone = ({ onUpload }: UploadZoneProps) => {
  const [isDragActive, setIsDragActive] = useState(false);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);

      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        onUpload(file);
      }
    },
    [onUpload]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        onUpload(e.target.files[0]);
      }
    },
    [onUpload]
  );

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => document.getElementById('file-upload')?.click()}
      className={`border border-dashed p-12 text-center transition-all cursor-pointer group relative
            ${isDragActive ? 'border-black bg-black/10 dark:border-white dark:bg-white/10' : 'border-black/30 dark:border-white/30 hover:border-black dark:hover:border-white hover:bg-black/5 dark:hover:bg-white/5'}
        `}
    >
      <input 
        id="file-upload"
        type="file" 
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />
      <div className="space-y-4 pointer-events-none">
        <div className="text-4xl opacity-50 group-hover:opacity-100 transition-opacity">
            +
        </div>
        <p className="uppercase tracking-widest text-sm font-bold">
          {isDragActive ? 'DROP SIGNAL SOURCE' : 'INITIATE UPLOAD / DROP RAW DATA'}
        </p>
        <p className="text-[10px] opacity-50 font-mono">
            SUPPORTS: JPG, PNG, HEIC, WEBP
        </p>
      </div>
    </div>
  );
};
