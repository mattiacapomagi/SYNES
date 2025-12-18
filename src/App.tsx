import { useState, useRef, useEffect } from 'react';
import JSZip from 'jszip';
import { UploadZone } from './components/UploadZone';
import { ControlPanel } from './components/ControlPanel';
import { Visualizer } from './components/Visualizer';
import { Spectrogram } from './components/Spectrogram';
import { useGlitchEngine, type GlitchParams } from './hooks/useGlitchEngine';

function App() {
  const { 
    processImage, reprocess, toggleAudio, seek, downloadWav, 
    isPlaying, currentTime, audioDuration, randomizeParams, 
    glitchedUrl, spectrogramData, status 
  } = useGlitchEngine();
  
  const [vizMode, setVizMode] = useState<'rgb' | 'bw' | 'r' | 'g' | 'b'>('rgb');
  const [params, setParams] = useState<GlitchParams>({
    displacement: 0,
    noise: 0,
    seed: '',
    bloomThreshold: 0.5,
    bloomIntensity: 0,
    bloomRadius: 0.24
  });

  // Undo History
  const [history, setHistory] = useState<GlitchParams[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Load initial params into history on mount (or first render) is tricky with strict mode/double mount
  // Simpler: Just push to history whenever setParams is called via "commit" action.
  

  // Fix scope issue: need variable inside setter
  // Re-write separate function or use useEffect?
  // Let's use a ref for history to avoid stale closures in listeners, 
  // but state for re-render.
  
  const pushHistory = (newParams: GlitchParams) => {
      setHistory(prev => {
          const current = prev.slice(0, historyIndex + 1);
          return [...current, newParams];
      });
      setHistoryIndex(prev => prev + 1);
  };
  
  const undo = () => {
      if (historyIndex > 0) {
          const newIdx = historyIndex - 1;
          const p = history[newIdx];
          setParams(p);
          setHistoryIndex(newIdx);
          reprocess(p);
      }
  };
  
  const redo = () => {
      if (historyIndex < history.length - 1) {
          const newIdx = historyIndex + 1;
          const p = history[newIdx];
          setParams(p);
          setHistoryIndex(newIdx);
          reprocess(p);
      }
  };

  // Keyboard Shortcuts
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
              e.preventDefault();
              if (e.shiftKey) redo();
              else undo();
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history]); // Dep array ensures we have latest state

  // Initialize history
  useEffect(() => {
      if (history.length === 0) {
        // Initial push only if empty and ready? 
        // Better: Don't push initially, let the first user action push.
        // OR push default state.
        // setHistory([params]); setHistoryIndex(0);
      }
  }, []); // Run once

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleUpload = (file: File) => {
    setParams({ 
        displacement: 0, 
        noise: 0, 
        seed: '',
        bloomThreshold: 0.5,
        bloomIntensity: 0,
        bloomRadius: 0.24
    }); // Reset params
    processImage(file);
  };

  const handleParamsChange = (key: any, value: any) => {
    const newParams = { ...params, [key]: value };
    setParams(newParams);
    
    // Debounce re-process & history push
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      reprocess(newParams);
      // Only push to history if different?
      pushHistory(newParams); 
    }, 150);
  };
  
  // Interactive Spectrogram Handler
  const handleSpectrogramInteraction = (x: number, y: number) => {
      // Map X (0..1) -> Displacement (0..0.5)
      // Map Y (0..1) -> Noise (0..0.8)
      
      const newDisplacement = Math.pow(x, 1.5) * 0.6; 
      
      // Y is Noise (Simple)
      const newNoise = Math.pow(y, 1.2) * 0.8; // Slight curve for better control
      
      const newParams = { 
          ...params, 
          displacement: newDisplacement, 
          noise: newNoise
      };
      
      setParams(newParams);
      
      // Throttle reprocess? processImage is fast-ish but let's debounce slightly
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
          reprocess(newParams);
      }, 50); // Fast response
  };
  
  const handleSpectrogramEnd = () => {
      // Commit to history on drag release
      pushHistory(params);
  };

  const handleRandomize = () => {
      const r = randomizeParams();
      // Add random seed
      const chars = 'ABCDEF1234567890';
      let seed = '';
      for(let i=0; i<6; i++) seed += chars.charAt(Math.floor(Math.random() * chars.length));
      
      const newParams = { ...r, seed };
      setParams(newParams);
      reprocess(newParams);
  };

  const handleReset = () => {
    const newParams = { 
        displacement: 0, 
        noise: 0, 
        seed: '',
        bloomThreshold: 0.5,
        bloomIntensity: 0,
        bloomRadius: 0
    };
    setParams(newParams);
    reprocess(newParams);
  };

  const getFormattedDate = () => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  };

  const handleDownload = () => {
    if (glitchedUrl) {
      // Create a temporary link to download the RGB image directly
      // UNLESS the user wants the filtered view (e.g. Grayscale Red Channel).
      // The user said "scaricare l'immagine rgb non lo spettrogramma".
      // If they are in "Red" mode, do they want the Red Channel Image?
      // Assuming "Save View" means "Save what I see in the Visualizer".
      
      // We need to target the canvas INSIDE the Visualizer. 
      // We will add an ID to the Visualizer canvas in Visualizer.tsx, 
      // but for now let's use a more specific selector if possible, 
      // or just re-create the canvas from glitchedUrl if they want raw RGB.
      
      // User request: "save view... download rgb image not spectrogram".
      // This implies the current selector might be grabbing the spectrogram.
      // Let's grab the canvas that has the 'max-w-full' class which Visualizer uses.
      
      const canvas = document.querySelector('canvas.max-w-full') as HTMLCanvasElement;
      if (canvas) {
          const a = document.createElement('a');
          a.href = canvas.toDataURL('image/png');
          a.download = `synes_output_${vizMode}_${getFormattedDate()}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
      }
    }
  };

  const handleDownloadZip = async () => {
      if (!glitchedUrl) return;
      
      const zip = new JSZip();
      const folder = zip.folder("synes_export");
      
      // We need to generate 5 images.
      // 1. Get Base Image
      const img = new Image();
      img.src = glitchedUrl;
      await new Promise(r => img.onload = r);
      
      const w = img.width;
      const h = img.height;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const originalData = ctx.getImageData(0, 0, w, h);
      
      const saveVariant = (name: string, processor?: (data: Uint8ClampedArray) => void) => {
          const c = document.createElement('canvas');
          c.width = w;
          c.height = h;
          const x = c.getContext('2d')!;
          x.putImageData(originalData, 0, 0); // Copy original
          
          if (processor) {
              const id = x.getImageData(0,0,w,h);
              processor(id.data);
              x.putImageData(id, 0, 0);
          }
          
          return new Promise<void>(resolve => {
              c.toBlob(blob => {
                  if (blob) folder?.file(`${name}.png`, blob);
                  resolve();
              });
          });
      };
      
      await Promise.all([
          saveVariant('rgb'),
          saveVariant('bw', (data) => {
              for(let i=0; i<data.length; i+=4) {
                  const avg = (data[i]+data[i+1]+data[i+2])/3;
                  data[i] = avg; data[i+1] = avg; data[i+2] = avg;
              }
          }),
          saveVariant('red', (data) => {
              for(let i=0; i<data.length; i+=4) { 
                  const val = data[i];
                  data[i]=val; data[i+1]=val; data[i+2]=val; 
              }
          }),
          saveVariant('green', (data) => {
              for(let i=0; i<data.length; i+=4) { 
                  const val = data[i+1];
                  data[i]=val; data[i+1]=val; data[i+2]=val; 
              }
          }),
          saveVariant('blue', (data) => {
              for(let i=0; i<data.length; i+=4) { 
                  const val = data[i+2];
                  data[i]=val; data[i+1]=val; data[i+2]=val; 
              }
          })
      ]);
      
      const content = await zip.generateAsync({ type: "blob" });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(content);
      a.download = `synes_bundle_${getFormattedDate()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
  };

  // Remove visible logger as requested, but keep strict layout
  return (
    <div className="min-h-screen w-full flex flex-col items-center p-4 md:p-8 max-w-6xl mx-auto font-mono text-white selection:bg-white selection:text-black">
      <header className="w-full border-b border-white pb-6 mb-8 flex justify-between items-end">
        <div>
            <h1 className="text-4xl md:text-6xl font-bold uppercase tracking-widest">SYNES</h1>
        </div>
        <div className="text-xs uppercase font-bold tracking-widest text-right">
            <span>© Mattia Capomagi</span>
        </div>
      </header>

      <main className="flex-1 w-full space-y-12">
        {/* Step 1: Input */}
        <section className="space-y-4">
             <div className="flex items-center space-x-2 text-sm uppercase font-bold">
                <span className="bg-white text-black px-2">01</span>
                <span>Signal Input</span>
             </div>
             <UploadZone onUpload={handleUpload} />
        </section>

        {/* Step 2: Processing */}
        <section className={`space-y-4 transition-opacity duration-500 ${status === 'idle' ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
             <div className="flex items-center space-x-2 text-sm uppercase font-bold">
                <span className="bg-white text-black px-2">02</span>
                <span>Spectral Analysis</span>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch font-mono">
                 <div className="md:col-span-2 flex flex-col h-[300px] md:h-full min-h-[300px] md:min-h-[450px]">
                     <div className="flex-1 border border-white bg-black relative">
                        {/* Spectrogram fills height */}
                        <Spectrogram 
                            data={spectrogramData} 
                            height={450} 
                            onInteraction={handleSpectrogramInteraction}
                            onInteractionEnd={handleSpectrogramEnd}
                        />
                        {/* Mobile Overlay Label */}
                        <div className="absolute top-2 right-2 text-[10px] md:hidden bg-black px-1 border border-white">SPECTRAL</div>
                     </div>
                 </div>
                 <div className="h-full">
                     <ControlPanel 
                        params={params}
                        onChange={handleParamsChange}
                        onTogglePlay={toggleAudio}
                        onSeek={seek}
                        isPlaying={isPlaying}
                        currentTime={currentTime}
                        duration={audioDuration}
                        onDownloadAudio={downloadWav}
                        onRandomize={handleRandomize}
                        onReset={handleReset}
                        isReady={status === 'ready'}
                        // Removed onDownloadImage
                     />
                 </div>
             </div>
        </section>
        
        {/* Step 3: Output */}
        {glitchedUrl && (
        <section className="space-y-4">
             <div className="flex items-center space-x-2 text-sm uppercase font-bold">
                <span className="bg-white text-black px-2">03</span>
                <span>Visual Reconstruction</span>
             </div>
            <div className="border border-white">
                <Visualizer 
                    glitchedUrl={glitchedUrl} 
                    mode={vizMode} 
                    onModeChange={setVizMode}
                    params={params}
                    onParamsChange={handleParamsChange}
                />
            </div>
             {/* Save Buttons - Fixed Bottom Footer */}
             {status === 'ready' && glitchedUrl && (
                 <div className="fixed bottom-0 left-0 w-full bg-black border-t border-white p-4 z-50">
                     <div className="max-w-6xl mx-auto flex space-x-4">
                         <button 
                            onClick={handleDownload}
                            className="flex-1 bg-white text-black py-3 text-sm font-bold uppercase tracking-widest hover:bg-black hover:text-white border border-white transition-colors"
                        >
                            [ SAVE VIEW ]
                        </button>
                         <button 
                            onClick={handleDownloadZip}
                            className="flex-1 bg-black text-white py-3 text-sm font-bold uppercase tracking-widest hover:bg-white hover:text-black border border-white transition-colors"
                        >
                            [ DOWNLOAD ALL (ZIP) ]
                        </button>
                     </div>
                 </div>
             )}

        </section>
        )}
        
        {/* Spacer for fixed footer */}
        <div className="h-24"></div>
      </main>
    </div>
  );
}

export default App;
