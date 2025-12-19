import { useEffect, useRef, useState } from 'react';
import { drawBrick } from '../utils/brickRenderer';

interface BlockifyEngineProps {
  image: HTMLImageElement | null;
  blockSize: number; // 5 to 100
}

export const BlockifyEngine = ({ image, blockSize }: BlockifyEngineProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
     if (!image || !canvasRef.current) return;
     
     const process = () => {
         setIsProcessing(true);
         const canvas = canvasRef.current!;
         const ctx = canvas.getContext('2d', { willReadFrequently: true });
         
         if (!ctx) return;

         // 1. Setup Canvas Dimensions matches Image
         // Limit max size for performance (e.g., max 2000px)
         let w = image.width;
         let h = image.height;
         const MAX_SIZE = 1500;
         if (w > MAX_SIZE || h > MAX_SIZE) {
             const ratio = w / h;
             if (w > h) { w = MAX_SIZE; h = MAX_SIZE / ratio; }
             else { h = MAX_SIZE; w = MAX_SIZE * ratio; }
         }
         
         // Round to nearest block size to avoid partial jagged edges
         w = Math.floor(w / blockSize) * blockSize;
         h = Math.floor(h / blockSize) * blockSize;

         canvas.width = w;
         canvas.height = h;
         setDimensions({ width: w, height: h });
         
         // 2. Draw original image to get pixel data
         // We draw it small first? NO, simpler to draw full then sample.
         // Actually, drawing it scaled down to grid size is a fast way to avg colors.
         
         const columns = Math.ceil(w / blockSize);
         const rows = Math.ceil(h / blockSize);
         
         // Helper canvas for sampling
         const helpCanvas = document.createElement('canvas');
         helpCanvas.width = columns;
         helpCanvas.height = rows;
         const helpCtx = helpCanvas.getContext('2d')!;
         
         // Draw image scaled down. Browser handles averaging (bilinear).
         helpCtx.drawImage(image, 0, 0, columns, rows);
         
         // Get the pixel data of the tiny image
         const pixelData = helpCtx.getImageData(0, 0, columns, rows).data;
         
         // 3. Render Bricks on Main Canvas
         // Clear
         ctx.clearRect(0, 0, w, h);
         
         // Iterate
         for (let r = 0; r < rows; r++) {
             for (let c = 0; c < columns; c++) {
                 // Pixel index
                 const i = (r * columns + c) * 4;
                 const red = pixelData[i];
                 const green = pixelData[i+1];
                 const blue = pixelData[i+2];
                 const alpha = pixelData[i+3];
                 
                 // Skip transparent-ish
                 if (alpha < 50) continue;
                 
                 drawBrick(
                     ctx,
                     c * blockSize,
                     r * blockSize,
                     blockSize,
                     { r: red, g: green, b: blue }
                 );
             }
         }
         
         setIsProcessing(false);
     };

     // Debounce processing if dragging slider fast?
     const t = setTimeout(process, 10);
     return () => clearTimeout(t);

  }, [image, blockSize]);

  if (!image) return null;

  return (
    <div className="relative flex items-center justify-center mx-auto" style={{ width: 'fit-content', maxHeight: '100%', maxWidth: '100%' }}>
        <canvas 
            ref={canvasRef}
            className="block object-contain"
            style={{ maxWidth: '100%', maxHeight: '75vh' }}
        />
        {isProcessing && (
            <div className="absolute inset-0 bg-white/50 flex items-center justify-center backdrop-blur-sm">
                <div className="w-12 h-12 border-4 border-industrial-accent border-t-transparent animate-spin"></div>
            </div>
        )}
    </div>
  );
};
