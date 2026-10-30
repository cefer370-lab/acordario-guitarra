import { ChordTone, ParsedChord } from '../types/music';
import { getDefaultScaleForChord, getScaleTones } from './musicTheory';
import { SCALES } from '../data/defaultChords';
import { SoloTimbre } from '../audio/soundEngine';

export type ImproviserMode = 'arp' | 'scale' | 'mixed' | 'penta';
export type ImproviserMeter = '4/4' | '3/4' | '2/4';
export type ImproviserFigure = 'negras' | 'corcheas' | 'tresillos' | 'tresillos_3x2' | 'semicorcheas';
export type ImproviserDirection = 'up' | 'down' | 'updown' | 'thirds' | 'melodic';

export interface ImproviserSettings {
  enabled: boolean;
  mode: ImproviserMode;
  meter: ImproviserMeter;
  figure: ImproviserFigure;
  direction: ImproviserDirection;
  timbre: SoloTimbre;
  octave: 'mid' | 'high' | 'wide';
  scaleId?: string; // 'auto' or explicit scale like 'pentam', 'blues', 'dorica'
  swing: boolean;
}

export interface ScheduledSoloNote {
  timeOffset: number; // in seconds from start of beat
  duration: number; // in seconds
  midi: number;
  label: string;
  interval: string;
  isChordTone: boolean;
  stringIdx?: number;
  fret?: number;
}

/**
 * Builds pitch pool (MIDI 48..84) of chord tones
 */
export function getChordTonePitches(
  chordTones: ChordTone[],
  octaveRange: 'mid' | 'high' | 'wide' = 'mid'
): { midi: number; pc: number; lab: string; fn: string }[] {
  if (!chordTones || chordTones.length === 0) return [];
  const minMidi = octaveRange === 'high' ? 64 : octaveRange === 'wide' ? 48 : 55;
  const maxMidi = octaveRange === 'high' ? 88 : octaveRange === 'wide' ? 84 : 79;

  const result: { midi: number; pc: number; lab: string; fn: string }[] = [];
  for (let m = minMidi; m <= maxMidi; m++) {
    const pc = m % 12;
    const tone = chordTones.find((t) => t.pc === pc);
    if (tone) {
      result.push({
        midi: m,
        pc,
        lab: tone.lab,
        fn: tone.fn,
      });
    }
  }
  return result.sort((a, b) => a.midi - b.midi);
}

/**
 * Builds pitch pool of scale tones
 */
export function getScaleTonePitches(
  chord: ParsedChord,
  scaleId: string = 'auto',
  octaveRange: 'mid' | 'high' | 'wide' = 'mid'
): { midi: number; pc: number; lab: string }[] {
  let targetScaleId = scaleId;
  if (!targetScaleId || targetScaleId === 'auto') {
    targetScaleId = chord.q ? getDefaultScaleForChord({ id: chord.q, scale: '' } as any) : 'mayor';
  }

  const scaleDef = SCALES.find((s) => s.id === targetScaleId) || SCALES[0];
  const tones = getScaleTones(chord.li, chord.acc, scaleDef.degrees);

  const minMidi = octaveRange === 'high' ? 64 : octaveRange === 'wide' ? 48 : 55;
  const maxMidi = octaveRange === 'high' ? 88 : octaveRange === 'wide' ? 84 : 79;

  const result: { midi: number; pc: number; lab: string }[] = [];
  for (let m = minMidi; m <= maxMidi; m++) {
    const pc = m % 12;
    const st = tones.find((t) => t.pc === pc);
    if (st) {
      result.push({
        midi: m,
        pc,
        lab: st.lab,
      });
    }
  }
  return result.sort((a, b) => a.midi - b.midi);
}

/**
 * Calculates notes to be played for a specific beat
 */
export function generateBeatSoloNotes(
  beatInMeasure: number, // 0..3 for 4/4
  measureBeatCount: number, // 4 for 4/4, 3 for 3/4
  beatDuration: number, // duration of 1 beat in seconds
  chord: ParsedChord,
  chordTones: ChordTone[],
  settings: ImproviserSettings,
  stepCounter: { current: number }
): ScheduledSoloNote[] {
  if (!settings.enabled || !chordTones || chordTones.length === 0) return [];

  // Determine candidate pitches
  let pool: { midi: number; pc: number; lab: string; fn?: string }[] = [];
  if (settings.mode === 'arp') {
    pool = getChordTonePitches(chordTones, settings.octave);
  } else if (settings.mode === 'scale') {
    pool = getScaleTonePitches(chord, settings.scaleId || 'auto', settings.octave);
  } else if (settings.mode === 'penta') {
    const pentaId = chord.q && chord.q.includes('m') ? 'pentam' : 'penta';
    pool = getScaleTonePitches(chord, pentaId, settings.octave);
  } else {
    // Mixed: Chord tones on main beats, scale tones on off-beats
    const arpPool = getChordTonePitches(chordTones, settings.octave);
    const scPool = getScaleTonePitches(chord, settings.scaleId || 'auto', settings.octave);
    pool = scPool.length > 0 ? scPool : arpPool;
  }

  if (pool.length === 0) return [];

  // Determine subdivision count and time offsets within this beat
  let offsets: number[] = [];
  let noteDuration = beatDuration * 0.85;

  switch (settings.figure) {
    case 'negras': // 1 note per beat
      offsets = [0];
      noteDuration = beatDuration * 0.9;
      break;

    case 'corcheas': // 2 notes per beat
      if (settings.swing) {
        // Swing feel: 2/3 and 1/3
        offsets = [0, beatDuration * 0.62];
        noteDuration = beatDuration * 0.42;
      } else {
        offsets = [0, beatDuration * 0.5];
        noteDuration = beatDuration * 0.45;
      }
      break;

    case 'tresillos': // 3 notes per beat
      offsets = [0, beatDuration / 3, (beatDuration * 2) / 3];
      noteDuration = (beatDuration / 3) * 0.88;
      break;

    case 'tresillos_3x2': // 3 notes distributed across 2 beats ("3x2" hemiola)
      // If even beat (0 or 2), schedule first 2 notes; if odd (1 or 3), schedule remaining note
      if (beatInMeasure % 2 === 0) {
        const unit = (beatDuration * 2) / 3;
        offsets = [0, unit];
        noteDuration = unit * 0.85;
      } else {
        const unit = (beatDuration * 2) / 3;
        const remainingOffset = unit * 2 - beatDuration; // offset in 2nd beat
        offsets = [remainingOffset];
        noteDuration = unit * 0.85;
      }
      break;

    case 'semicorcheas': // 4 notes per beat
      offsets = [0, beatDuration * 0.25, beatDuration * 0.5, beatDuration * 0.75];
      noteDuration = beatDuration * 0.22;
      break;
  }

  const notes: ScheduledSoloNote[] = [];

  offsets.forEach((timeOffset, subIdx) => {
    const poolLen = pool.length;
    let idx = stepCounter.current % poolLen;
    let pitchItem: { midi: number; pc: number; lab: string; fn?: string } = pool[idx];

    if (settings.direction === 'up') {
      idx = stepCounter.current % poolLen;
      stepCounter.current++;
    } else if (settings.direction === 'down') {
      idx = (poolLen - 1) - (stepCounter.current % poolLen);
      stepCounter.current++;
    } else if (settings.direction === 'updown') {
      const cycleLen = Math.max(1, (poolLen - 1) * 2);
      const pos = stepCounter.current % cycleLen;
      idx = pos < poolLen ? pos : cycleLen - pos;
      stepCounter.current++;
    } else if (settings.direction === 'thirds') {
      // 1 - 3, 2 - 4, 3 - 5 pattern
      const pair = Math.floor(stepCounter.current / 2) % (poolLen - 2);
      const isSecond = stepCounter.current % 2 === 1;
      idx = isSecond ? Math.min(poolLen - 1, pair + 2) : pair;
      stepCounter.current++;
    } else {
      // Melodic: prioritize chord tones on strong beats, passing notes on off-beats
      const isStrongBeat = beatInMeasure === 0 || beatInMeasure === 2;
      if (isStrongBeat && subIdx === 0) {
        // Pick chord tone (Root, 3rd, 5th or 7th)
        const chordTonesInPool = pool.filter((p) => chordTones.some((ct) => ct.pc === p.pc));
        pitchItem = chordTonesInPool[stepCounter.current % chordTonesInPool.length] || pool[idx];
      } else {
        // Melodic step or neighbor
        idx = stepCounter.current % poolLen;
        pitchItem = pool[idx];
      }
      stepCounter.current++;
    }

    pitchItem = pitchItem || pool[idx];

    const isChordTone = chordTones.some((ct) => ct.pc === pitchItem.pc);
    const ct = chordTones.find((c) => c.pc === pitchItem.pc);
    const intervalLabel = ct ? ct.lab : pitchItem.lab;

    notes.push({
      timeOffset,
      duration: noteDuration,
      midi: pitchItem.midi,
      label: pitchItem.lab,
      interval: intervalLabel,
      isChordTone,
    });
  });

  return notes;
}
