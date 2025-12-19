import { useState } from 'react';
import { UploadZone } from './components/UploadZone';
import { BlockifyEngine } from './components/BlockifyEngine';
import { Controls } from './components/Controls';
import './index.css';

function App() {
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null);
  const [blockSize, setBlockSize] = useState<number>(20);

  const handleDownload = () => {
    // Find canvas in BlockifyEngine
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    if (canvas) {
        const link = document.createElement('a');
        link.download = `bricklab-mosaic-${Date.now()}.png`;
        link.href = canvas.toDataURL();
        link.click();
    }
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
      <main className="max-w-6xl mx-auto px-6 pt-12 space-y-12">
          
          {/* 1. Upload Section */}
          <section className={sourceImage ? '' : 'py-20'}>
               {!sourceImage ? (
                   <div className="max-w-xl mx-auto">
                       <UploadZone onUpload={setSourceImage} />
                   </div>
               ) : (
                   <div className="flex items-center justify-between bg-black p-4 border-[3px] border-black text-white">
                       <button 
                            onClick={() => setSourceImage(null)}
                            className="text-xs font-bold hover:text-industrial-accent border-b border-white hover:border-industrial-accent transition-colors uppercase tracking-widest"
                       >
                           ← RESET SOURCE
                       </button>
                   </div>
               )}
          </section>

          {/* 2. Workspace */}
          {sourceImage && (
            <div className="space-y-8 animate-fade-in-up">
                
                {/* Canvas Engine */}
                <div className="border-[3px] border-black bg-white shadow-brutal p-2">
                    <BlockifyEngine 
                        image={sourceImage}
                        blockSize={blockSize}
                    />
                </div>

                {/* Controls */}
                <Controls 
                    blockSize={blockSize}
                    setBlockSize={setBlockSize}
                    onDownload={handleDownload}
                />
            </div>
          )}

      </main>
      
      {/* Brutalist Footer */}
      <footer className="fixed bottom-4 right-6 text-[10px] font-bold uppercase opacity-30 mix-blend-exclusion pointer-events-none">
         CAPOMAGI IND 2025
      </footer>
    </div>
  )
}

export default App
