import { useState } from 'react';
import { UploadZone } from './components/UploadZone';
import { BlockifyEngine } from './components/BlockifyEngine';
import { Controls } from './components/Controls';
import { computeMosaicGrid, renderGridToCanvas, renderGridToSVG } from './utils/mosaicGenerator';
import './index.css';

function App() {
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null);
  const [blockSize, setBlockSize] = useState<number>(20);

  const handleDownloadPNG = () => {
    if (!sourceImage) return;

    // 1. Calculate Target Dimensions (Min Height 5000px)
    const targetH = Math.max(sourceImage.height, 5000);

    // 2. Logic to determine Block Size for High Res
    // We want the same grid density as the preview.
    // PREVIEW: 
    let previewW = sourceImage.width;
    let previewH = sourceImage.height;
    const MAX_DISPLAY = 1500; 
    if (previewW > MAX_DISPLAY || previewH > MAX_DISPLAY) {
        const ratio = previewW / previewH;
        if (previewW > previewH) { previewW = MAX_DISPLAY; previewH = MAX_DISPLAY / ratio; }
        else { previewH = MAX_DISPLAY; previewW = MAX_DISPLAY * ratio; }
    }
    const cols = Math.floor(previewW / blockSize);
    const rows = Math.floor(previewH / blockSize);

    // TARGET
    const exportBlockSize = Math.floor(targetH / rows);
    const finalH = rows * exportBlockSize;
    const finalW = cols * exportBlockSize;

    // 3. Prepare Image for Grid Analysis
    // We need to feed the engine an image that matches the target grid 
    // BUT mapped to valid pixels.
    // The easiest way is to resize the source image to the exact Final dimensions or near it
    // and let the engine sample it.
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = finalW;
    tempCanvas.height = finalH;
    const tCtx = tempCanvas.getContext('2d')!;
    // Draw source image scaled
    tCtx.drawImage(sourceImage, 0, 0, finalW, finalH);
    
    // 4. Compute Grid
    // Cast to unknown to satisfy type if needed, or if types match okay.
    const grid = computeMosaicGrid(tempCanvas as unknown as HTMLImageElement, exportBlockSize);
    
    // 5. Render to Final Canvas
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = finalW;
    exportCanvas.height = finalH;
    const eCtx = exportCanvas.getContext('2d')!;
    
    renderGridToCanvas(eCtx, grid, exportBlockSize);
    
    // 6. Download
    const link = document.createElement('a');
    link.download = `bricklab-export-highres-${Date.now()}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  };

  const handleDownloadSVG = () => {
      if (!sourceImage) return;

      // For SVG, we can use the same grid logic but we don't strictly need to upscale the pixel data
      // since vector is resolution independent. BUT we need the grid to match.
      // We can use the PREVIEW resolution to calculate the grid (since that's what user sees)
      // and map it to SVG units.
      
      let previewW = sourceImage.width;
      let previewH = sourceImage.height;
      const MAX_DISPLAY = 1500; 
      if (previewW > MAX_DISPLAY || previewH > MAX_DISPLAY) {
          const ratio = previewW / previewH;
          if (previewW > previewH) { previewW = MAX_DISPLAY; previewH = MAX_DISPLAY / ratio; }
          else { previewH = MAX_DISPLAY; previewW = MAX_DISPLAY * ratio; }
      }
      // Ensure divisible by block size to match preview exactly
      previewW = Math.floor(previewW / blockSize) * blockSize;
      previewH = Math.floor(previewH / blockSize) * blockSize;
      
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = previewW;
      tempCanvas.height = previewH;
      const tCtx = tempCanvas.getContext('2d')!;
      tCtx.drawImage(sourceImage, 0, 0, previewW, previewH);
      
      const grid = computeMosaicGrid(tempCanvas as unknown as HTMLImageElement, blockSize);
      
      const svgString = renderGridToSVG(grid, previewW, previewH);
      
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const link = document.createElement('a');
      link.download = `bricklab-export-${Date.now()}.svg`;
      link.href = URL.createObjectURL(blob);
      link.click();
  };

  return (
    <div className="min-h-screen pb-20 bg-industrial-bg font-mono selection:bg-industrial-accent selection:text-white">
      {/* Header */}
      <nav className="bg-white border-b-[3px] border-black sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
              <div className="flex items-center gap-4">
                  <img src="/bricklab-logo.svg" alt="BRICKLAB LOGO" className="h-12 w-auto" />
                  <span className="text-3xl font-bold text-industrial-accent uppercase tracking-tighter pt-1">BRICKLAB</span>
              </div>
          </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-[1400px] mx-auto px-6 pt-6 space-y-6">
          
          {/* 1. Upload Section */}
          <section className={sourceImage ? '' : 'py-20'}>
               {!sourceImage ? (
                   <div className="max-w-xl mx-auto">
                       <UploadZone onUpload={setSourceImage} />
                   </div>
               ) : (
                   <div>
                       <button 
                            onClick={() => setSourceImage(null)}
                            className="bg-black text-white text-xs font-bold px-3 py-1 hover:bg-industrial-accent transition-colors uppercase tracking-widest border-[2px] border-black"
                       >
                           ← RESET
                       </button>
                   </div>
               )}
          </section>

          {/* 2. Workspace */}
          {sourceImage && (
            <div className="flex flex-col md:flex-row gap-6 items-start animate-fade-in-up">
                
                {/* Canvas Engine (Left/Top) */}
                <div className="flex-1 border-[3px] border-black bg-white shadow-brutal p-2 overflow-hidden flex items-center justify-center bg-dots-pattern">
                    <div className="w-full flex items-center justify-center">
                        <BlockifyEngine 
                            image={sourceImage}
                            blockSize={blockSize}
                        />
                    </div>
                </div>

                {/* Controls (Right/Side) */}
                <div className="w-full md:w-80 md:sticky md:top-24 shrink-0">
                    <Controls 
                        blockSize={blockSize}
                        setBlockSize={setBlockSize}
                        onDownload={handleDownloadPNG}
                        onDownloadSVG={handleDownloadSVG}
                    />
                </div>
            </div>
          )}

      </main>
      
      {/* Brutalist Footer */}
      <footer className="w-full text-center py-6 text-[10px] font-bold uppercase opacity-50 mix-blend-exclusion">
         Mattia Capomagi 2025
      </footer>
    </div>
  )
}

export default App
