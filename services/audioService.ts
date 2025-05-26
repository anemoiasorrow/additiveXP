
import { Harmonic, AudioSettings } from '../types';

export const synthesizeSound = (
  harmonics: Harmonic[],
  settings: AudioSettings,
  ctx: AudioContext
): AudioBuffer => {
  const { fundamentalFrequency, duration, masterVolume } = settings;
  const sampleRate = ctx.sampleRate;
  const numFrames = Math.floor(sampleRate * duration);
  const audioBuffer = ctx.createBuffer(1, numFrames, sampleRate); // Mono
  const channelData = audioBuffer.getChannelData(0);

  const fadeSamples = Math.floor(sampleRate * 0.005); // 5ms fade

  const anySolo = harmonics.some(h => h.isSoloed);
  
  let activeHarmonics = harmonics;
  if (anySolo) {
    activeHarmonics = harmonics.filter(h => h.isSoloed && !h.isMuted);
  } else {
    activeHarmonics = harmonics.filter(h => !h.isMuted);
  }

  for (let i = 0; i < numFrames; i++) {
    const time = i / sampleRate;
    let sampleValue = 0;

    activeHarmonics.forEach((harmonic) => {
      if (harmonic.amplitude > 0) { // Ensure amplitude is positive
        const frequency = fundamentalFrequency * harmonic.id;
        sampleValue += harmonic.amplitude * Math.sin(2 * Math.PI * frequency * time);
      }
    });
    
    let envelope = 1.0;
    if (duration * 1000 > 10) { 
        if (i < fadeSamples) { 
          envelope = i / fadeSamples;
        } else if (i >= numFrames - fadeSamples) { 
          envelope = (numFrames - 1 - i) / fadeSamples;
        }
    }
    channelData[i] = sampleValue * envelope * masterVolume; // Apply master volume
  }
  
  let max = 0;
  for (let i = 0; i < numFrames; i++) {
    if (Math.abs(channelData[i]) > max) {
      max = Math.abs(channelData[i]);
    }
  }
  if (max > 0.98) { 
    const gain = 0.98 / max;
    for (let i = 0; i < numFrames; i++) {
      channelData[i] *= gain;
    }
  }

  return audioBuffer;
};

const writeString = (view: DataView, offset: number, string: string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

const floatTo16BitPCM = (output: DataView, offset: number, input: Float32Array) => {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
};

const audioBufferToWavBlob = (audioBuffer: AudioBuffer): Blob => {
  const numOfChan = audioBuffer.numberOfChannels;
  const length = audioBuffer.length * numOfChan * 2 + 44; 
  const buffer = new ArrayBuffer(length);
  const view = new DataView(buffer);
  const channels = [];
  let sampleRate = audioBuffer.sampleRate;
  let offset = 0;

  for (let i = 0; i < numOfChan; i++) {
    channels.push(audioBuffer.getChannelData(i));
  }

  writeString(view, offset, 'RIFF'); offset += 4;
  view.setUint32(offset, length - 8, true); offset += 4;
  writeString(view, offset, 'WAVE'); offset += 4;
  writeString(view, offset, 'fmt '); offset += 4;
  view.setUint32(offset, 16, true); offset += 4; 
  view.setUint16(offset, 1, true); offset += 2; 
  view.setUint16(offset, numOfChan, true); offset += 2;
  view.setUint32(offset, sampleRate, true); offset += 4;
  view.setUint32(offset, sampleRate * numOfChan * 2, true); offset += 4; 
  view.setUint16(offset, numOfChan * 2, true); offset += 2; 
  view.setUint16(offset, 16, true); offset += 2; 
  writeString(view, offset, 'data'); offset += 4;
  view.setUint32(offset, audioBuffer.length * numOfChan * 2, true); offset += 4;

  if (numOfChan === 1) {
    floatTo16BitPCM(view, offset, channels[0]);
  } else { 
    for (let i = 0; i < audioBuffer.length; i++) {
      for (let chan = 0; chan < numOfChan; chan++) {
        const sample = channels[chan][i];
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }
  }
  
  return new Blob([view], { type: 'audio/wav' });
}


export const exportWav = async (audioBuffer: AudioBuffer) => {
  const blob = audioBufferToWavBlob(audioBuffer);
  const defaultFileName = 'additive_synth_output.wav';

  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: defaultFileName,
        types: [{
          description: 'WAV audio file',
          accept: { 'audio/wav': ['.wav'] },
        }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err) {
      if ((err as DOMException).name === 'AbortError') {
        console.info('File save dialog cancelled by user.');
        return;
      }
      console.error('Error using showSaveFilePicker, falling back to direct download:', err);
      // Fallback to direct download will happen below
    }
  } else {
    console.info('showSaveFilePicker API not available. Falling back to direct download.');
  }
  
  // Fallback direct download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  document.body.appendChild(a);
  a.style.display = 'none';
  a.href = url;
  a.download = defaultFileName;
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};
