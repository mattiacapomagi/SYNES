import { useEffect, useRef, useState } from 'react';
import { computeMosaicGrid, renderGridToCanvas } from '../utils/mosaicGenerator';

interface BlockifyEngineProps {
  image: HTMLImageElement | null;
  blockSize: number; // 5 to 100
}

export const BlockifyEngine = ({ image, blockSize }: BlockifyEngineProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
     if (!image || !canvasRef.current) return;
     
     const process = () => {
         setIsProcessing(true);
         const canvas = canvasRef.current!;
         const ctx = canvas.getContext('2d', { willReadFrequently: true });
         
         if (!ctx) return;

         // 1. Compute Grid
         // We need to limit the analysis size for performance, but we must use the SAME logic as export
         // so let's stick to the engine logic.
         // Actually, the engine's computeMosaicGrid takes the image directly.
         // We need to handle the display sizing (width/height) here for the canvas element,
         // but the rendering draws pixels.
         
         // Calculate display dimensions based on block size (round to nearest)
         let w = image.width;
         let h = image.height;
         const MAX_DISPLAY = 1500;
         if (w > MAX_DISPLAY || h > MAX_DISPLAY) {
              const ratio = w / h;
              if (w > h) { w = MAX_DISPLAY; h = MAX_DISPLAY / ratio; }
              else { h = MAX_DISPLAY; w = MAX_DISPLAY * ratio; }
         }
         
         // Ensure divisible by block size
         w = Math.floor(w / blockSize) * blockSize;
         h = Math.floor(h / blockSize) * blockSize;
         
         canvas.width = w;
         canvas.height = h;

         // Scale image to this size for processing?
         // Our computeMosaicGrid uses the raw image. If we pass the raw image, it calculates blocks based on raw pixels.
         // If `blockSize` is for the display version, we need to match.
         // Wait. `blockSize` is "15px" etc.
         // If we allow the users to set block size based on the ORIGINAL image, that's one thing.
         // But usually "Block Size" in these apps refers to output granularity.
         // If we resize the image for display, effective block size changes.
         // Let's create a temporary scaled image for the engine to consume if we are downscaling.
         
         const analysisImage = document.createElement('canvas');
         analysisImage.width = w;
         analysisImage.height = h;
         const aCtx = analysisImage.getContext('2d')!;
         aCtx.drawImage(image, 0, 0, w, h);
         
         // Use the temp canvas as image source (it acts like an HTMLCanvasElement which is valid for drawImage)
         // We cast to any or HTMLImageElement-like
         const grid = computeMosaicGrid(analysisImage as unknown as HTMLImageElement, blockSize);
         
         // Render
         ctx.clearRect(0, 0, w, h);
         renderGridToCanvas(ctx, grid, blockSize);
         
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
