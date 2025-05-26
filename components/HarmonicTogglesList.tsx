
import React, { useCallback, useState } from 'react';
import { Harmonic } from '../types';

export interface AddHarmonicData {
  id: number;
  amplitude: number;
}

interface HarmonicTogglesListProps {
  harmonics: Harmonic[]; // These are *active* harmonics
  onAddHarmonic: (data: AddHarmonicData) => void;
  onRemoveHarmonic: (id: number) => void;
  onAmplitudeChange: (id: number, amplitude: number) => void;
  onMuteToggle: (id: number) => void;
  onLockToggle: (id: number) => void;
  onSoloToggle: (id: number) => void;
}

const LockIcon: React.FC<{ locked: boolean; className?: string }> = ({ locked, className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 ${className}`}>
    {locked ? (
      <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v7a2 2 0 002 2h10a2 2 0 002-2v-7a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
    ) : (
      <path d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v7a2 2 0 002 2h10a2 2 0 002-2v-7a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h0a3.001 3.001 0 00-2 .865V5.5A4.5 4.5 0 0110 1a4.5 4.5 0 014.5 4.5v5.013A2.988 2.988 0 0013 9h0z" />
    )}
  </svg>
);

const MuteIcon: React.FC<{ muted: boolean; className?: string }> = ({ muted, className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 ${className}`}>
    {muted ? (
      <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 11-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
    ) : (
      <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414z" clipRule="evenodd" />
    )}
  </svg>
);

const SoloIcon: React.FC<{ soloed: boolean; className?: string }> = ({ soloed, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 ${className}`}>
      <path d="M10 9a3 3 0 100-6 3 3 0 000 6zM10 11c-1.66 0-3 1.34-3 3v1h6v-1c0-1.66-1.34-3-3-3z" />
      {soloed && <circle cx="10" cy="10" r="7" stroke={soloed ? 'currentColor' : 'none'} strokeWidth="1.5" fill="none" />}
    </svg>
);

const RemoveIcon: React.FC<{className?: string}> = ({className}) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 ${className}`}>
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.75 9.25a.75.75 0 000 1.5h2.5a.75.75 0 000-1.5h-2.5z" clipRule="evenodd" />
  </svg>
);

const AddIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-5 h-5 ${className}`}>
        <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
    </svg>
);

const MAX_HARMONIC_ID = 32;

const HarmonicTogglesList: React.FC<HarmonicTogglesListProps> = ({
  harmonics,
  onAddHarmonic,
  onRemoveHarmonic,
  onAmplitudeChange,
  onMuteToggle,
  onLockToggle,
  onSoloToggle,
}) => {
  const [isAddingHarmonic, setIsAddingHarmonic] = useState(false);
  const [newHarmonicId, setNewHarmonicId] = useState('');
  const [newHarmonicAmplitude, setNewHarmonicAmplitude] = useState('0.50');

  const handleToggleAddForm = () => {
    if (!isAddingHarmonic) {
        setNewHarmonicId(''); 
        setNewHarmonicAmplitude('0.50');
    }
    setIsAddingHarmonic(!isAddingHarmonic);
  };

  const handleSubmitAddHarmonic = (e: React.FormEvent) => {
    e.preventDefault();
    const id = parseInt(newHarmonicId, 10);
    const amplitude = parseFloat(newHarmonicAmplitude);

    if (isNaN(id) || id < 1 || id > MAX_HARMONIC_ID) {
      alert(`Harmonic number must be an integer between 1 and ${MAX_HARMONIC_ID}.`);
      return;
    }
    if (isNaN(amplitude) || amplitude < 0 || amplitude > 1) {
      alert("Amplitude must be a number between 0.00 and 1.00.");
      return;
    }
    if (harmonics.some(h => h.id === id)) {
        alert(`Harmonic ${id} already exists.`);
        return;
    }

    onAddHarmonic({ id, amplitude });
    setIsAddingHarmonic(false); // Close form after submission
  };
  
  const handleAmplitudeInputChange = useCallback((id: number, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >=0 && numValue <=1) {
        onAmplitudeChange(id, numValue);
    }
    // For live typing, one might want to allow partial inputs before blur.
    // The current onBlur handler will ensure it's corrected if left invalid.
  }, [onAmplitudeChange]);

  const handleAmplitudeInputBlur = useCallback((id: number, currentValue: number, eventValue: string) => {
    let finalValue = parseFloat(eventValue);
    if (isNaN(finalValue) || finalValue < 0) {
        finalValue = 0;
    } else if (finalValue > 1) {
        finalValue = 1;
    }
    // Only call if value actually validly changed from current state or needs correction
    if (finalValue !== currentValue || parseFloat(eventValue) !== finalValue) {
        onAmplitudeChange(id, finalValue);
    }
  }, [onAmplitudeChange]);


  return (
    <div className="flex flex-col h-full">
      <h3 className="text-md font-semibold text-slate-300 mb-2 text-center sticky top-0 bg-slate-800/80 py-1 z-10">
        Active Harmonic Controls
      </h3>
      
      <button
        onClick={handleToggleAddForm}
        className={`w-full flex items-center justify-center space-x-2 mb-3 px-4 py-2 rounded-md font-semibold transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 text-white focus:ring-blue-500 ${isAddingHarmonic ? 'bg-slate-600 hover:bg-slate-500' : 'bg-blue-600 hover:bg-blue-500'}`}
        title={isAddingHarmonic ? "Cancel Adding Harmonic" : "Add a new harmonic"}
      >
        <AddIcon className={isAddingHarmonic ? "transform rotate-45 transition-transform" : "transition-transform"}/>
        <span>{isAddingHarmonic ? "Cancel Add" : "Add New Harmonic"}</span>
      </button>

      {isAddingHarmonic && (
        <div className="p-3 my-2 border border-slate-600 rounded-md bg-slate-700/50 shadow-md">
            <form onSubmit={handleSubmitAddHarmonic} className="space-y-3">
            <div>
                <label htmlFor="newHarmonicId" className="block text-xs font-medium text-slate-400 mb-0.5">
                Harmonic Number (1-{MAX_HARMONIC_ID})
                </label>
                <input
                type="number"
                id="newHarmonicId"
                value={newHarmonicId}
                onChange={(e) => setNewHarmonicId(e.target.value)}
                min="1"
                max={MAX_HARMONIC_ID}
                step="1"
                required
                className="w-full p-1.5 text-sm bg-slate-600 border border-slate-500 rounded-md text-slate-200 focus:ring-blue-500 focus:border-blue-500"
                />
            </div>
            <div>
                <label htmlFor="newHarmonicAmplitude" className="block text-xs font-medium text-slate-400 mb-0.5">
                Initial Amplitude (0.00 - 1.00)
                </label>
                <input
                type="number"
                id="newHarmonicAmplitude"
                value={newHarmonicAmplitude}
                onChange={(e) => setNewHarmonicAmplitude(e.target.value)}
                min="0"
                max="1"
                step="0.01"
                required
                className="w-full p-1.5 text-sm bg-slate-600 border border-slate-500 rounded-md text-slate-200 focus:ring-blue-500 focus:border-blue-500"
                />
            </div>
            <div className="flex justify-end space-x-2 pt-1">
                {/* Cancel button is now the main toggle button */}
                <button
                type="submit"
                className="px-3 py-1.5 rounded-md text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                Add Harmonic
                </button>
            </div>
            </form>
        </div>
      )}

      <div className="overflow-y-auto flex-grow pr-1 custom-scrollbar space-y-1.5 pb-2">
        {harmonics.length === 0 && !isAddingHarmonic && (
            <p className="text-center text-slate-400 text-sm py-6 italic">
                No active harmonics. Click "Add New Harmonic +" or drag graph bars.
            </p>
        )}
        {harmonics.map((h) => (
          <div 
            key={h.id} 
            className={`grid grid-cols-[auto_1fr_auto] gap-x-2 items-center p-1.5 rounded-md bg-slate-700/70 transition-all duration-100
                        ${h.isLocked ? 'ring-1 ring-sky-500' : ''}
                        ${h.isMuted ? 'opacity-60' : ''}
                        ${h.isSoloed && !h.isMuted ? 'ring-1 ring-amber-500' : ''}`}
          >
            <div className="flex items-center space-x-2">
              <span className={`text-xs font-mono text-slate-400 w-7 select-none text-right`}>H{h.id}</span>
              <input
                  type="number"
                  value={h.amplitude.toFixed(3)} // Display with 3 decimal places
                  onChange={(e) => {
                      // Allow typing, but onAmplitudeChange will use parsed float
                      // This intermediate state update for the input field itself is needed for smooth typing
                      // The actual state update in App.tsx happens onBlur or if valid and different
                      const tempValue = e.target.value;
                      const targetInput = e.target as HTMLInputElement;
                      
                      // If you want live updates as user types (can be performance intensive if not careful)
                      // handleAmplitudeInputChange(h.id, tempValue);

                      // For now, we rely on onBlur to commit final value, but onChange should update input's display
                      // To avoid controlled component warning if not updating React state on every change:
                      targetInput.value = tempValue; // Manually set for display
                  }}
                  onBlur={(e) => handleAmplitudeInputBlur(h.id, h.amplitude, e.target.value)}
                  min="0"
                  max="1"
                  step="0.001"
                  disabled={h.isLocked}
                  className={`w-20 p-1 text-xs font-mono bg-slate-600 border border-slate-500 rounded-md text-slate-200 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed tabular-nums`}
                  title={"Harmonic Amplitude (0.000 - 1.000)"}
              />
            </div>

            <div className="flex items-center space-x-1 justify-self-end">
              <button
                onClick={() => onSoloToggle(h.id)}
                className={`p-1 rounded ${h.isSoloed && !h.isMuted ? 'bg-amber-500 text-slate-900' : 'bg-slate-600 hover:bg-slate-500 text-slate-400 hover:text-slate-200'} transition-colors`}
                title={h.isSoloed ? "Unsolo Harmonic (S)" : "Solo Harmonic (S)"}
                aria-pressed={h.isSoloed}
              >
                <SoloIcon soloed={h.isSoloed && !h.isMuted} />
              </button>
              <button
                onClick={() => onLockToggle(h.id)}
                className={`p-1 rounded ${h.isLocked ? 'bg-sky-600 text-white' : 'bg-slate-600 hover:bg-slate-500 text-slate-400 hover:text-slate-200'} transition-colors`}
                title={h.isLocked ? "Unlock Harmonic (L)" : "Lock Harmonic (L)"}
                aria-pressed={h.isLocked}
              >
                <LockIcon locked={h.isLocked} />
              </button>
              <button
                onClick={() => onMuteToggle(h.id)}
                className={`p-1 rounded ${h.isMuted ? 'bg-yellow-600 text-slate-100' : 'bg-slate-600 hover:bg-slate-500 text-slate-400 hover:text-slate-200'} transition-colors`}
                title={h.isMuted ? "Unmute Harmonic (M)" : "Mute Harmonic (M)"}
                aria-pressed={h.isMuted}
              >
                <MuteIcon muted={h.isMuted} />
              </button>
            </div>
             <div className="justify-self-center">
               <button
                  onClick={() => onRemoveHarmonic(h.id)}
                  disabled={h.isLocked} 
                  className={`p-1 rounded ${h.isLocked ? 'opacity-50 cursor-not-allowed' : 'text-red-400 hover:text-red-300 hover:bg-red-700/50'} transition-colors`}
                  title={"Deactivate Harmonic"}
              >
                  <RemoveIcon />
              </button>
             </div>
          </div>
        ))}
      </div>
      <p className="text-center text-slate-500 text-xs pt-1 mt-auto">
          {harmonics.length > 0 ? `${harmonics.length} active harmonic(s).` : "Drag graph bars to activate."}
      </p>
    </div>
  );
};

export default HarmonicTogglesList;
