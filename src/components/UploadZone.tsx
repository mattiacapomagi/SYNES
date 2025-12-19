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
            border-[3px] p-12 text-center cursor-pointer transition-all duration-0
            ${isDragActive 
                ? 'border-industrial-accent bg-industrial-accent/10' 
                : 'border-black hover:bg-white bg-industrial-bg'
            }
        `}
    >
        <input type="file" id="file-upload" className="hidden" accept="image/*" onChange={onChange}/>
        
        <div className="space-y-4 pointer-events-none uppercase font-bold tracking-tighter">
            <div className={`mx-auto w-12 h-12 border-[3px] border-black flex items-center justify-center text-3xl transition-transform ${isDragActive ? 'rotate-90 bg-industrial-accent text-white' : 'bg-white text-black'}`}>
               +
            </div>
            <h2 className="text-xl">INPUT SOURCE</h2>
            <p className="text-sm opacity-60">[ DRAG DROP / CLICK ]</p>
        </div>
    </div>
  );
};
