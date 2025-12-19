

interface ControlsProps {
  blockSize: number;
  setBlockSize: (s: number) => void;
  onSnapshot: () => void;
  onReset: () => void;
  onDownload: () => void;
  onDownloadSVG: () => void;
}

export const Controls = ({ blockSize, setBlockSize, onSnapshot, onReset, onDownload, onDownloadSVG }: ControlsProps) => {
  
  // Mapping logic
  // Internal: 15 (High Density) <-> 50 (Low Density)
  // UI: 0 (Low Density/50) <-> 100 (High Density/15)
  // Formula: Internal = 50 - (UI / 100) * (50 - 15) = 50 - (UI * 0.35)
  // UI = (50 - Internal) / 0.35

  const uiValue = Math.round((50 - blockSize) / 0.35);

  const handleSliderChange = (val: number) => {
      // Map UI (0-100) to Internal (50-15)
      const internal = 50 - (val * 0.35);
      setBlockSize(Math.max(15, Math.min(50, internal)));
  };

  return (
    <div className="bg-white border-[3px] border-black p-6 flex flex-col md:flex-row gap-6 items-center justify-between shadow-brutal">
        
        {/* Slider Section */}
        <div className="flex-1 w-full space-y-4">
            <div className="flex justify-between items-center">
                <div className="font-bold text-black text-sm uppercase tracking-tighter">
                    BLOCK DENSITY: {uiValue}
                </div>
                <button 
                    onClick={onReset}
                    className="text-[10px] font-bold border border-black px-2 hover:bg-black hover:text-white transition-colors"
                >
                    RESET
                </button>
            </div>
            <div className="relative h-8 flex items-center">
                <input 
                    type="range"
                    min="0"
                    max="100"
                    value={uiValue}
                    onPointerDown={onSnapshot}
                    onChange={(e) => handleSliderChange(parseInt(e.target.value))}
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
