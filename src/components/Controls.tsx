import React from 'react';

interface ControlsProps {
  blockSize: number;
  setBlockSize: (s: number) => void;
  onDownload: () => void;
}

export const Controls = ({ blockSize, setBlockSize, onDownload }: ControlsProps) => {
  return (
    <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-100 p-6 flex flex-col md:flex-row gap-6 items-center justify-between">
        
        {/* Slider Section */}
        <div className="flex-1 w-full space-y-2">
            <div className="flex justify-between font-bold text-slate-700 text-sm uppercase tracking-wider">
                <span>Block Size</span>
                <span className="bg-slate-100 px-2 rounded text-brick-blue">{blockSize}px</span>
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
            <div className="flex justify-between text-xs text-slate-400 font-medium">
                <span>Detailed (5px)</span>
                <span>Abstract (80px)</span>
            </div>
        </div>

        {/* Action Section */}
        <div className="w-full md:w-auto">
            <button
                onClick={onDownload}
                className="w-full md:w-auto px-8 py-3 bg-brick-green hover:bg-emerald-500 text-white font-bold rounded-xl shadow-plastic hover:shadow-plastic-active translate-y-0 hover:translate-y-1 transition-all active:shadow-none active:translate-y-1"
            >
                Export Mosaic PNG
            </button>
        </div>

    </div>
  );
};
