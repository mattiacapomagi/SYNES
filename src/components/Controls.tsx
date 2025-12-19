import React from 'react';

interface ControlsProps {
  blockSize: number;
  setBlockSize: (s: number) => void;
  onDownload: () => void;
}

export const Controls = ({ blockSize, setBlockSize, onDownload }: ControlsProps) => {
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
                    min="5"
                    max="80"
                    value={blockSize}
                    onChange={(e) => setBlockSize(parseInt(e.target.value))}
                    className="w-full"
                />
            </div>
        </div>

        {/* Action Section */}
        <div className="w-full md:w-auto">
            <button
                onClick={onDownload}
                className="w-full md:w-auto px-8 py-4 bg-industrial-accent hover:bg-black text-white font-bold border-[3px] border-black shadow-brutal hover:shadow-brutal-hover active:shadow-brutal-active hover:translate-x-[2px] hover:translate-y-[2px] transition-all uppercase tracking-tight text-sm"
            >
                EXPORT
            </button>
        </div>

    </div>
  );
};
