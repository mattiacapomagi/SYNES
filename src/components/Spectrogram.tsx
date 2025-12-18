import { useEffect, useRef, useState } from 'react';

interface SpectrogramProps {
  data: Uint8Array | null;
  height?: number;
  onInteraction?: (x: number, y: number) => void;
  onInteractionEnd?: () => void;
  isDark: boolean;
}

export const Spectrogram = ({ data, height = 200, onInteraction, onInteractionEnd, isDark }: SpectrogramProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDragging = useRef(false);

  // Visual Cursor State
  // We track local coordinates for the UI feedback
  const [cursor, setCursor] = useState<{x: number, y: number} | null>(null);
  
  // ... pointer handlers ...
  const handlePointer = (e: React.PointerEvent) => {
      if (!isDragging.current || !onInteraction) return;
      
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const rawX = e.clientX - rect.left;
      const rawY = e.clientY - rect.top;
      
      const x = Math.max(0, Math.min(1, rawX / rect.width));
      const y = Math.max(0, Math.min(1, 1 - rawY / rect.height)); // 0 at bottom
      
      setCursor({ x: x * 100, y: (1-y) * 100 }); // Store as percentage top-left
      onInteraction(x, y);
  };

  const startDrag = (e: React.PointerEvent) => {
      isDragging.current = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      handlePointer(e);
  };

  const endDrag = (e: React.PointerEvent) => {
      isDragging.current = false;
      const el = e.target as HTMLElement;
      if(el && el.releasePointerCapture) el.releasePointerCapture(e.pointerId);
      if (onInteractionEnd) onInteractionEnd();
      setCursor(null); // Hide cursor on end
  };

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

    // Dynamic Background
    ctx.fillStyle = isDark ? '#000000' : '#ffffff';
    ctx.fillRect(0, 0, rect.width, height);

    if (data.length === 0) return;

    // Draw "Spectrogram" style bars
    const barWidth = rect.width / data.length;
    
    for (let i = 0; i < data.length; i++) {
        const value = data[i]; // 0-255
        const percent = value / 255;
        const barHeight = percent * height;
        
        // Heatmap Color: Blue -> Red -> Yellow -> White
        // In Light mode, we might want inverse? No, "spectral" usually implies dark bg.
        // But requested is "background white".
        // Let's keep hue but make it readable?
        const hue = 240 - (percent * 240); // Blue (240) to Red (0)
        ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
        
        // Draw bar
        ctx.fillRect(i * barWidth, height - barHeight, barWidth + 1, barHeight);
    }
    
    // Grid overlay - Invert for light mode
    ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    for(let y = 0; y < height; y += 20) {
        ctx.fillRect(0, y, rect.width, 1);
    }

  }, [data, height, isDark]);

  if (!data) return (
      <div className={`w-full border border-primary flex items-center justify-center opacity-30 ${isDark ? 'bg-black text-white' : 'bg-white text-primary'}`} style={{ height }}>
         <span className="text-xs uppercase font-mono font-bold">[ WAITING FOR SIGNAL ]</span>
      </div>
  );

  return (
    <div className={`relative w-full block select-none touch-none ${isDark ? 'bg-black' : 'bg-white'}`} style={{ height }}>
        <canvas 
            ref={canvasRef} 
            className="w-full h-full cursor-crosshair touch-none block"
            width={100} // placeholder, resized by effect
            height={height}
            onPointerDown={startDrag}
            onPointerMove={handlePointer}
            onPointerUp={endDrag}
            onPointerLeave={endDrag}
        />
        {/* XY Pad Cursor Overlay */}
        {cursor && (
            <>
                {/* Crosshairs */}
                <div className="absolute top-0 bottom-0 border-l border-white/50 pointer-events-none" style={{ left: `${cursor.x}%` }} />
                <div className="absolute left-0 right-0 border-t border-white/50 pointer-events-none" style={{ top: `${cursor.y}%` }} />
                {/* Dot */}
                <div 
                    className="absolute w-3 h-3 bg-white rounded-full -ml-[6px] -mt-[6px] pointer-events-none shadow-[0_0_10px_rgba(255,255,255,0.8)]"
                    style={{ left: `${cursor.x}%`, top: `${cursor.y}%` }}
                />
            </>
        )}
    </div>
  );
};
