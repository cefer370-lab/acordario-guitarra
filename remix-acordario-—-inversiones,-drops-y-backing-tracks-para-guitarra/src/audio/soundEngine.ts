import { MixerVolumes, PlaybackStyle, VoicingResult } from '../types/music';
import { PLAYBACK_STYLES } from '../data/defaultThemes';

// Single shared Web Audio Context
let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let compressor: DynamicsCompressorNode | null = null;

// Mixer bus nodes
let busGuitar: GainNode | null = null;
let busBass: GainNode | null = null;
let busDrums: GainNode | null = null;
let busMelody: GainNode | null = null;
let busClick: GainNode | null = null;

// Filters
let filterGuitar: BiquadFilterNode | null = null;
let filterBass: BiquadFilterNode | null = null;
let filterMelody: BiquadFilterNode | null = null;

// Cache for Karplus-Strong audio buffers
const ksBufferCache = new Map<string, AudioBuffer>();
let noiseBuffer: AudioBuffer | null = null;
let isAudioUnlocked = false;

export function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
    setupAudioGraph(audioCtx);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function unlockAudio() {
  try {
    if ((navigator as any).audioSession) {
      (navigator as any).audioSession.type = 'playback';
    }
  } catch {}

  const ctx = getAudioContext();
  if (isAudioUnlocked) return;
  isAudioUnlocked = true;

  try {
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
  } catch {}
}

function setupAudioGraph(ctx: AudioContext) {
  compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -16;
  compressor.knee.value = 30;
  compressor.ratio.value = 4;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.25;
  compressor.connect(ctx.destination);

  masterGain = ctx.createGain();
  masterGain.gain.value = 0.9;
  masterGain.connect(compressor);

  // Mixer busses
  busGuitar = ctx.createGain();
  busBass = ctx.createGain();
  busDrums = ctx.createGain();
  busMelody = ctx.createGain();
  busClick = ctx.createGain();

  busGuitar.connect(masterGain);
  busBass.connect(masterGain);
  busDrums.connect(masterGain);
  busMelody.connect(masterGain);
  busClick.connect(masterGain);

  filterGuitar = ctx.createBiquadFilter();
  filterGuitar.type = 'lowpass';
  filterGuitar.frequency.value = 4800;
  filterGuitar.connect(busGuitar);

  filterBass = ctx.createBiquadFilter();
  filterBass.type = 'lowpass';
  filterBass.frequency.value = 850;
  filterBass.connect(busBass);

  filterMelody = ctx.createBiquadFilter();
  filterMelody.type = 'lowpass';
  filterMelody.frequency.value = 6500;
  filterMelody.connect(busMelody);

  applyMixerVolumes({ g: 0.8, b: 0.75, d: 0.5, m: 0.7, c: 0.0 });
}

export function applyMixerVolumes(vol: MixerVolumes, style: PlaybackStyle = 'manouche') {
  if (!busGuitar || !busBass || !busDrums || !busMelody || !busClick || !filterGuitar) return;

  busGuitar.gain.value = vol.g * 0.45;
  busBass.gain.value = vol.b * 0.9;
  busDrums.gain.value = vol.d * 0.8;
  busMelody.gain.value = vol.m * 0.6;
  busClick.gain.value = vol.c * 0.7;

  const styleConfig = PLAYBACK_STYLES[style];
  if (styleConfig) {
    filterGuitar.frequency.value = styleConfig.tone;
  }
}

// Generates white noise buffer for drums & percussives
function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noiseBuffer) return noiseBuffer;
  const length = ctx.sampleRate * 2;
  noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
}

// Karplus-Strong Plucked String Synthesis
export function getKarplusStrongBuffer(ctx: AudioContext, midi: number, kind: 'g' | 'b' | 'n' = 'g'): AudioBuffer {
  const key = `${kind}_${midi}`;
  const cached = ksBufferCache.get(key);
  if (cached) return cached;

  const sr = ctx.sampleRate;
  const freq = 440 * Math.pow(2, (midi - 69) / 12);
  const duration = kind === 'b' ? 2.5 : kind === 'n' ? 2.2 : 2.0;
  const length = Math.floor(sr * duration);

  const buffer = ctx.createBuffer(1, length, sr);
  const data = buffer.getChannelData(0);

  const N = Math.max(2, Math.round(sr / freq));
  const ring = new Float32Array(N);

  for (let i = 0; i < N; i++) {
    ring[i] = Math.random() * 2 - 1;
  }

  // Pre-filter noise burst for warmth
  const smoothPasses = kind === 'b' ? 7 : kind === 'n' ? 3 : 1;
  for (let p = 0; p < smoothPasses; p++) {
    for (let i = 0; i < N; i++) {
      ring[i] = 0.5 * (ring[i] + ring[(i + 1) % N]);
    }
  }

  // Remove DC bias
  let mean = 0;
  for (let i = 0; i < N; i++) mean += ring[i];
  mean /= N;
  let peak = 0;
  for (let i = 0; i < N; i++) {
    ring[i] -= mean;
    peak = Math.max(peak, Math.abs(ring[i]));
  }
  for (let i = 0; i < N; i++) ring[i] /= peak || 1;

  // Damping factor: bass sustains deeper, nylon decays smoother
  const damp = kind === 'b' ? 0.4996 : kind === 'n' ? 0.4975 : 0.4988;
  let j = 0;
  for (let i = 0; i < length; i++) {
    const nextIdx = (j + 1) % N;
    const val = ring[j];
    data[i] = val;
    ring[j] = damp * (val + ring[nextIdx]);
    j = nextIdx;
  }

  ksBufferCache.set(key, buffer);
  return buffer;
}

// Play single note with envelope
export function playNote(
  midi: number,
  time: number,
  duration: number,
  velocity: number,
  destination: AudioNode,
  kind: 'g' | 'b' | 'n' = 'g'
) {
  const ctx = getAudioContext();
  const source = ctx.createBufferSource();
  source.buffer = getKarplusStrongBuffer(ctx, midi, kind);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(velocity, time);
  gain.gain.setValueAtTime(velocity, time + duration);
  gain.gain.exponentialRampToValueAtTime(0.0005, time + duration + 0.05);

  source.connect(gain);
  gain.connect(destination);

  source.start(time);
  source.stop(time + Math.min(duration + 0.08, source.buffer.duration));
}

export type SoloTimbre = 'guitar_clean' | 'guitar_lead' | 'rhodes' | 'synth';

// Play melodic lead note for auto-improviser
export function playLeadSoloNote(
  midi: number,
  time: number,
  duration: number,
  velocity: number = 0.85,
  timbre: SoloTimbre = 'guitar_clean'
) {
  const ctx = getAudioContext();
  if (!filterMelody || !busMelody) return;

  if (timbre === 'guitar_clean') {
    // Warm jazz guitar plucked string
    playNote(midi, time, duration, velocity, filterMelody, 'g');
  } else if (timbre === 'guitar_lead') {
    // Electric guitar lead with subtle drive & warmth
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(2600, time);
    f.frequency.exponentialRampToValueAtTime(1600, time + duration);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(velocity * 0.42, time + 0.015);
    gain.gain.setValueAtTime(velocity * 0.38, time + duration * 0.75);
    gain.gain.exponentialRampToValueAtTime(0.0005, time + duration + 0.04);

    osc.connect(f);
    f.connect(gain);
    gain.connect(filterMelody);

    osc.start(time);
    osc.stop(time + duration + 0.05);
  } else if (timbre === 'rhodes') {
    // Electric piano / Rhodes bell tone
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    const freq = 440 * Math.pow(2, (midi - 69) / 12);

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, time);
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2, time);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(velocity * 0.48, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0005, time + duration);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(filterMelody);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + duration + 0.02);
    osc2.stop(time + duration + 0.02);
  } else {
    // Synth flute/lead tone
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(velocity * 0.52, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0005, time + duration);

    osc.connect(gain);
    gain.connect(filterMelody);

    osc.start(time);
    osc.stop(time + duration + 0.03);
  }
}

// Play guitar strum (down or up) across midis
export function playStrum(
  midis: number[],
  time: number,
  duration: number,
  velocity: number,
  upward: boolean = false,
  spread: number = 0.012,
  kind: 'g' | 'n' = 'g',
  noteCount?: number
) {
  if (!filterGuitar) return;
  let notes = upward ? [...midis].reverse() : [...midis];
  if (noteCount) notes = notes.slice(0, noteCount);

  notes.forEach((midi, i) => {
    const noteTime = time + i * spread;
    const noteDur = Math.max(0.04, duration - i * spread);
    const vel = velocity * (1 - i * 0.04);
    playNote(midi, noteTime, noteDur, vel, filterGuitar!, kind);
  });
}

// Percussion synthesis
export function playNoise(
  time: number,
  velocity: number,
  filterType: BiquadFilterType,
  freq: number,
  q: number,
  attack: number,
  decay: number
) {
  const ctx = getAudioContext();
  if (!busDrums) return;

  const source = ctx.createBufferSource();
  source.buffer = getNoiseBuffer(ctx);

  const filter = ctx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.value = freq;
  filter.Q.value = q;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.linearRampToValueAtTime(velocity, time + attack);
  gain.gain.exponentialRampToValueAtTime(0.0005, time + attack + decay);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(busDrums);

  source.start(time, Math.random() * 0.5);
  source.stop(time + attack + decay + 0.06);
}

export function playSineTone(
  time: number,
  velocity: number,
  freq: number,
  type: OscillatorType,
  decay: number,
  destination: AudioNode
) {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, time);

  gain.gain.setValueAtTime(velocity, time);
  gain.gain.exponentialRampToValueAtTime(0.0005, time + decay);

  osc.connect(gain);
  gain.connect(destination);

  osc.start(time);
  osc.stop(time + decay + 0.03);
}

export const playHat = (t: number, v: number) => playNoise(t, v, 'highpass', 7800, 0.8, 0.001, 0.045);
export const playRide = (t: number, v: number) => {
  if (!busDrums) return;
  playNoise(t, v * 0.8, 'bandpass', 5200, 1.3, 0.001, 0.38);
  playSineTone(t, v * 0.12, 4700, 'triangle', 0.25, busDrums);
};
export const playBrush = (t: number, v: number, len: number = 0.14) => playNoise(t, v, 'bandpass', 3200, 0.5, 0.02, len);
export const playSnare = (t: number, v: number) => {
  if (!busDrums) return;
  playNoise(t, v, 'bandpass', 1900, 0.8, 0.001, 0.17);
  playSineTone(t, v * 0.55, 185, 'triangle', 0.08, busDrums);
};
export const playRim = (t: number, v: number) => {
  if (!busDrums) return;
  playNoise(t, v * 0.6, 'bandpass', 2600, 5, 0.001, 0.03);
  playSineTone(t, v * 0.45, 1750, 'sine', 0.03, busDrums);
};
export const playShaker = (t: number, v: number) => playNoise(t, v, 'highpass', 5500, 0.5, 0.01, 0.05);

export function playKick(t: number, v: number) {
  const ctx = getAudioContext();
  if (!busDrums) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.frequency.setValueAtTime(130, t);
  osc.frequency.exponentialRampToValueAtTime(42, t + 0.12);

  gain.gain.setValueAtTime(v, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);

  osc.connect(gain);
  gain.connect(busDrums);

  osc.start(t);
  osc.stop(t + 0.35);
}

export function playClick(t: number, accent: boolean, loud: boolean = false) {
  if (!masterGain || !busClick) return;
  const dest = loud ? masterGain : busClick;
  const freq = accent ? 1650 : 1100;
  const vel = (loud ? 0.6 : 0.45) * (accent ? 1 : 0.7);
  playSineTone(t, vel, freq, 'sine', 0.04, dest);
}

// Single guitar note pluck (for fretboard interactive click)
export function pluckGuitarNote(midi: number) {
  unlockAudio();
  const ctx = getAudioContext();
  if (!filterGuitar) return;
  const now = ctx.currentTime + 0.01;
  playNote(midi, now, 1.8, 0.8, filterGuitar, 'g');
}

// Play complete chord strum immediately
export function previewVoicing(voicing: VoicingResult, arpeggio: boolean = false) {
  unlockAudio();
  const ctx = getAudioContext();
  if (!filterGuitar) return;
  const now = ctx.currentTime + 0.02;

  if (arpeggio) {
    voicing.midis.forEach((m, i) => {
      playNote(m, now + i * 0.12, 1.2, 0.85, filterGuitar!, 'g');
    });
  } else {
    playStrum(voicing.midis, now, 1.6, 0.9, false, 0.025, 'g');
  }
}
