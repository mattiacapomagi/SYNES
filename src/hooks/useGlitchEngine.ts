import { useState, useCallback, useRef, useEffect } from 'react';
import { logger } from '../utils/logger';
import heic2any from 'heic2any';

export interface GlitchParams {
  displacement: number; 
  noise: number; 
  seed: string;
  // Optics
  bloomThreshold: number; // 0..1
  bloomIntensity: number; // 0..2
  bloomRadius: number; // 0..1
}

// PRNG: Simple Mulberry32 (fast, deterministic)
const createPRNG = (seedStr: string) => {
    // Hash the string to get a seed number
    let s = 123456789; // constant seed base
    for (let i = 0; i < seedStr.length; i++) {
        s = (Math.imul(31, s) + seedStr.charCodeAt(i)) | 0;
    }
    
    return () => {
        let t = s += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

// Seeded Hash Function for Blocks (Deterministic Chaos)
const hashBlock = (blockIndex: number, seed: number) => {
    let t = (blockIndex + seed) * 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const encodeWAV = (samples: Float32Array, sampleRate: number) => {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, samples.length * 2, true);

    const floatTo16BitPCM = (output: DataView, offset: number, input: Float32Array) => {
        for (let i = 0; i < input.length; i++, offset += 2) {
            const s = Math.max(-1, Math.min(1, input[i]));
            output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }
    };

    floatTo16BitPCM(view, 44, samples);
    return view;
};

export const useGlitchEngine = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [audioContext] = useState(() => new (window.AudioContext || (window as any).webkitAudioContext)());
  const [status, setStatus] = useState<'idle' | 'processing' | 'ready' | 'error'>('idle');
  const [glitchedUrl, setGlitchedUrl] = useState<string | null>(null);
  const [spectrogramData, setSpectrogramData] = useState<Uint8Array | null>(null);
  
  // Audio State
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  
  const originalParamsRef = useRef<{ width: number, height: number, data: Uint8ClampedArray } | null>(null);
  const processedDataRef = useRef<Uint8ClampedArray | null>(null); 
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Audio Refs
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const playbackStartTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);
  
  // Volatile seed logic removed as it was for randomErrors
  // Keeping refs just in case we need them for other persistent effects, but for now cleanup.

  const getCanvas = useCallback(() => {
    if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
    }
    return canvasRef.current;
  }, []);

  // --- AUDIO GENERATION HELPER ---
  const generateAudioBuffer = useCallback((pixels: Uint8ClampedArray) => {
      // Create mono buffer from pixels
      const totalSamples = (pixels.length / 4) * 3; 
      const buffer = audioContext.createBuffer(1, totalSamples, audioContext.sampleRate);
      const data = buffer.getChannelData(0);
      
      let sIdx = 0;
      let lastVal = 0;
      // Smoothing factor: 0.0 = no smoothing, 0.9 = heavy smoothing
      // We want distinct glitch sound but less harsh.
      const smoothFactor = 0.5; 

      for(let i=0; i<pixels.length; i+=4) {
          // R
          let raw = (pixels[i] / 128.0) - 1.0;
          let val = lastVal * smoothFactor + raw * (1 - smoothFactor);
          data[sIdx++] = val; lastVal = val;

          // G
          raw = (pixels[i+1] / 128.0) - 1.0;
          val = lastVal * smoothFactor + raw * (1 - smoothFactor);
          data[sIdx++] = val; lastVal = val;

          // B
          raw = (pixels[i+2] / 128.0) - 1.0;
          val = lastVal * smoothFactor + raw * (1 - smoothFactor);
          data[sIdx++] = val; lastVal = val;
      }
      return buffer;
  }, [audioContext]);

  // --- PLAYBACK ---
  const playFrom = useCallback((startTimeOffset: number, data: Uint8ClampedArray) => {
      if (audioSourceRef.current) {
          try { audioSourceRef.current.stop(); } catch { /**/ }
      }

      const buffer = generateAudioBuffer(data);
      setAudioDuration(buffer.duration);

      const src = audioContext.createBufferSource();
      src.buffer = buffer;
      src.loop = true; 
      
      // Sweetener: Resonant Lowpass for "Harmonic Wind"
      const filter = audioContext.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400; // Deep drone base
      filter.Q.value = 15; // High resonance -> Singing tone

      const gain = audioContext.createGain();
      gain.gain.value = 0; // Start silent to de-click
      gain.gain.linearRampToValueAtTime(0.8, audioContext.currentTime + 0.05); // Super fast fade (50ms)

      src.connect(filter);
      filter.connect(gain);
      gain.connect(audioContext.destination);

      // SAFEGUARD: Ensure offset is within buffer duration
      const safeOffset = (startTimeOffset % buffer.duration);
      
      src.start(0, safeOffset);
      
      audioSourceRef.current = src;
      // Adjust start time so 'currentTime' matches the offset
      playbackStartTimeRef.current = audioContext.currentTime - safeOffset;
      setIsPlaying(true);

  }, [audioContext, generateAudioBuffer]);

  const toggleAudio = useCallback(() => {
     if (!processedDataRef.current) return;

     if (isPlaying) {
         // Pause
         if (audioSourceRef.current) {
             try { audioSourceRef.current.stop(); } catch { /**/ }
             audioSourceRef.current = null;
         }
         // Save position
         const elapsed = audioContext.currentTime - playbackStartTimeRef.current;
         pausedAtRef.current = elapsed;
         setIsPlaying(false);
         logger.log('Paused.', 'info');
     } else {
         // Play
         playFrom(pausedAtRef.current, processedDataRef.current);
         logger.log('Playing...', 'info');
     }
  }, [audioContext, isPlaying, playFrom]);

  const seek = useCallback((time: number) => {
      if (!processedDataRef.current) return;
      pausedAtRef.current = time;
      if (isPlaying) {
          playFrom(time, processedDataRef.current);
      } else {
          setCurrentTime(time); // Just update UI
      }
  }, [isPlaying, playFrom]);

  // --- OPTICS PIPELINE (Canvas 2D) ---
  const applyOptics = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, params: GlitchParams) => {
      if (params.bloomIntensity <= 0) return;

      // 1. Create Offscreen Canvas for Bloom Pass
      // Downscale for performance and soft glow
      const scale = 0.5;
      const bW = Math.floor(width * scale);
      const bH = Math.floor(height * scale);
      
      const offCanvas = document.createElement('canvas');
      offCanvas.width = bW;
      offCanvas.height = bH;
      const offCtx = offCanvas.getContext('2d')!;
      
      // 2. Draw current state to offscreen
      offCtx.drawImage(ctx.canvas, 0, 0, bW, bH);
      
      // 3. Threshold Pass (High-Pass Filter)
      const imageData = offCtx.getImageData(0, 0, bW, bH);
      const data = imageData.data;
      const threshold = params.bloomThreshold * 255;
      
      for (let i = 0; i < data.length; i += 4) {
          // Luma
          const r = data[i];
          const g = data[i+1];
          const b = data[i+2];
          const luma = 0.299 * r + 0.587 * g + 0.114 * b;
          
          if (luma < threshold) {
              // Mask out darks
              data[i] = 0;
              data[i+1] = 0;
              data[i+2] = 0;
              // Keep alpha? 
              // data[i+3] = 255; 
          } else {
              // Tint Halation (Red Shift)
              // Boost Red, slightly reduce Blue
              data[i] = Math.min(255, r * 1.2); 
              data[i+1] = g * 0.9;
              data[i+2] = b * 0.8;
          }
      }
      offCtx.putImageData(imageData, 0, 0);
      
      // 4. Blur Pass
      // Using context filter is faster than JS loop
      const blurRadius = params.bloomRadius * 40; // Max 40px blur
      offCtx.filter = `blur(${blurRadius}px)`;
      // We need to draw the image onto itself to apply the filter? 
      // Context filter applies to drawing operations. It doesn't filter existing pixels instantly.
      // So we must draw the thresholded content again.
      // Wait, we just did putImageData (which ignores filter?).
      // Trick: Put the imageData into a temp 2nd canvas.
      
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = bW;
      tempCanvas.height = bH;
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCtx.putImageData(imageData, 0, 0);
      
      offCtx.clearRect(0, 0, bW, bH);
      offCtx.drawImage(tempCanvas, 0, 0); // Draws the high-pass
      
      // 5. Composite Pass (Bloom -> Main)
      ctx.globalCompositeOperation = 'screen'; // or 'lighter'
      ctx.globalAlpha = params.bloomIntensity;
      
      // Draw the blurred bloom on top
      // Need to scale back up
      ctx.drawImage(offCanvas, 0, 0, width, height);
      
      // RESET
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1.0;
      
  }, []);

  // --- CORE EFFECTS ---
  const applyEffects = useCallback((imageDataObj: { width: number, height: number, data: Uint8ClampedArray }, params: GlitchParams) => {
    const { width, height, data } = imageDataObj;
    const outputData = new Uint8ClampedArray(data.length); // Use copy
    const fftSize = 1024;
    const vizBuffer = new Uint8Array(fftSize);

    // INIT PRNG
    const random = params.seed ? createPRNG(params.seed) : Math.random;

    // Helper to get a stable integer seed from string for hashing
    let seedInt = 12345;
    if (params.seed) {
        for(let c=0; c<params.seed.length; c++) seedInt += params.seed.charCodeAt(c);
    }
    
    
    // VOLATILE SEED removed
    // const volatileSeed = errorSeedRef.current;

    // 1. TUNE DISPLACEMENT: Power of 4.
    const displacementForce = Math.pow(params.displacement, 4); 
    const maxOffset = Math.floor(displacementForce * width * 0.4); // Increased max offset for more chaos
    
    // Y-Shift: Also reduce
    const maxYShift = Math.floor(displacementForce * height * 0.2);

    // REFACTORED LOOP: Gather Approach (Destination-Driven)
    // Ensures every pixel is filled (no holes) and noise applies cleanly on top.
    
    for (let i = 0; i < data.length; i += 4) {

        const x = (i / 4) % width;
        const y = Math.floor((i / 4) / width);

        // 1. DISPLACEMENT (Source Coordinate Calculation)
        let srcX = x;
        let srcY = y;

        if (displacementForce > 0) {
            const block = Math.floor(i / (width * 4)); 
            
            // CHAOTIC DISPLACEMENT
            // Instead of predictable sine waves, we use a seeded hash per block to determine shift.
            // This creates "random chunks" of displacement.
            
            // Generate two pseudo-random numbers deterministic to the Seed + Block Line
            const rndX = hashBlock(block, seedInt + 111);
            const rndY = hashBlock(block, seedInt + 999);
            
            // Map 0..1 to -1..1 or similar range
            // We want it to be centered? Or just positive shift? Glitch usually shifts right.
            // Let's allow bidirectional shift for chaos.
            const shiftX = Math.floor((rndX * 2 - 1) * maxOffset);
            const shiftY = Math.floor((rndY * 2 - 1) * maxYShift);
            
            srcX = x + shiftX;
            srcY = y + shiftY;

            // Wrap logic for source coordinates
            if (srcX >= width) srcX %= width;
            if (srcX < 0) srcX = width + (srcX % width);
            if (srcY >= height) srcY %= height;
            if (srcY < 0) srcY = height + (srcY % width); // Wrap Y
        }
        
        // Calculate Source Index
        let srcIndex = (Math.floor(srcY) * width + Math.floor(srcX)) * 4;
        
        // Safety wrap
        if (srcIndex >= data.length) srcIndex %= data.length;
        if (srcIndex < 0) srcIndex = 0; // Should not happen with math above but safe guard

        // READ PIXEL
        let rVal = data[srcIndex];
        let gVal = data[srcIndex+1];
        let bVal = data[srcIndex+2];

        // 2. NOISE (Monochromatic Grain)
        const noiseIntensity = params.noise;
        if (noiseIntensity > 0) {
            // Fine-grained mono noise
            const grain = (random() - 0.5) * 255 * noiseIntensity;
            
            rVal = Math.min(255, Math.max(0, rVal + grain));
            gVal = Math.min(255, Math.max(0, gVal + grain));
            bVal = Math.min(255, Math.max(0, bVal + grain));
        }

        // 3. RANDOM ERRORS (REMOVED)
        // Code block for random strips removed as requested.

        // 4. BLOOM / HALATION (Highlight Bleed) - Removed legacy code
        // Optics pipeline handles this separately via applyOptics

        // WRITE PIXEL
        outputData[i] = rVal;
        outputData[i+1] = gVal;
        outputData[i+2] = bVal;
        outputData[i+3] = 255;  

        if (i / 4 < fftSize) vizBuffer[i/4] = outputData[i];
    }

    processedDataRef.current = outputData;
    setSpectrogramData(vizBuffer);

    const canvas = getCanvas();
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    const newImageData = new ImageData(outputData, width, height);
    ctx.putImageData(newImageData, 0, 0);
    
    // --- OPTICS PASS ---
    applyOptics(ctx, width, height, params);

    canvas.toBlob((blob) => {
        if (!blob) return;
        setGlitchedUrl(prev => {
            if (prev) URL.revokeObjectURL(prev);
            return URL.createObjectURL(blob);
        });
    }, 'image/png');
    
    // HOT SWAP AUDIO IF PLAYING
    if (audioSourceRef.current) { 
        const elapsed = audioContext.currentTime - playbackStartTimeRef.current;
        playFrom(elapsed, outputData);
    }

  }, [getCanvas, audioContext, playFrom]);

  const processImage = useCallback(async (file: File) => {
    // Reset Audio State
    if (audioSourceRef.current) {
        try { audioSourceRef.current.stop(); } catch { /**/ }
        audioSourceRef.current = null;
    }
    setIsPlaying(false);
    setCurrentTime(0);
    pausedAtRef.current = 0;

    setStatus('processing');
    try {
        let blob = file as Blob;

        // HEIC Support
        if (file.type === 'image/heic' || file.type === 'image/heif') {
            logger.log('Converting HEIC...', 'info');
            const converted = await heic2any({ 
                blob: file,
                toType: 'image/jpeg',
                quality: 0.8
            });
            // Handle array or blob
            blob = Array.isArray(converted) ? converted[0] : converted;
            logger.log('HEIC Converted.', 'success');
        }

        const img = new Image();
        img.onload = () => {
            const canvas = getCanvas();
            let w = img.width;
            let h = img.height;
            const max = 2000;
            if (w > max || h > max) {
                if (w > h) { h = (h/w)*max; w = max; }
                else { w = (w/h)*max; h = max; }
            }
            
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0, w, h);
            const imageData = ctx.getImageData(0, 0, w, h);
            
            originalParamsRef.current = { width: w, height: h, data: imageData.data };
            
            // Calculate initial audio duration
            const duration = ((w * h * 3) / audioContext.sampleRate);
            setAudioDuration(duration);

            logger.log(`Initialized. Duration: ${duration.toFixed(2)}s`, 'success');
            applyEffects(originalParamsRef.current, { 
                displacement: 0, 
                noise: 0, 
                seed: '',
                bloomThreshold: 0.5,
                bloomIntensity: 0,
                bloomRadius: 0
            });
            setStatus('ready');
        };
        img.onerror = () => {
             logger.log('Error: Failed to load image. If HEIC/TIFF, try Safari.', 'error');
             setStatus('error');
        };
        img.src = URL.createObjectURL(blob);
    } catch (e) {
      logger.log(`Error: ${e}`, 'error');
      setStatus('error');
    }
  }, [applyEffects, getCanvas, audioContext]);

  const reprocess = useCallback((params: GlitchParams) => {
      if (originalParamsRef.current) {
          applyEffects(originalParamsRef.current, params);
      }
  }, [applyEffects]);
  
  const randomizeParams = useCallback((): Partial<GlitchParams> => {
      // Bloom parameters are excluded from randomization as requested
      return {
          displacement: Math.random() * 0.4,
          noise: Math.random() * 0.4, 
          seed: '' 
      };
  }, []);
  
  const downloadWav = useCallback(() => {
      if (!processedDataRef.current) return;
      const buffer = generateAudioBuffer(processedDataRef.current);
      const wav = encodeWAV(buffer.getChannelData(0), audioContext.sampleRate);
      const blob = new Blob([wav], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `synes_audio_${Date.now()}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  }, [generateAudioBuffer, audioContext]);

  // Timer loop
  useEffect(() => {
      let raf: number;
      const loop = () => {
          if (isPlaying) {
              const elapsed = audioContext.currentTime - playbackStartTimeRef.current;
              setCurrentTime(elapsed % audioDuration); // Modulo for loop
              raf = requestAnimationFrame(loop);
          }
      };
      if (isPlaying) loop();
      return () => cancelAnimationFrame(raf);
  }, [isPlaying, audioContext, audioDuration]);

  return {
    processImage,
    reprocess,
    toggleAudio,
    seek,
    downloadWav,
    isPlaying,
    currentTime,
    audioDuration,
    randomizeParams,
    glitchedUrl,
    spectrogramData,
    status
  };
};
