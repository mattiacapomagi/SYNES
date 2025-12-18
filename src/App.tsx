import { useState, useRef } from 'react';
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
    chop: 0,
    noise: 0,
    crush: 0,
    seed: ''
  });

  // Debounce ref
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleUpload = (file: File) => {
    setParams({ displacement: 0, chop: 0, noise: 0, crush: 0, seed: '' }); // Reset params
    processImage(file);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleParamsChange = (key: any, value: any) => {
    const newParams = { ...params, [key]: value };
    setParams(newParams);
    
    // Debounce re-process
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      reprocess(newParams);
    }, 150);
  };

  const handleRandomize = () => {
      const r = randomizeParams();
      // Add random seed
      const chars = 'ABCDEF1234567890';
      let seed = '';
      for(let i=0; i<6; i++) seed += chars.charAt(Math.floor(Math.random() * chars.length));
      
      // @ts-expect-error seed type mix
      const newParams = { ...r, seed };
      setParams(newParams);
      reprocess(newParams);
  };

  const handleReset = () => {
    const newParams = { displacement: 0, chop: 0, noise: 0, crush: 0, seed: '' };
    setParams(newParams);
    reprocess(newParams);
  };

  const handleDownload = () => {
    // Current view download
    if (glitchedUrl) {
      // Find the canvas in Visualizer (hacky but effective for now, or assume glitchedUrl is the base)
      // Visualizer now draws to its own canvas with filters.
      // We should grab the canvas from the DOM or use the blob? 
      // Actually, Visualizer modifies the view. The engine output (glitchedUrl) is always RGB.
      // To save "What I See", we might need to apply the filter logic to a temp canvas.
      
      const canvas = document.querySelector('canvas.w-full') as HTMLCanvasElement; // Select visualizer canvas
      if (canvas) {
          const a = document.createElement('a');
          a.href = canvas.toDataURL('image/png');
          a.download = `synes_output_${vizMode}_${Date.now()}.png`;
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
              for(let i=0; i<data.length; i+=4) { data[i+1]=0; data[i+2]=0; }
          }),
          saveVariant('green', (data) => {
             for(let i=0; i<data.length; i+=4) { data[i]=0; data[i+2]=0; }
          }),
          saveVariant('blue', (data) => {
             for(let i=0; i<data.length; i+=4) { data[i]=0; data[i+1]=0; }
          })
      ]);
      
      const content = await zip.generateAsync({ type: "blob" });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(content);
      a.download = `synes_bundle_${Date.now()}.zip`;
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
                        <Spectrogram data={spectrogramData} height={450} />
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
        <section className={`space-y-4 transition-opacity duration-500 ${(!glitchedUrl) ? 'opacity-50' : 'opacity-100'}`}>
             <div className="flex items-center space-x-2 text-sm uppercase font-bold">
                <span className="bg-white text-black px-2">03</span>
                <span>Visual Reconstruction</span>
             </div>
            <div className="h-[60vh] border border-white">
                <Visualizer 
                    glitchedUrl={glitchedUrl} 
                    mode={vizMode} 
                    onModeChange={setVizMode}
                />
            </div>
             {/* Save Buttons */}
             {status === 'ready' && (
                 <div className="flex space-x-4">
                     <button 
                        onClick={handleDownload}
                        className="flex-1 bg-white text-black py-3 text-sm font-bold uppercase tracking-widest hover:bg-black hover:text-white border border-white transition-colors"
                    >
                        [ SAVE VIEW ]
                    </button>
                     <button 
                        onClick={handleDownloadZip}
                        className="flex-1 bg-black text-white py-3 text-sm font-bold uppercase tracking-widest hover:bg-white hover:text-black border border-white transition-colors animate-pulse"
                    >
                        [ DOWNLOAD ALL (ZIP) ]
                    </button>
                 </div>
             )}
        </section>
      </main>
    </div>
  );
}

export default App;
