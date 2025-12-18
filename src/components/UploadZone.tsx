import { useCallback } from 'react';

interface UploadZoneProps {
  onUpload: (file: File) => void;
}

export const UploadZone = ({ onUpload }: UploadZoneProps) => {
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
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
            ${isDragActive ? 'border-primary bg-primary/10' : 'border-primary/30 hover:border-primary hover:bg-primary/5'}
        `}
    >
      <input
        id="file-upload"
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="absolute inset-0 opacity-0 cursor-pointer"
      />
      <div className="space-y-4">
        <h2 className="text-2xl font-bold uppercase tracking-widest border-b border-transparent group-hover:border-black inline-block">
          Insert Image
        </h2>
        <p className="text-xs uppercase opacity-70">
          [ DRAG & DROP or CLICK ] <br />
          SUPPORTED formats: JPG / PNG / GIF / WEBP / TIFF / HEIC
        </p>
      </div>
    </div>
  );
};
