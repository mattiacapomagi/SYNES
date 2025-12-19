
import { useState, useEffect } from 'react';
import { UploadZone } from './components/UploadZone';
import { BlockifyEngine } from './components/BlockifyEngine';
import { Controls } from './components/Controls';
import { computeMosaicGrid, renderGridToCanvas, renderGridToSVG } from './utils/mosaicGenerator';
import bricklabLogo from './assets/bricklab-logo.svg'; // Import moved logo
import './index.css';

function App() {
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null);
  
  // Undo/Redo Logic for Block Size
  // Default Internal 50 (UI 0)
  const [history, setHistory] = useState<{ past: number[], present: number, future: number[] }>({
      past: [],
      present: 50,
      future: []
  });
  
  const blockSize = history.present;
  
  const setBlockSize = (newSize: number, addToHistory = false) => {
      setHistory(curr => {
          if (curr.present === newSize) return curr;
          if (addToHistory) {
              return {
                  past: [...curr.past, curr.present],
                  present: newSize,
                  future: []
              };
          } else {
              // Update present without pushing (for dragging, handled later?)
              // Ideally for dragging we update visual but only push on commit.
              // For simplicity, let's just update present here.
              // If we want genuine undo for dragging, we need onMouseUp to commit.
              // Let's rely on the Controls passing a flag or handle "commit" separarely.
              // Actually, simplified: every discrete set pushes? 
              // No, dragging creates 100 updates.
              return { ...curr, present: newSize };
          }
      });
  };


  
  // Let's try a simpler approach compatible with standard undo/redo patterns.
  // We'll use a specific function for "Committing" a change.
  // The slider onChange updates `present`. 
  // We need `onAfterChange` or `onMouseUp` from Controls to trigger "snapshot".
  
  const undo = () => {
      setHistory(curr => {
          if (curr.past.length === 0) return curr;
          const previous = curr.past[curr.past.length - 1];
          const newPast = curr.past.slice(0, curr.past.length - 1);
          return {
              past: newPast,
              present: previous,
              future: [curr.present, ...curr.future]
          };
      });
  };

  const redo = () => {
      setHistory(curr => {
          if (curr.future.length === 0) return curr;
          const next = curr.future[0];
          const newFuture = curr.future.slice(1);
          return {
              past: [...curr.past, curr.present],
              present: next,
              future: newFuture
          };
      });
  };

  // Snapshot function to be called before a batch of changes (e.g. drag start)
  const snapshot = () => {
      setHistory(curr => ({
          ...curr,
          past: [...curr.past, curr.present]
      }));
  };

  // Keyboard Listeners
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
              e.preventDefault();
              if (e.shiftKey) {
                  redo();
              } else {
                  undo();
              }
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);


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
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '.');
    const link = document.createElement('a');
    link.download = `BRICKLAB ${dateStr} ${timeStr}.png`;
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
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '.');
      const link = document.createElement('a');
      link.download = `BRICKLAB ${dateStr} ${timeStr}.svg`;
      link.href = URL.createObjectURL(blob);
      link.click();
  };

  return (
    <div className="min-h-screen bg-industrial-bg font-mono selection:bg-industrial-accent selection:text-white flex flex-col">
      {/* Header */}
      <nav className="bg-white border-b-[3px] border-black sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between">
              <a href="https://mattiacapomagi.github.io/BRICKLAB" className="flex items-center gap-2 md:gap-4 hover:opacity-80 transition-opacity">
                  <img src={bricklabLogo} alt="BRICKLAB LOGO" className="h-8 md:h-12 w-auto" />
                  <span className="text-lg md:text-3xl font-bold text-industrial-accent uppercase tracking-tighter">BRICKLAB</span>
              </a>
              <a 
                  href="https://mattiacapomagi.figma.site/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[10px] md:text-sm font-normal uppercase tracking-widest opacity-50 flex items-center h-full whitespace-nowrap hover:opacity-100 transition-opacity"
              >
                  Mattia Capomagi 2025
              </a>
          </div>
      </nav>

           {/* 1. Upload Section */}
           {!sourceImage && (
               <section className="flex-grow flex flex-col w-full">
                   <div className="flex-grow w-full h-[calc(100vh-140px)]">
                       <UploadZone onUpload={setSourceImage} />
                   </div>
               </section>
           )}

           {/* 2. Workspace */}
           {sourceImage && (
             <main className="max-w-[1400px] mx-auto px-6 pt-6 space-y-6 flex-grow w-full pb-12">
                <div className="flex justify-start mb-4">
                        <button 
                            onClick={() => setSourceImage(null)}
                            className="bg-black text-white text-xs font-bold px-3 py-1 hover:bg-industrial-accent transition-colors uppercase tracking-widest border-[2px] border-black"
                        >
                            ← RESET
                        </button>
                </div>

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
                 <div className="w-full md:w-96 md:sticky md:top-24 shrink-0">
                      <Controls 
                          blockSize={blockSize}
                          setBlockSize={(val) => setBlockSize(val)}
                          onSnapshot={snapshot}
                          onReset={() => {
                              snapshot();
                              setBlockSize(50);
                          }}
                          onDownload={handleDownloadPNG}
                          onDownloadSVG={handleDownloadSVG}
                      />
                 </div>
             </div>
           </main>
          )}
    </div>
  )
}

export default App
