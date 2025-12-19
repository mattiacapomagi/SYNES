import React, { useCallback, useState } from 'react';

interface UploadZoneProps {
  onUpload: (img: HTMLImageElement) => void;
}

export const UploadZone = ({ onUpload }: UploadZoneProps) => {
  const [isDragActive, setIsDragActive] = useState(false);

  const handleFile = (file: File) => {
      // Create Image Object
      const img = new Image();
      img.onload = () => onUpload(img);
      img.src = URL.createObjectURL(file);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      setIsDragActive(false);
      if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  }, []);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0]) handleFile(e.target.files[0]);
  };

  return (
    <div 
        onDragEnter={(e) => { e.preventDefault(); setIsDragActive(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragActive(false); }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        onClick={() => document.getElementById('file-upload')?.click()}
        className={`
            border-4 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all transform duration-200
            ${isDragActive 
                ? 'border-brick-blue bg-brick-blue/10 scale-102 shadow-tray' 
                : 'border-slate-300 hover:border-brick-blue hover:bg-slate-100'
            }
        `}
    >
        <input type="file" id="file-upload" className="hidden" accept="image/*" onChange={onChange}/>
        
        <div className="space-y-4 pointer-events-none">
            <div className={`mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-brick-blue to-blue-400 shadow-plastic flex items-center justify-center text-white text-3xl font-bold transition-transform ${isDragActive ? 'rotate-12' : ''}`}>
               +
            </div>
            <h2 className="text-xl font-bold text-slate-700">Build Your Mosaic</h2>
            <p className="text-slate-500">Drag a photo here or click to open the kit.</p>
        </div>
    </div>
  );
};
