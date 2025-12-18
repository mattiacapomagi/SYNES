import { useRef, useEffect } from 'react';
import type { GlitchParams } from '../hooks/useGlitchEngine';

interface VisualizerProps {
  glitchedUrl: string | null;
  mode: 'rgb' | 'bw' | 'r' | 'g' | 'b';
  onModeChange: (mode: 'rgb' | 'bw' | 'r' | 'g' | 'b') => void;
  params: GlitchParams;
  onParamsChange: (key: keyof GlitchParams, value: number) => void;
}

export const Visualizer = ({ glitchedUrl, mode, onModeChange }: Pick<VisualizerProps, 'glitchedUrl' | 'mode' | 'onModeChange'>) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Effect to handle channel rendering
  useEffect(() => {
    if (!glitchedUrl || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = glitchedUrl;
    img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        if (mode !== 'rgb') {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                 if (mode === 'bw') {
                     const avg = (data[i] + data[i+1] + data[i+2]) / 3;
                     data[i] = avg; 
                     data[i+1] = avg; 
                     data[i+2] = avg;
                 } else if (mode === 'r') {
                     // Red Channel Grayscale
                     const val = data[i];
                     data[i] = val;
                     data[i+1] = val;
                     data[i+2] = val;
                 } else if (mode === 'g') {
                     // Green Channel Grayscale
                     const val = data[i+1];
                     data[i] = val;
                     data[i+1] = val;
                     data[i+2] = val;
                 } else if (mode === 'b') {
                     // Blue Channel Grayscale
                     const val = data[i+2];
                     data[i] = val;
                     data[i+1] = val;
                     data[i+2] = val;
                 }
            }
            ctx.putImageData(imageData, 0, 0);
        }
    };
  }, [glitchedUrl, mode]);

  return (
    // Generic container that fits content. Use min-h only if loading/empty.
    // Generic container that fits content. Use min-h only if loading/empty.
    // "w-fit mx-auto" ensures the border hugs the canvas exactly, removing black gaps.
    <div className={`relative overflow-hidden bg-black group flex flex-col justify-center mx-auto border border-white ${!glitchedUrl ? 'w-full min-h-[300px]' : 'w-fit'}`}>
        {/* Background Grid - CSS Pattern */}
        <div className="absolute inset-0 opacity-20 pointer-events-none" 
             style={{ 
                 backgroundImage: 'radial-gradient(circle, #333 1px, transparent 1px)', 
                 backgroundSize: '20px 20px' 
             }}>
        </div>

        {/* Content - Canvas flows naturally to define height/width */}
        <div className="p-0">
            {glitchedUrl ? (
                <canvas ref={canvasRef} className="block max-w-full h-auto object-contain shadow-[0_0_20px_rgba(255,255,255,0.1)]" />
            ) : (
                <div className="absolute inset-0 flex items-center justify-center text-center space-y-2 opacity-50">
                    <div className="w-12 h-12 border border-white mx-auto animate-spin-slow"></div>
                    <p className="text-xs tracking-widest uppercase">Waiting for Data...</p>
                </div>
            )}
        </div>

        {/* HUD Elements */}
        {/* Top Left: Removed Optics Controls as requested */}
        <div className="absolute top-0 left-0 m-4"></div>

        <div className="absolute bottom-0 right-0 flex">
            {(['rgb', 'bw', 'r', 'g', 'b'] as const).map((m) => (
                <button
                    key={m}
                    onClick={() => onModeChange(m)}
                    className={`px-3 py-1 text-[10px] font-bold uppercase transition-colors border-t border-l border-white ${
                        mode === m ? 'bg-white text-black' : 'bg-black text-white hover:bg-white/20'
                    }`}
                >
                    {m}
                </button>
            ))}
        </div>
        
        {/* Crosshairs */}
        <div className="absolute top-1/2 left-4 w-2 h-[1px] bg-white/50"></div>
        <div className="absolute top-1/2 right-4 w-2 h-[1px] bg-white/50"></div>
        <div className="absolute top-4 left-1/2 w-[1px] h-2 bg-white/50"></div>
        <div className="absolute bottom-4 left-1/2 w-[1px] h-2 bg-white/50"></div>
    </div>
  );
};
