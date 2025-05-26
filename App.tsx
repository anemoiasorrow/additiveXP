
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Harmonic, AudioSettings } from './types';
import HarmonicTogglesList, { AddHarmonicData } from './components/HarmonicTogglesList';
import AmplitudeGraph from './components/AmplitudeGraph';
import GlobalControls from './components/GlobalControls';
import { synthesizeSound, exportWav } from './services/audioService';

const MAX_POTENTIAL_HARMONICS = 32;
const RAMP_TIME = 0.01; // 10ms ramp for smooth audio changes
const ACTIVATION_THRESHOLD = 0.005; // Min amplitude to activate a harmonic by dragging

const App: React.FC = () => {
  const [activeHarmonics, setActiveHarmonics] = useState<Harmonic[]>([
    // Initialize H1 as active with amplitude 1.00
    { id: 1, amplitude: 1.00, isLocked: false, isMuted: false, isSoloed: false }
  ]);
  const [audioSettings, setAudioSettings] = useState<AudioSettings>({
    fundamentalFrequency: 220,
    duration: 2,
    masterVolume: 0.75,
  });
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorNodesRef = useRef<Map<number, OscillatorNode>>(new Map());
  const gainNodesRef = useRef<Map<number, GainNode>>(new Map());
  const masterGainNodeRef = useRef<GainNode | null>(null);

  useEffect(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      masterGainNodeRef.current = audioContextRef.current.createGain();
      masterGainNodeRef.current.gain.setValueAtTime(audioSettings.masterVolume, audioContextRef.current.currentTime);
      masterGainNodeRef.current.connect(audioContextRef.current.destination);
    }
    return () => {
      if (isPlaying) {
        gainNodesRef.current.forEach((gainNode) => {
             if(audioContextRef.current) {
                gainNode.gain.cancelScheduledValues(audioContextRef.current.currentTime);
                gainNode.gain.linearRampToValueAtTime(0, audioContextRef.current.currentTime + RAMP_TIME);
             }
        });
        setTimeout(() => {
             oscillatorNodesRef.current.forEach(osc => osc.stop());
             oscillatorNodesRef.current.clear();
             gainNodesRef.current.forEach(gain => gain.disconnect());
             gainNodesRef.current.clear();
        }, RAMP_TIME * 1000 + 100);
      }
      audioContextRef.current?.close().catch(console.error);
    };
  }, []);

  const createOrUpdateHarmonicNode = useCallback((harmonic: Harmonic, ctx: AudioContext, masterGain: GainNode) => {
    const { id, amplitude, isMuted, isSoloed } = harmonic;
    const currentActiveHarmonics = activeHarmonics; 
    const hasSoloActive = currentActiveHarmonics.some(h => h.amplitude > 0 && h.isSoloed && !h.isMuted);
    
    let targetGainValue = amplitude;

    if (isMuted) {
      targetGainValue = 0;
    } else if (hasSoloActive && !isSoloed) {
      targetGainValue = 0;
    }

    let gainNode = gainNodesRef.current.get(id);
    if (!gainNode) {
      gainNode = ctx.createGain();
      gainNodesRef.current.set(id, gainNode);
      gainNode.connect(masterGain);
      
      const oscillatorNode = ctx.createOscillator();
      oscillatorNode.type = 'sine';
      oscillatorNode.frequency.setValueAtTime(audioSettings.fundamentalFrequency * id, ctx.currentTime);
      oscillatorNode.connect(gainNode);
      oscillatorNode.start();
      oscillatorNodesRef.current.set(id, oscillatorNode);
    }
    
    gainNode.gain.cancelScheduledValues(ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(targetGainValue, ctx.currentTime + RAMP_TIME);

  }, [audioSettings.fundamentalFrequency, activeHarmonics]);

  const removeHarmonicNode = useCallback((harmonicId: number, ctx: AudioContext) => {
    const gainNode = gainNodesRef.current.get(harmonicId);
    if (gainNode) {
      gainNode.gain.cancelScheduledValues(ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + RAMP_TIME);
      setTimeout(() => { 
        gainNode.disconnect();
        gainNodesRef.current.delete(harmonicId);
        const oscillatorNode = oscillatorNodesRef.current.get(harmonicId);
        if (oscillatorNode) {
          oscillatorNode.stop();
          oscillatorNode.disconnect();
          oscillatorNodesRef.current.delete(harmonicId);
        }
      }, RAMP_TIME * 1000 + 50); 
    }
  }, []);

  const startSoundEngine = useCallback(() => {
    if (!audioContextRef.current || !masterGainNodeRef.current || activeHarmonics.length === 0) {
        setIsPlaying(false);
        return;
    }
    const ctx = audioContextRef.current;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(err => console.error("Error resuming AudioContext:", err));
    }
    
    masterGainNodeRef.current.gain.cancelScheduledValues(ctx.currentTime);
    masterGainNodeRef.current.gain.linearRampToValueAtTime(audioSettings.masterVolume, ctx.currentTime + RAMP_TIME);

    activeHarmonics.forEach(h => {
      createOrUpdateHarmonicNode(h, ctx, masterGainNodeRef.current!);
    });
    setIsPlaying(true);
  }, [activeHarmonics, audioSettings.masterVolume, createOrUpdateHarmonicNode]);

  const stopSoundEngine = useCallback(() => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    gainNodesRef.current.forEach(gainNode => {
      gainNode.gain.cancelScheduledValues(ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + RAMP_TIME);
    });
    setIsPlaying(false);
  }, []);
  
 useEffect(() => {
    if (isPlaying && activeHarmonics.length > 0) {
      startSoundEngine();
    } else if (!isPlaying || activeHarmonics.length === 0) {
      stopSoundEngine();
    }
  }, [isPlaying, startSoundEngine, stopSoundEngine, activeHarmonics.length]);


   useEffect(() => {
    if (!audioContextRef.current || !masterGainNodeRef.current) return;
    const ctx = audioContextRef.current;
    const masterGain = masterGainNodeRef.current;
    
    const currentActiveIdsInState = new Set(activeHarmonics.map(h => h.id));
    
    activeHarmonics.forEach(h => {
        if (isPlaying) { 
            createOrUpdateHarmonicNode(h, ctx, masterGain);
        } else { 
            const gainNode = gainNodesRef.current.get(h.id);
            if (gainNode) {
                gainNode.gain.cancelScheduledValues(ctx.currentTime);
                gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + RAMP_TIME);
            }
        }
    });

    gainNodesRef.current.forEach((_, id) => {
      if (!currentActiveIdsInState.has(id)) {
        removeHarmonicNode(id, ctx);
      }
    });
  }, [activeHarmonics, isPlaying, createOrUpdateHarmonicNode, removeHarmonicNode]);

  useEffect(() => {
    if (audioContextRef.current) {
      const ctx = audioContextRef.current;
      oscillatorNodesRef.current.forEach((osc, id) => {
        osc.frequency.cancelScheduledValues(ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(audioSettings.fundamentalFrequency * id, ctx.currentTime + RAMP_TIME);
      });
    }
  }, [audioSettings.fundamentalFrequency]);

  useEffect(() => {
    if (audioContextRef.current && masterGainNodeRef.current) {
      masterGainNodeRef.current.gain.cancelScheduledValues(audioContextRef.current.currentTime);
      masterGainNodeRef.current.gain.linearRampToValueAtTime(audioSettings.masterVolume, audioContextRef.current.currentTime + RAMP_TIME);
    }
  }, [audioSettings.masterVolume]);

  const handlePlay = useCallback(() => {
    if (activeHarmonics.length > 0) setIsPlaying(true);
    else alert("Add or activate some harmonics before playing.");
  }, [activeHarmonics.length]);

  const handleStop = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleExport = useCallback(async () => {
    if (!audioContextRef.current) return;
    if (isPlaying) {
        alert("Please stop playback before exporting.");
        return;
    }
    const harmonicsForExport = activeHarmonics;

    if (harmonicsForExport.length === 0 || harmonicsForExport.every(h => {
        const hasSoloActive = harmonicsForExport.some(sH => sH.isSoloed && !sH.isMuted && sH.amplitude > 0);
        if (h.isMuted) return true;
        if (hasSoloActive && !h.isSoloed) return true;
        return h.amplitude === 0;
    })) {
         alert("No audible sound to export. Add harmonics or adjust their amplitudes/mute/solo states.");
         return;
    }

    const audioBuffer = synthesizeSound(harmonicsForExport, audioSettings, audioContextRef.current);
    await exportWav(audioBuffer);
  }, [activeHarmonics, audioSettings, isPlaying]);
  
  const handleAddHarmonicViaModal = useCallback((newHarmonicData: AddHarmonicData) => {
    setActiveHarmonics(prev => {
        if (prev.some(h => h.id === newHarmonicData.id)) {
            alert(`Harmonic ${newHarmonicData.id} already exists.`);
            return prev;
        }
        const newHarmonic: Harmonic = { 
            ...newHarmonicData, 
            isLocked: false, 
            isMuted: false, 
            isSoloed: false 
        };
        const newActives = [...prev, newHarmonic];
        newActives.sort((a, b) => a.id - b.id);
        return newActives;
    });
  }, []);

  const handleAmplitudeChange = useCallback((id: number, newAmplitude: number) => {
    const clampedAmplitude = Math.max(0, Math.min(1, newAmplitude));

    setActiveHarmonics(prev => {
      const existingHarmonic = prev.find(h => h.id === id);

      if (existingHarmonic) {
        // Update existing active harmonic
        if (existingHarmonic.isLocked) return prev;
        return prev.map(h => (h.id === id ? { ...h, amplitude: clampedAmplitude } : h));
      } else {
        // Potentially activate a new harmonic if dragged from inactive state
        if (clampedAmplitude > ACTIVATION_THRESHOLD) {
          const newHarmonic: Harmonic = {
            id,
            amplitude: clampedAmplitude,
            isLocked: false,
            isMuted: false,
            isSoloed: false,
          };
          const newActives = [...prev, newHarmonic];
          newActives.sort((a, b) => a.id - b.id);
          return newActives;
        }
        return prev; // No change if amplitude is too low to activate
      }
    });
  }, []);

  const handleMuteToggle = useCallback((id: number) => {
    setActiveHarmonics(prev =>
      prev.map(h => (h.id === id ? { ...h, isMuted: !h.isMuted } : h))
    );
  }, []);

  const handleLockToggle = useCallback((id: number) => {
    setActiveHarmonics(prev =>
      prev.map(h => (h.id === id ? { ...h, isLocked: !h.isLocked } : h))
    );
  }, []);
  
  const handleSoloToggle = useCallback((id: number) => {
    setActiveHarmonics(prev =>
      prev.map(h => (h.id === id ? { ...h, isSoloed: !h.isSoloed } : h))
    );
  }, []);
  
  const handleSettingsChange = useCallback((newSettings: Partial<AudioSettings>) => {
    setAudioSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const handleRandomize = useCallback(() => {
    setActiveHarmonics(prevActive => {
        const newActiveHarmonicsSetup: Harmonic[] = [];
        const activeIds = new Set(prevActive.map(h => h.id));

        for (let i = 1; i <= MAX_POTENTIAL_HARMONICS; i++) {
            const existingHarmonic = prevActive.find(h => h.id === i);
            if (existingHarmonic && existingHarmonic.isLocked) {
                newActiveHarmonicsSetup.push(existingHarmonic); 
            } else {
                const randomAmplitude = Math.random();
                if (randomAmplitude > ACTIVATION_THRESHOLD || activeIds.has(i)) { 
                    newActiveHarmonicsSetup.push({
                        id: i,
                        amplitude: randomAmplitude,
                        isLocked: false, 
                        isMuted: existingHarmonic ? existingHarmonic.isMuted : false, 
                        isSoloed: false, 
                    });
                }
            }
        }
        newActiveHarmonicsSetup.sort((a, b) => a.id - b.id);
        return newActiveHarmonicsSetup.filter(h => h.amplitude > ACTIVATION_THRESHOLD || h.isLocked);
    });
  }, []);

  const handleClearAllHarmonics = useCallback(() => {
    setActiveHarmonics(prev => {
        const h1 = prev.find(h => h.id === 1);
        const keptHarmonics = prev.filter(h => h.isLocked);
        // Ensure H1 is preserved if it was locked, or re-add it if it wasn't but we want to keep it.
        // For this request, H1 is not special beyond its initial state, so it's cleared if not locked.
        return keptHarmonics;
    });
  }, []);

  const handleRemoveHarmonic = useCallback((idToRemove: number) => {
    // H1 cannot be removed if we make it special. For now, it can be.
    setActiveHarmonics(prevHarmonics => prevHarmonics.filter(h => h.id !== idToRemove));
  }, []);

  const allGraphHarmonics = React.useMemo(() => {
    const activeHarmonicsMap = new Map<number, Harmonic>();
    activeHarmonics.forEach(h => activeHarmonicsMap.set(h.id, h));

    return Array.from({ length: MAX_POTENTIAL_HARMONICS }, (_, i) => {
      const id = i + 1;
      return activeHarmonicsMap.get(id) || { id, amplitude: 0, isLocked: false, isMuted: false, isSoloed: false };
    });
  }, [activeHarmonics]);
  
  const hasAnyAudibleHarmonicsForControls = allGraphHarmonics.some(h => h.amplitude > 0);

  return (
    <div className="flex flex-col h-screen max-h-screen p-3 bg-slate-900 text-slate-100 overflow-hidden">
      <header className="mb-3 text-center">
        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
          Additive Synthesizer
        </h1>
      </header>
      
      <div className="flex flex-grow overflow-hidden space-x-3 mt-2">
        <div className="w-1/3 lg:w-1/4 flex flex-col overflow-hidden bg-slate-800/50 rounded-lg shadow-xl p-2">
          <HarmonicTogglesList
              harmonics={activeHarmonics}
              onAddHarmonic={handleAddHarmonicViaModal}
              onRemoveHarmonic={handleRemoveHarmonic}
              onAmplitudeChange={handleAmplitudeChange}
              onMuteToggle={handleMuteToggle}
              onLockToggle={handleLockToggle}
              onSoloToggle={handleSoloToggle}
            />
        </div>

        <div className="w-2/3 lg:w-3/4 flex flex-col space-y-3 overflow-hidden">
          <div className="flex-grow min-h-0">
            <AmplitudeGraph 
              harmonics={allGraphHarmonics} 
              activeHarmonicIds={new Set(activeHarmonics.map(h => h.id))}
              onAmplitudeChange={handleAmplitudeChange}
            />
          </div>
          <div className="flex-shrink-0">
            <GlobalControls
              settings={audioSettings}
              onSettingsChange={handleSettingsChange}
              onPlay={handlePlay}
              onStop={handleStop}
              onExport={handleExport}
              onRandomize={handleRandomize}
              onClearAll={handleClearAllHarmonics}
              isPlaying={isPlaying}
              hasActiveHarmonics={activeHarmonics.length > 0}
              hasAnyAudibleHarmonics={hasAnyAudibleHarmonicsForControls}
            />
          </div>
        </div>
      </div>
      <footer className="mt-2 text-center text-xs text-slate-500">
        Click "Add New Harmonic +" or drag inactive bars on the graph to begin.
      </footer>
    </div>
  );
};

export default App;
