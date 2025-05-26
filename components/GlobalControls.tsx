
import React from 'react';
import { AudioSettings } from '../types';

interface GlobalControlsProps {
  settings: AudioSettings;
  onSettingsChange: (newSettings: Partial<AudioSettings>) => void;
  onPlay: () => void;
  onStop: () => void;
  onExport: () => void;
  onRandomize: () => void;
  onClearAll: () => void;
  isPlaying: boolean;
  hasActiveHarmonics: boolean; // True if activeHarmonics list is not empty
  hasAnyAudibleHarmonics: boolean; // True if any of the 32 graph bars has amplitude > 0
}

const PlayIcon: React.FC<{ className?: string }> = ({className}) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-5 h-5 ${className}`}>
    <path fillRule="evenodd" d="M2 10a8 8 0 1116 0 8 8 0 01-16 0zm6.39-2.908a.75.75 0 01.766.027l3.5 2.25a.75.75 0 010 1.262l-3.5 2.25A.75.75 0 018 12.25v-4.5a.75.75 0 01.39-.658z" clipRule="evenodd" />
  </svg>
);

const StopIcon: React.FC<{ className?: string }> = ({className}) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-5 h-5 ${className}`}>
    <path fillRule="evenodd" d="M2 10a8 8 0 1116 0 8 8 0 01-16 0zM9.25 7.25a.75.75 0 00-1.5 0v5.5a.75.75 0 001.5 0v-5.5zM12.25 7.25a.75.75 0 00-1.5 0v5.5a.75.75 0 001.5 0v-5.5z" clipRule="evenodd" />
  </svg>
);

const ExportIcon: React.FC<{ className?: string }> = ({className}) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-5 h-5 ${className}`}>
    <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
    <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
  </svg>
);

const RandomizeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-5 h-5 ${className}`}>
    <path fillRule="evenodd" d="M15.312 11.242a5.25 5.25 0 01-7.298 8.006L1.922 13.15A2.513 2.513 0 01.5 11.04V4.75A2.25 2.25 0 012.75 2.5h10.5A2.25 2.25 0 0115.5 4.75v2.75a.75.75 0 01-1.5 0V4.75a.75.75 0 00-.75-.75H2.75a.75.75 0 00-.75.75v6.29c0 .285.078.556.22.788l5.083 5.083a3.75 3.75 0 005.303-5.303l1.38-1.379a.75.75 0 111.06 1.06l-1.379 1.38zM12.751 2.52a.75.75 0 01.752.653A1.502 1.502 0 0112.002 4.5h-2.25a.75.75 0 010-1.5h2.25c.054 0 .107.006.157.017a.75.75 0 01.593-.547z" clipRule="evenodd" />
    <path d="M16.874 7.468a.75.75 0 011.061 1.06l-1.75 1.75a.75.75 0 11-1.06-1.06l1.749-1.75zM17.25 5.25a.75.75 0 00-1.5 0v2.561l-1.03-1.03a.75.75 0 00-1.061 1.061l2.251 2.25a.75.75 0 001.06 0l2.25-2.251a.75.75 0 00-1.06-1.06l-1.031 1.03V5.25z" />
  </svg>
);

const ClearIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-5 h-5 ${className}`}>
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.25 7.25a.75.75 0 011.5 0v5.5a.75.75 0 01-1.5 0v-5.5z" clipRule="evenodd" />
  </svg>
);


const GlobalControls: React.FC<GlobalControlsProps> = ({
  settings,
  onSettingsChange,
  onPlay,
  onStop,
  onExport,
  onRandomize,
  onClearAll,
  isPlaying,
  hasActiveHarmonics,
  hasAnyAudibleHarmonics,
}) => {
  const buttonBaseClass = "flex items-center justify-center space-x-2 px-4 py-2 rounded-md font-semibold transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800";
  const enabledButtonClass = "bg-blue-600 hover:bg-blue-500 text-white focus:ring-blue-500";
  const disabledButtonClass = "bg-slate-700 text-slate-500 cursor-not-allowed";
  const stopButtonClass = "bg-red-600 hover:bg-red-500 text-white focus:ring-red-500";

  return (
    <div className="bg-slate-800/70 p-3 rounded-lg shadow-lg">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
        {/* Settings Column */}
        <div className="space-y-2">
          <div>
            <label htmlFor="fundamentalFrequency" className="block text-xs font-medium text-slate-400 mb-1">
              Fundamental Frequency (Hz)
            </label>
            <input
              type="number"
              id="fundamentalFrequency"
              name="fundamentalFrequency"
              value={settings.fundamentalFrequency}
              onChange={(e) => onSettingsChange({ fundamentalFrequency: parseFloat(e.target.value) || 0 })}
              min="20"
              max="2000"
              step="1"
              className="w-full p-1.5 text-sm bg-slate-700 border border-slate-600 rounded-md text-slate-200 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="duration" className="block text-xs font-medium text-slate-400 mb-1">
              Duration (s)
            </label>
            <input
              type="number"
              id="duration"
              name="duration"
              value={settings.duration}
              onChange={(e) => onSettingsChange({ duration: parseFloat(e.target.value) || 0 })}
              min="0.1"
              max="10"
              step="0.1"
              className="w-full p-1.5 text-sm bg-slate-700 border border-slate-600 rounded-md text-slate-200 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="masterVolume" className="block text-xs font-medium text-slate-400 mb-1">
              Master Volume ({Math.round(settings.masterVolume * 100)}%)
            </label>
            <input
              type="range"
              id="masterVolume"
              name="masterVolume"
              value={settings.masterVolume}
              onChange={(e) => onSettingsChange({ masterVolume: parseFloat(e.target.value) })}
              min="0"
              max="1"
              step="0.01"
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>
        </div>

        {/* Actions Column */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onPlay}
            disabled={isPlaying || !hasActiveHarmonics}
            className={`${buttonBaseClass} ${isPlaying || !hasActiveHarmonics ? disabledButtonClass : enabledButtonClass}`}
            title={!hasActiveHarmonics ? "Activate harmonics on the graph to play" : "Play Sound"}
            aria-label="Play Sound"
          >
            <PlayIcon />
            <span>Play</span>
          </button>
          <button
            onClick={onStop}
            disabled={!isPlaying}
            className={`${buttonBaseClass} ${!isPlaying ? disabledButtonClass : stopButtonClass}`}
            title="Stop Sound"
            aria-label="Stop Sound"
          >
            <StopIcon />
            <span>Stop</span>
          </button>
          <button
            onClick={onExport}
            disabled={isPlaying || !hasAnyAudibleHarmonics}
            className={`${buttonBaseClass} ${isPlaying || !hasAnyAudibleHarmonics ? disabledButtonClass : enabledButtonClass}`}
            title={isPlaying ? "Stop playback before exporting" : (!hasAnyAudibleHarmonics ? "No sound to export" : "Export as .WAV")}
            aria-label="Export as WAV"
          >
            <ExportIcon />
            <span>Export</span>
          </button>
          <button
            onClick={onRandomize}
            // Randomize is always enabled
            className={`${buttonBaseClass} ${enabledButtonClass}`}
            title="Randomize Harmonic Amplitudes"
            aria-label="Randomize Harmonics"
          >
            <RandomizeIcon />
            <span>Randomize</span>
          </button>
          <button
            onClick={onClearAll}
            disabled={!hasActiveHarmonics} // Only clear if there are active harmonics to clear
            className={`${buttonBaseClass} ${!hasActiveHarmonics ? disabledButtonClass : enabledButtonClass}`}
            title={!hasActiveHarmonics ? "No active harmonics to clear" : "Clear All Active Non-Locked Harmonics"}
            aria-label="Clear All Harmonics"
          >
            <ClearIcon />
            <span>Clear All</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default GlobalControls;
