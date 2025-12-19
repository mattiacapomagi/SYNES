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
    <div className="min-h-screen pb-20">
      {/* Header */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
              <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-brick-red rounded-md shadow-plastic flex items-center justify-center">
                      <div className="w-4 h-4 bg-red-400 rounded-full opacity-50"></div>
                  </div>
                  <span className="text-xl font-black tracking-tight text-slate-800">BRICKLAB</span>
              </div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Mosaic Workshop
              </div>
          </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 pt-10 space-y-10">
          
          {/* 1. Upload Section */}
          <section className={sourceImage ? '' : 'py-20'}>
               {!sourceImage ? (
                   <div className="max-w-xl mx-auto">
                       <UploadZone onUpload={setSourceImage} />
                   </div>
               ) : (
                   <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                       <div className="md:col-span-1">
                           <button 
                                onClick={() => setSourceImage(null)}
                                className="text-xs font-bold text-slate-400 hover:text-brick-red bg-slate-50 px-3 py-2 rounded-lg transition-colors uppercase tracking-wider"
                           >
                               ← Valid New Image
                           </button>
                       </div>
                       <div className="md:col-span-3 text-right">
                           <p className="text-sm font-bold text-slate-600">Working on your masterpiece</p>
                       </div>
                   </div>
               )}
          </section>

          {/* 2. Workspace */}
          {sourceImage && (
            <div className="space-y-6 animate-fade-in-up">
                
                {/* Controls */}
                <Controls 
                    blockSize={blockSize}
                    setBlockSize={setBlockSize}
                    onDownload={handleDownload}
                />

                {/* Canvas Engine */}
                <BlockifyEngine 
                    image={sourceImage}
                    blockSize={blockSize}
                />
            </div>
          )}

      </main>
    </div>
  )
}

export default App
