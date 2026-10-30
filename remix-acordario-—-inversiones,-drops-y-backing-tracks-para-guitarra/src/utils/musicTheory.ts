import { ChordTone, ChordType, NotationStyle, ParsedChord, ScaleDefinition, ScaleTone } from '../types/music';
import { DEFAULT_CHORD_TYPES, SCALES } from '../data/defaultChords';

export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
export const NAT = [0, 2, 4, 5, 7, 9, 11] as const;
export const LATIN: Record<string, string> = {
  C: 'Do',
  D: 'Re',
  E: 'Mi',
  F: 'Fa',
  G: 'Sol',
  A: 'La',
  B: 'Si',
};

// Open string MIDI pitches (string 6 to 1, E2 to E4)
export const STANDARD_TUNING = [40, 45, 50, 55, 59, 64]; // E2, A2, D3, G3, B3, E4
export const TUNINGS: Record<string, { name: string; midis: number[]; names: string[] }> = {
  standard: { name: 'Estándar (E A D G B E)', midis: [40, 45, 50, 55, 59, 64], names: ['E', 'A', 'D', 'G', 'B', 'E'] },
  dropD: { name: 'Drop D (D A D G B E)', midis: [38, 45, 50, 55, 59, 64], names: ['D', 'A', 'D', 'G', 'B', 'E'] },
  dadgad: { name: 'DADGAD (D A D G A D)', midis: [38, 45, 50, 55, 57, 62], names: ['D', 'A', 'D', 'G', 'A', 'D'] },
  halfStepDown: { name: 'Medio tono abajo (Eb Ab Db Gb Bb Eb)', midis: [39, 44, 49, 54, 58, 63], names: ['Eb', 'Ab', 'Db', 'Gb', 'Bb', 'Eb'] },
  openD: { name: 'Open D (D A D F# A D)', midis: [38, 45, 50, 54, 57, 62], names: ['D', 'A', 'D', 'F#', 'A', 'D'] },
  openG: { name: 'Open G (D G D G B D)', midis: [38, 43, 50, 55, 59, 62], names: ['D', 'G', 'D', 'G', 'B', 'D'] },
};

export const DEG_SEMI: Record<number, number> = {
  1: 0,
  2: 2,
  3: 4,
  4: 5,
  5: 7,
  6: 9,
  7: 11,
};

export const ROOTS: [string, number][] = [
  ['C', 0],
  ['C', 1],
  ['D', -1],
  ['D', 0],
  ['D', 1],
  ['E', -1],
  ['E', 0],
  ['F', 0],
  ['F', 1],
  ['G', -1],
  ['G', 0],
  ['G', 1],
  ['A', -1],
  ['A', 0],
  ['A', 1],
  ['B', -1],
  ['B', 0],
];

export const ROOT_NAMES_12 = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

export function accStr(a: number): string {
  if (a === 0) return '';
  if (a === 1) return '♯';
  if (a === -1) return '♭';
  if (a === 2) return '𝄪';
  if (a === -2) return '𝄫';
  return '';
}

export function accAscii(a: number): string {
  if (a === 1) return '#';
  if (a === -1) return 'b';
  return '';
}

export function noteName(li: number, acc: number, style: NotationStyle = 'anglo'): string {
  const letter = LETTERS[li];
  const base = style === 'latin' ? LATIN[letter] : letter;
  return base + accStr(acc);
}

export function fnOf(label: string): 'root' | '3' | '5' | '7' | 'sus' {
  if (label === 'R' || label === '1') return 'root';
  if (/^(b?3|#3)$/.test(label)) return '3';
  if (/5$/.test(label)) return '5';
  if (/(7|6|bb7)$/.test(label)) return '7';
  return 'sus';
}

export function prettyInt(label: string): string {
  return label.replace('bb', '𝄫').replace('b', '♭').replace('#', '♯');
}

export function parseChordInput(str: string, chordTypes: ChordType[] = DEFAULT_CHORD_TYPES): ParsedChord | null {
  let s = str.trim().replace(/♯/g, '#').replace(/♭/g, 'b').replace(/\s+/g, '');
  if (!s) return null;

  // Check for slash bass (e.g. G/B, Cmaj7/E)
  let slashBass: { li: number; acc: number } | undefined;
  if (s.includes('/')) {
    const parts = s.split('/');
    if (parts.length > 2) return null;
    s = parts[0];
    const bassParsed = parseChordInput(parts[1], chordTypes);
    if (!bassParsed) return null;
    slashBass = { li: bassParsed.li, acc: bassParsed.acc };
  }

  let li = -1;
  const lat = s.match(/^(do|re|mi|fa|sol|la|si)/i);
  if (lat) {
    const k = lat[1].toLowerCase();
    li = ['do', 're', 'mi', 'fa', 'sol', 'la', 'si'].indexOf(k);
    s = s.slice(lat[1].length);
  } else {
    const m = s.match(/^[A-Ga-g]/);
    if (m) {
      li = LETTERS.indexOf(m[0].toUpperCase() as any);
      s = s.slice(1);
    } else {
      return null;
    }
  }

  let acc = 0;
  if (s[0] === '#') {
    acc = 1;
    s = s.slice(1);
  } else if (s[0] === 'b' && !/^b5/.test(s)) {
    acc = -1;
    s = s.slice(1);
  }

  // Match chord quality
  let q = chordTypes.find((x) => x.aliases.includes(s));
  if (!q) {
    q = chordTypes.find((x) =>
      x.aliases.some((a) => a.length >= 1 && a.toLowerCase() === s.toLowerCase())
    );
  }
  if (!q && s === '') {
    q = chordTypes.find((x) => x.id === 'maj' || x.id === '');
  }

  if (!q) return null;

  return {
    li,
    acc,
    q: q.id,
    tok: str,
    bass: slashBass,
  };
}

export function getChordTones(li0: number, acc0: number, q: ChordType): ChordTone[] {
  const rootPc = (NAT[li0] + acc0 + 120) % 12;
  return q.tones.map(([semi, deg, lab], i) => {
    const L = (li0 + deg - 1) % 7;
    const tpc = (rootPc + semi) % 12;
    let a = (((tpc - NAT[L]) % 12) + 18) % 12 - 6;
    return {
      semi,
      lab,
      idx: i,
      fn: fnOf(lab),
      li: L,
      acc: a,
      pc: tpc,
    };
  });
}

export function getScaleTones(li0: number, acc0: number, degreesStr: string): ScaleTone[] {
  const rootPc = (NAT[li0] + acc0 + 120) % 12;
  return degreesStr
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => {
      const m = x.match(/^(bb|b|##|#)?(\d)$/);
      if (!m) return null;
      const deg = parseInt(m[2], 10);
      const acc = { bb: -2, b: -1, '#': 1, '##': 2 }[m[1] as string] || 0;
      const baseSemi = DEG_SEMI[deg] ?? 0;
      const pc = (rootPc + baseSemi + acc + 120) % 12;
      const L = (li0 + deg - 1) % 7;
      return {
        lab: x,
        li: L,
        acc: (((pc - NAT[L]) % 12) + 18) % 12 - 6,
        pc,
      };
    })
    .filter((t): t is ScaleTone => t !== null);
}

export function getDefaultScaleForChord(q: ChordType): string {
  if (q.scale && SCALES.some((s) => s.id === q.scale)) return q.scale;
  if (q.tones.some((t) => t[2] === 'b3')) return 'eolica';
  return 'mayor';
}

export function transposeChordToken(tok: string, semitones: number): string {
  return tok
    .split('/')
    .map((part) => {
      const m = part.match(/^(do|re|mi|fa|sol|la|si|[A-Ga-g])(#|♯|♭|b(?!5))?(.*)$/i);
      if (!m) return part;
      const L = m[1].toLowerCase();
      const li = L.length > 1 ? ['do', 're', 'mi', 'fa', 'sol', 'la', 'si'].indexOf(L) : LETTERS.indexOf(L.toUpperCase() as any);
      const acc = m[2] ? (/[#♯]/.test(m[2]) ? 1 : -1) : 0;
      const newPc = (NAT[li] + acc + semitones + 120) % 12;
      return ROOT_NAMES_12[newPc] + m[3];
    })
    .join('/');
}

export function transposeProgressionText(text: string, semitones: number): string {
  return text.replace(/[^\s|]+/g, (tok) => (tok === '%' ? tok : transposeChordToken(tok, semitones)));
}
