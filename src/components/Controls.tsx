import React from 'react';

interface ControlsProps {
  blockSize: number;
  setBlockSize: (s: number) => void;
  onDownload: () => void;
  onDownloadSVG: () => void;
}

export const Controls = ({ blockSize, setBlockSize, onDownload, onDownloadSVG }: ControlsProps) => {
  return (
    <div className="bg-white border-[3px] border-black p-6 flex flex-col md:flex-row gap-6 items-center justify-between shadow-brutal">
        
        {/* Slider Section */}
        <div className="flex-1 w-full space-y-4">
            <div className="font-bold text-black text-sm uppercase tracking-tighter">
                BLOCK DENSITY: {blockSize}
            </div>
            <div className="relative h-8 flex items-center">
                <input 
                    type="range"
                    min="15"
                    max="100"
                    value={blockSize}
                    onChange={(e) => setBlockSize(parseInt(e.target.value))}
                    className="w-full"
                />
            </div>
        </div>

        {/* Action Section */}
        <div className="w-full md:w-auto flex flex-col gap-2">
            <button
                onClick={onDownload}
                className="w-full px-8 py-4 bg-industrial-accent hover:bg-black text-white font-bold border-[3px] border-black shadow-brutal hover:shadow-brutal-hover active:shadow-brutal-active hover:translate-x-[2px] hover:translate-y-[2px] transition-all uppercase tracking-tight text-sm"
            >
                EXPORT PNG
            </button>
            <button
                onClick={onDownloadSVG}
                className="w-full px-8 py-2 bg-white hover:bg-black hover:text-white text-black font-bold border-[3px] border-black shadow-brutal hover:shadow-brutal-hover active:shadow-brutal-active hover:translate-x-[2px] hover:translate-y-[2px] transition-all uppercase tracking-tight text-xs"
            >
                EXPORT SVG
            </button>
        </div>

    </div>
  );
};
