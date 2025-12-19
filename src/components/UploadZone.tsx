import React, { useCallback, useState } from 'react';
import heic2any from 'heic2any';

interface UploadZoneProps {
  onUpload: (img: HTMLImageElement) => void;
}

export const UploadZone = ({ onUpload }: UploadZoneProps) => {
  const [isDragActive, setIsDragActive] = useState(false);

  const handleFile = useCallback(async (file: File) => {
      let processFile = file;

      // HEIC/HEIF Conversion
      if (file.type === 'image/heic' || file.type === 'image/heif' || file.name.toLowerCase().endsWith('.heic')) {
          try {
              const converted = await heic2any({
                  blob: file,
                  toType: 'image/jpeg',
                  quality: 0.9
              });
              
              // Handle edge case where it returns array
              const blob = Array.isArray(converted) ? converted[0] : converted;
              processFile = new File([blob], file.name.replace(/\.heic$/i, '.jpg'), { type: 'image/jpeg' });
          } catch (e) {
              console.error("HEIC Conversion failed", e);
              alert("COULD NOT PROCESS HEIC. TRY JPG/PNG.");
              return;
          }
      }

      // Create Image Object
      const img = new Image();
      img.onload = () => onUpload(img);
      img.onerror = () => alert("INVALID IMAGE FORMAT");
      img.src = URL.createObjectURL(processFile);
  }, [onUpload]);

  const onDrop = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      setIsDragActive(false);
      if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

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
            text-center cursor-pointer transition-all duration-0 w-full h-full flex items-center justify-center
            ${isDragActive 
                ? 'bg-industrial-accent/10' 
                : 'hover:bg-white/50'
            }
        `}
    >
        <input type="file" id="file-upload" className="hidden" accept="image/*,.heic,.heif,.tiff,.tif,.webp" onChange={onChange}/>
        
        <div className="space-y-4 pointer-events-none uppercase font-bold tracking-tighter">

            
            <div className="space-y-2">
                <h2 className="text-4xl font-black tracking-tighter">DROP / CLICK</h2>
                <p className="text-[10px] opacity-50 font-medium">JPG / PNG / GIF / WEBP / HEIC / TIFF</p>
            </div>
        </div>
    </div>
  );
};
