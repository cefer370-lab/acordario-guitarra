/**
 * ACORDARIO — Tipos musicales para guitarra, inversiones, drops y backing tracks
 */

export type VoicingType = 'closed' | 'drop2' | 'drop3' | 'drop24';
export type NotationStyle = 'anglo' | 'latin'; // C D E vs Do Re Mi
export type LabelMode = 'int' | 'note'; // Intervalos (1, b3, 5) vs Notas (C, Eb, G)
export type Accidental = -2 | -1 | 0 | 1 | 2; // bb, b, natural, #, ##

export interface ChordType {
  id: string;
  name: string; // e.g. "maj7", "m7b5", "°7"
  label: string; // e.g. "Mayor", "m", "7", "m7b5"
  aliases: string[];
  degrees: string; // "1,3,5,7"
  tones: [number, number, string][]; // [semitonesFromRoot, degreeNumber, degreeLabel]
  scale: string; // associated scale id (e.g. 'dorica', 'mixolidia')
  active?: boolean;
}

export interface ChordTone {
  semi: number;
  lab: string;
  idx: number;
  fn: 'root' | '3' | '5' | '7' | 'sus';
  li: number; // letter index 0..6
  acc: number; // accidental
  pc: number; // pitch class 0..11
  p?: number; // midi pitch in voicing
}

export interface VoicingResult {
  v: ChordTone[];
  set: number[]; // string indices (0=6th string, 5=1st string)
  fr: number[]; // fret per string in set
  midis: number[];
  span: number;
  inversion: number; // 0=Root, 1=1st, 2=2nd, 3=3rd
}

export interface ScaleDefinition {
  id: string;
  name: string;
  degrees: string;
}

export interface ScaleTone {
  lab: string;
  li: number;
  acc: number;
  pc: number;
}

export type PlaybackStyle = 'manouche' | 'swing' | 'bossa' | 'pop' | 'balada';

export interface StyleConfig {
  name: string;
  swing: boolean;
  target: number; // target pitch center for comping
  tone: number; // lowpass filter cutoff
  description: string;
}

export interface SongTheme {
  id: string;
  nombre: string;
  bpm: number;
  estilo: PlaybackStyle;
  progresion: string;
  actualizado?: string;
}

export interface ParsedChord {
  li: number;
  acc: number;
  q: string;
  tok: string;
  bass?: { li: number; acc: number };
  bad?: boolean;
}

export interface ParsedMeasure {
  chords: ParsedChord[];
  repeat: boolean;
}

export interface TimelineSlot {
  mi: number;
  ci: number;
  beat: number;
  k: number;
  ev: TimelineEvent;
  next?: TimelineEvent;
}

export interface TimelineEvent {
  mi: number;
  ci: number;
  start: number;
  beats: number;
  c: ParsedChord;
  bad?: boolean;
  T?: ChordTone[];
  rootPc?: number;
  bassPc?: number;
  thirdPc?: number;
  fifthPc?: number;
  voi?: VoicingResult | null;
  _pd?: any;
}

export interface PracticeSettings {
  voi: VoicingType | 'base';
  str: 'auto' | 'agudas' | 'medias' | 'graves';
  mel: 'off' | 'arp' | 'scale' | 'guide';
  fig: number; // 1=quarter, 2=eighth, 3=triplets, 4=16ths
  dir: 'up' | 'updown' | 'down';
  turn: string; // '0', '1-1', '2-2', '4-4'
  appr: boolean; // chromatic approach
  mem: boolean; // memory mode (blur diagram)
}

export interface LoopSettings {
  on: boolean;
  a: number; // start measure 1-indexed
  b: number; // end measure 1-indexed
  prog: boolean; // progressive tempo
  step: number; // bpm increment
  max: number; // max bpm
}

export interface MixerVolumes {
  g: number; // rhythm guitar / comping
  b: number; // bass
  d: number; // drums
  m: number; // melody / arpeggio
  c: number; // click metronome
}
