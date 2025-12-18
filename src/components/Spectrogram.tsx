import { useEffect, useRef } from 'react';

interface SpectrogramProps {
  data: Uint8Array | null;
  height?: number;
}

export const Spectrogram = ({ data, height = 200 }: SpectrogramProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Dark background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, rect.width, height);

    if (data.length === 0) return;

    // Draw "Spectrogram" style bars
    const barWidth = rect.width / data.length;
    
    for (let i = 0; i < data.length; i++) {
        const value = data[i]; // 0-255
        const percent = value / 255;
        const barHeight = percent * height;
        
        // Heatmap Color: Blue -> Red -> Yellow -> White
        const hue = 240 - (percent * 240); // Blue (240) to Red (0)
        ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
        
        // Draw bar
        ctx.fillRect(i * barWidth, height - barHeight, barWidth + 1, barHeight);
    }
    
    // Grid overlay
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    for(let y = 0; y < height; y += 20) {
        ctx.fillRect(0, y, rect.width, 1);
    }

  }, [data, height]);

  if (!data) return (
      <div className="w-full border border-white flex items-center justify-center opacity-30 bg-black" style={{ height }}>
         <span className="text-xs uppercase text-white font-mono">[ WAITING FOR SIGNAL ]</span>
      </div>
  );

  return (
    <canvas 
        ref={canvasRef} 
        className="w-full border border-white bg-black block"
        style={{ height }}
    />
  );
};
