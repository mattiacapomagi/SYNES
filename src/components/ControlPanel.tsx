import type { GlitchParams } from '../hooks/useGlitchEngine';
// remove unused React imports

interface ControlPanelProps {
  params: GlitchParams;
  onChange: (key: keyof GlitchParams, value: number | string) => void;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onDownloadAudio: () => void;
  onRandomize: () => void;
  onReset: () => void;
  isReady: boolean;
}

export const ControlPanel = ({ 
    params, onChange, onTogglePlay, onSeek, isPlaying, currentTime, duration, 
    onDownloadAudio, onRandomize, onReset, isReady 
}: ControlPanelProps) => {

  const formatTime = (seconds: number) => {
      if (!isFinite(seconds)) return "00:00";
      const m = Math.floor(seconds / 60);
      const s = Math.floor(seconds % 60);
      return `${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}`;
  };

  // Internal state for scrubber visual only?
  // Actually we rely on parent 'currentTime' but we need to avoid jumping when dragging.
  // Letting parent handle it for now as per previous impl.

  return (
    <div className="border border-white p-6 space-y-6 w-full h-full flex flex-col justify-between bg-black min-h-[300px]">
      <div className="space-y-6">
        <div className="flex justify-between items-center border-b border-white pb-2 mb-4">
            <h3 className="uppercase text-sm font-bold tracking-widest">Chaos Control</h3>
            <div className={`w-2 h-2 ${isReady ? 'bg-white animate-pulse' : 'bg-transparent border border-white'}`}></div>
        </div>

        {[
            { id: 'displacement', label: 'Displacement', min: 0, max: 1, step: 0.01 },
            { id: 'chop', label: 'Chopper', min: 0, max: 1, step: 0.01 },
            { id: 'noise', label: 'Noise Injection', min: 0, max: 1, step: 0.01 },
            { id: 'crush', label: 'Bit Crush', min: 0, max: 1, step: 0.01 },
        ].map((control) => (
            <div key={control.id} className="space-y-2">
            <div className="flex justify-between text-xs uppercase">
                <span>{control.label}</span>
                <span>
                    {typeof params[control.id as keyof GlitchParams] === 'number' 
                        ? (params[control.id as keyof GlitchParams] as number).toFixed(2) 
                        : ''}
                </span>
            </div>
            <input
                type="range"
                min={control.min}
                max={control.max}
                step={control.step}
                value={params[control.id as keyof GlitchParams]}
                onChange={(e) => onChange(control.id as keyof GlitchParams, parseFloat(e.target.value))}
                disabled={!isReady}
                className="w-full appearance-none bg-transparent border border-white h-4 focus:outline-none 
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 
                        [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer 
                        disabled:opacity-50"
            />
            
            {/* Seed Input (Only under Displacement) */}
            {control.id === 'displacement' && (
                 <div className="pt-2 pl-4 border-l border-white/30 ml-2">
                    <div className="flex justify-between text-[10px] uppercase mb-1 opacity-70">
                        <span>Seed (Chaos Source)</span>
                    </div>
                    <input 
                        type="text" 
                        value={params.seed || ''}
                        placeholder="RANDOM"
                        onChange={(e) => onChange('seed', e.target.value)}
                        className="w-full bg-transparent border-b border-white py-1 text-xs font-mono focus:outline-none uppercase placeholder:text-white/30"
                    />
                 </div>
            )}
            </div>
        ))}
      </div>

      {/* Actions */}
      <div className="space-y-4">
         <div className="grid grid-cols-2 gap-4">
             <button
                onClick={onRandomize}
                disabled={!isReady}
                className="border border-white py-2 px-4 hover:bg-white hover:text-black uppercase text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-center"
            >
                [ Randomize ]
            </button>
             <button
                onClick={onReset}
                disabled={!isReady}
                className="border border-white py-2 px-4 hover:bg-white hover:text-black uppercase text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-center"
            >
                [ Reset ]
            </button>
         </div>

        {/* Player UI */}
        <div className="border-t border-white pt-4 space-y-2">
            <div className="flex justify-between items-center">
                 <button
                    onClick={onTogglePlay}
                    disabled={!isReady}
                    className="text-xs font-bold uppercase hover:text-gray-400 disabled:opacity-50"
                >
                    {isPlaying ? '[ STOP ]' : '[ PLAY ]'}
                </button>
                <div className="text-[10px] font-mono">
                    {formatTime(currentTime)} / {formatTime(duration)}
                </div>
            </div>
            
            <input 
                type="range"
                min={0}
                max={duration || 100}
                step={0.1}
                value={currentTime}
                onChange={(e) => onSeek(parseFloat(e.target.value))}
                disabled={!isReady}
                className="w-full h-1 bg-white/20 appearance-none rounded-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-white"
            />
            
            <div className="flex justify-between space-x-2 pt-2">
                <button
                    onClick={onDownloadAudio}
                    disabled={!isReady}
                    className="flex-1 border border-white py-1 px-2 text-[10px] uppercase hover:bg-white hover:text-black transition-colors disabled:opacity-50"
                >
                    Save WAV
                </button>
                 {/* Removed Image Save from here as requested */}
            </div>
        </div>
      </div>
    </div>
  );
};
