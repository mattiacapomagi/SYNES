import { useEffect, useRef } from 'react';

interface AudioWaveformProps {
  data: Float32Array | null;
  height?: number;
}

export const AudioWaveform = ({ data, height = 150 }: AudioWaveformProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = height * dpr;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, height);

    const midY = height / 2;
    // Step size to make sure we don't overdraw 
    // Optimization: Draw max 2000 points
    const pointsToDraw = 2000;
    const step = Math.ceil(data.length / pointsToDraw);
    const widthPerPoint = rect.width / pointsToDraw;
    
    ctx.beginPath();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2; // Thicker line

    for (let i = 0; i < pointsToDraw; i++) {
        const dataIndex = i * step;
        if (dataIndex >= data.length) break;

        // Peak measure in the chunk
        let maxVal = 0;
        for (let j = 0; j < step && (dataIndex + j) < data.length; j++) {
            const val = Math.abs(data[dataIndex + j]);
            if (val > maxVal) maxVal = val;
        }

        const x = i * widthPerPoint;
        const y = midY - (maxVal * midY * 0.9); // 0.9 scale to keep inside bounds

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Mirror (simplified)
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'; // Fainter bottom
    for (let i = 0; i < pointsToDraw; i++) {
        const dataIndex = i * step;
        if (dataIndex >= data.length) break;

        let maxVal = 0;
        for (let j = 0; j < step && (dataIndex + j) < data.length; j++) {
            const val = Math.abs(data[dataIndex + j]);
            if (val > maxVal) maxVal = val;
        }

        const x = i * widthPerPoint;
        const y = midY + (maxVal * midY * 0.9);

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();

  }, [data, height]);

  if (!data || data.length === 0) return (
      <div className="w-full border border-white flex items-center justify-center opacity-30" style={{ height }}>
         <span className="text-xs uppercase">[ NO SIGNAL DATA ]</span>
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
