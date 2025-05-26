export interface Harmonic {
  id: number; // 1-32
  amplitude: number; // 0.00 - 1.00
  isLocked: boolean;
  isMuted: boolean;
  isSoloed: boolean;
}

export interface AudioSettings {
  fundamentalFrequency: number; // Hz
  duration: number; // seconds
  masterVolume: number; // 0.0 - 1.0
}

export interface GraphDataPoint {
  name: string; // e.g., "H1", "H2"
  amplitude: number; // The effective amplitude for display
  originalAmplitude: number; // The actual configured amplitude
  isMuted: boolean;
  isLocked: boolean;
  isSoloed: boolean;
  id: number;
}