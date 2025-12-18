import { useState, useCallback, useRef, useEffect } from 'react';
import { logger } from '../utils/logger';

export interface GlitchParams {
  displacement: number; 
  noise: number; 
  crush: number;
  chop: number;
  seed: string; // New seed param
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
      for(let i=0; i<pixels.length; i+=4) {
          data[sIdx++] = (pixels[i] / 128.0) - 1.0;   // R
          data[sIdx++] = (pixels[i+1] / 128.0) - 1.0; // G
          data[sIdx++] = (pixels[i+2] / 128.0) - 1.0; // B
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
      gain.gain.linearRampToValueAtTime(0.8, audioContext.currentTime + 0.5); // Fade in

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

  // --- CORE EFFECTS ---
  const applyEffects = useCallback((imageDataObj: { width: number, height: number, data: Uint8ClampedArray }, params: GlitchParams) => {
    const { width, height, data } = imageDataObj;
    const outputData = new Uint8ClampedArray(data.length); // Use copy
    const fftSize = 1024;
    const vizBuffer = new Uint8Array(fftSize);

    // INIT PRNG
    const random = params.seed ? createPRNG(params.seed) : Math.random;

    // 1. TUNE DISPLACEMENT: Power of 4.
    const displacementForce = Math.pow(params.displacement, 4); 
    const maxOffset = Math.floor(displacementForce * width * 0.2); 
    
    // Y-Shift: Also reduce
    const maxYShift = Math.floor(displacementForce * height * 0.1);

    let inChop = false;
    let chopStartReadIndex = 0;
    let chopCounter = 0;
    let chopDuration = 0;
    
    // TUNE CHOP: Power of 3
    const chopProb = Math.pow(params.chop, 3) * 0.01; // Much lower probability at start

    for (let i = 0; i < data.length; i += 4) {
        let readIndex = i;

        if (params.chop > 0) {
            if (inChop) {
                readIndex = chopStartReadIndex + (i % chopDuration); 
                chopCounter++;
                if (chopCounter >= chopDuration) inChop = false;
            } else {
                if (random() < chopProb) { 
                    inChop = true;
                    chopCounter = 0;
                    chopDuration = Math.floor(width * 4 * (0.2 + random() * 2)); 
                    chopStartReadIndex = Math.floor(random() * (data.length - chopDuration));
                    chopStartReadIndex -= chopStartReadIndex % 4;
                    readIndex = chopStartReadIndex;
                }
            }
        }

        if (displacementForce > 0 && !inChop) { 
             const block = Math.floor(i / (width * 4)); 
             // Use seeded random for purely chaotic displacement (No waves/patterns)
             // We use 'block' as part of the random seed state or just call random() typically?
             // Since 'random' is our LCG/PRNG stateful function, just calling it provides sequence.
             // To avoid "static" look per block if we just called it once per block, we need to call it per block?
             // But we are in a pixel loop.
             
             // Optimization: We should really compute shift maps per row/block outside the loop?
             // For now, let's keep it simple. But to avoid "noise" look (jitter per pixel), we need coherence.
             // The previous code had `block` calc. If we want per-line random:
             // We can hash the block index to get a deterministic random for that block.
             
             // Simple "Jittery" Displacement (No Waves)
             // We'll effectively just use random values, but consistent for a small run to avoid white noise.
             // The previous code used Sine to get coherence.
             // We can use a simplified "hash" of the block index to determine shift.
             const r1 = ((block * 9301 + 49297) % 233280) / 233280.0;
             const r2 = ((block * 49297 + 9301) % 233280) / 233280.0;
             
             // Mix with our PRNG random for frame-to-frame variation if input seed changes?
             // Actually 'random()' is frame-constant if seed is constant.
             // But wait, 'random()' advances state. If we call it per pixel, it's noise.
             // If we call it per block, we need state management.
             // To ensure "Random" but "Blocky" (glitchy):
             
             // Let's just use the PRNG we have but scale it such that it doesn't change every pixel?
             // No, standard `random()` advances state.
             
             // Let's stick to the previous loop structure but replace sin/cos with a pseudo-random hash of the row `y`.
             const y = Math.floor((i / 4) / width);
             // Create a deterministic random value for this ROW 'y' based on the 'seed' string + y.
             // But we can't easily re-seed per row efficiently here without perf hit.
             
             // Alternative: Pre-calculate shifts array at start of applyEffects?
             // YES. That is the correct way. But let's stay inline for minimal refactor if possible.
             // Actually, `Math.sin(block * 0.1)` gives a wave.
             // `Math.sin(block * 123.456)` gives pseudo-randomness because high frequency aliases.
             
             const shiftX = Math.floor((Math.sin(block * 132.42 + params.noise * 100) * 43758.5453) % 1 * maxOffset);
             const shiftY = Math.floor((Math.cos(block * 42.12 + params.noise * 100) * 12.345) % 1 * maxYShift) * width;
             
             readIndex += (shiftX * 4) + (shiftY * 4); 
        }

        while (readIndex >= data.length) readIndex -= data.length;
        while (readIndex < 0) readIndex += data.length;

        // NOISE (Seeded Random)
        const noiseIntensity = params.noise;
        if (noiseIntensity > 0) {
            const r = random(); // Use seeded random
            
            // 1. Bitwise Corruption (Artifacts)
            if (r < (noiseIntensity * 0.1)) {
                 const corruptor = Math.floor(random() * 255 * noiseIntensity);
                 for (let c = 0; c < 3; c++) {
                    outputData[readIndex + c] = outputData[readIndex + c] ^ corruptor;
                 }
            }
            // 2. Signal Dropout (Dead Pixels)
            else if (r < (noiseIntensity * 0.05)) {
                 outputData[readIndex] = 0;
                 outputData[readIndex+1] = 0;
                 outputData[readIndex+2] = 0;
            }
            // 3. Color Channel Drift
            else if (r < noiseIntensity) {
                 const drift = (random() - 0.5) * noiseIntensity * 50;
                 for (let c = 0; c < 3; c++) {
                    let val = outputData[readIndex + c] + drift;
                    if (val > 255) val = 255;
                    if (val < 0) val = 0;
                    outputData[readIndex + c] = val;
                 }
            } else {
                // Pass through clean pixel 
                for (let c = 0; c < 3; c++) {
                    outputData[readIndex + c] = data[readIndex + c];
                }
            }
        } else {
             // Copy clean if no noise
             for (let c = 0; c < 3; c++) {
                 outputData[i + c] = data[readIndex + c];
             }
        }

        // HALFTONE / DITHERING (Replaces Crush)
        // Simple monochrome halftone pattern mixed with original color
        let crushVal = params.crush;
        if (crushVal > 0) {
            const x = (i / 4) % width;
            const y = Math.floor((i / 4) / width);
            
            // Halftone Pattern: sin(x) * cos(y)
            const dotSize = 4 + (1-crushVal) * 4; // Zoom based on intensity
            const pattern = (Math.sin(x/dotSize) * Math.cos(y/dotSize)) * 128 + 128;
            
            // Calculate luminance
            const lum = (outputData[i] * 0.299 + outputData[i+1] * 0.587 + outputData[i+2] * 0.114);
            
            // Threshold
            const threshold = pattern;
            const isDark = lum < threshold;
            
            // Apply halftone effect
            // COLOR HALFTONE: If Dark -> Black. If Light -> Original Color.
            // This preserves the color in the "dots" (or rather the empty space).
            
            for (let c = 0; c < 3; c++) {
                const original = outputData[i+c];
                const halftoned = isDark ? 0 : original; // 0 = Black dot, Original = Color
                
                // Mix based on crushVal (Intensity)
                outputData[i + c] = (original * (1-crushVal)) + (halftoned * crushVal);
            }
        }
        
        outputData[i + 3] = 255; 

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
            applyEffects(originalParamsRef.current, { displacement: 0, noise: 0, crush: 0, chop: 0, seed: '' });
            setStatus('ready');
        };
        img.onerror = () => {
             logger.log('Error: Failed to load image. If HEIC/TIFF, try Safari.', 'error');
             setStatus('error');
        };
        img.src = URL.createObjectURL(file);
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
  
  const randomizeParams = useCallback((): GlitchParams => {
      return {
          displacement: Math.random() * 0.4,
          noise: Math.random() * 0.4, 
          crush: Math.random() < 0.5 ? 0 : Math.random(), 
          chop: Math.random() * 0.5,
          seed: '' // Default seed empty for randomizer, or generate random string here?
                   // Actually handleRandomize in App sets the seed. 
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
