import { ChordTone, VoicingResult, VoicingType } from '../types/music';
import { STANDARD_TUNING } from './musicTheory';

export const INVERSION_NAMES = ['Fundamental', '1ª inversión', '2ª inversión', '3ª inversión'];

export interface VoicingTypeDef {
  id: VoicingType;
  name: string;
  desc: string;
  disabled?: boolean;
}

export const TYPES_4_VOICES: VoicingTypeDef[] = [
  {
    id: 'drop2',
    name: 'Drop 2',
    desc: 'Se baja una octava la 2ª voz desde arriba de la posición cerrada. Es la disposición predilecta en guitarra jazz por su sonido equilibrado y digitación compacta.',
  },
  {
    id: 'drop3',
    name: 'Drop 3',
    desc: 'Se baja una octava la 3ª voz desde arriba. Deja una cuerda libre entre el bajo y las voces superiores: ideal con bajo en 6ª o 5ª cuerda.',
  },
  {
    id: 'drop24',
    name: 'Drop 2 y 4',
    desc: 'Se bajan una octava la 2ª y la 4ª voz desde arriba. Amplitud sonora majestuosa, excelente para chord-melody y pasajes orquestales.',
  },
  {
    id: 'closed',
    name: 'Cerrado',
    desc: 'Todas las notas del acorde agrupadas dentro de una sola octava en 4 cuerdas adyacentes.',
  },
];

export const TYPES_3_VOICES: VoicingTypeDef[] = [
  {
    id: 'closed',
    name: 'Tríada Cerrada',
    desc: 'Tríada en posición cerrada sobre 3 cuerdas contiguas (cuerdas 1-2-3, 2-3-4, 3-4-5 o 4-5-6).',
  },
  {
    id: 'drop2',
    name: 'Tríada Abierta (Spread / Drop 2)',
    desc: 'Se baja una octava la voz intermedia. Abre la sonoridad separando el bajo del registro agudo.',
  },
  {
    id: 'drop3',
    name: 'Drop 3',
    desc: 'Solo disponible para acordes de 4 notas.',
    disabled: true,
  },
  {
    id: 'drop24',
    name: 'Drop 2 y 4',
    desc: 'Solo disponible para acordes de 4 notas.',
    disabled: true,
  },
];

export const STRING_SETS_CONFIG = {
  4: {
    drop2: [
      { name: 'Cuerdas 4·3·2·1 (Agudas)', sets: [[2, 3, 4, 5]] },
      { name: 'Cuerdas 5·4·3·2 (Medias)', sets: [[1, 2, 3, 4]] },
      { name: 'Cuerdas 6·5·4·3 (Graves)', sets: [[0, 1, 2, 3]] },
    ],
    drop3: [
      { name: 'Bajo en 5ª cuerda (5·3·2·1)', sets: [[1, 3, 4, 5]] },
      { name: 'Bajo en 6ª cuerda (6·4·3·2)', sets: [[0, 2, 3, 4]] },
    ],
    drop24: [
      { name: 'Bajo en 5ª cuerda (5·4·2·1)', sets: [[1, 2, 4, 5]] },
      { name: 'Bajo en 6ª cuerda (6·5·3·2)', sets: [[0, 1, 3, 4]] },
    ],
    closed: [
      { name: 'Cuerdas 4·3·2·1', sets: [[2, 3, 4, 5]] },
      { name: 'Cuerdas 5·4·3·2', sets: [[1, 2, 3, 4]] },
      { name: 'Cuerdas 6·5·4·3', sets: [[0, 1, 2, 3]] },
    ],
  },
  3: {
    closed: [
      { name: 'Cuerdas 1·2·3 (Agudas)', sets: [[3, 4, 5]] },
      { name: 'Cuerdas 2·3·4 (Medias-Altas)', sets: [[2, 3, 4]] },
      { name: 'Cuerdas 3·4·5 (Medias-Bajas)', sets: [[1, 2, 3]] },
      { name: 'Cuerdas 4·5·6 (Graves)', sets: [[0, 1, 2]] },
    ],
    drop2: [
      { name: 'Agudas abiertas', sets: [[2, 3, 5], [2, 4, 5]] },
      { name: 'Medias abiertas', sets: [[1, 2, 4], [1, 3, 4]] },
      { name: 'Graves abiertas', sets: [[0, 1, 3], [0, 2, 3]] },
    ],
  },
};

/**
 * Builds closed position voicing notes from tones and root pitch
 */
export function closedVoicing(tones: ChordTone[], inversionIndex: number): ChordTone[] {
  const baseMidi = 48 + tones[0].pc; // C3 region
  const rotated = tones.slice(inversionIndex).concat(tones.slice(0, inversionIndex));
  let prevPitch = -999;
  return rotated.map((t) => {
    let p = baseMidi + t.semi;
    while (p <= prevPitch) {
      p += 12;
    }
    prevPitch = p;
    return { ...t, p };
  });
}

/**
 * Generates specific voicing by dropping notes an octave
 */
export function buildVoicing(
  tones: ChordTone[],
  inversionIndex: number,
  type: VoicingType
): ChordTone[] {
  const v = closedVoicing(tones, inversionIndex).sort((a, b) => (a.p || 0) - (b.p || 0));
  const n = v.length;

  const dropIndices: number[] =
    type === 'drop2'
      ? [n - 2]
      : type === 'drop3'
      ? [n - 3]
      : type === 'drop24'
      ? [n - 2, n - 4]
      : [];

  dropIndices.forEach((idx) => {
    if (idx >= 0 && idx < n) {
      v[idx] = { ...v[idx], p: (v[idx].p || 0) - 12 };
    }
  });

  return v.sort((a, b) => (a.p || 0) - (b.p || 0));
}

/**
 * Fits a voicing onto a specific guitar string set across the fretboard
 */
export function fitVoicingOnStrings(
  voicing: ChordTone[],
  stringSet: number[],
  tuning: number[] = STANDARD_TUNING,
  maxFret: number = 16
): { fr: number[]; span: number; mx: number; midis: number[] } | null {
  for (let shift = -36; shift <= 36; shift += 12) {
    const frets = voicing.map((x, i) => (x.p || 0) + shift - tuning[stringSet[i]]);
    if (frets.some((f) => f < 0 || f > maxFret)) continue;

    const fretted = frets.filter((f) => f > 0);
    const mx = Math.max(...frets);
    const mn = fretted.length ? Math.min(...fretted) : 0;

    // Guitarist ergonomics: fret span should ideally be <= 4 frets
    if (fretted.length && mx - mn > 4) continue;
    if (frets.includes(0) && mx > 4) continue;

    const midis = frets.map((f, i) => tuning[stringSet[i]] + f);
    return {
      fr: frets,
      span: fretted.length ? mx - mn : 0,
      mx,
      midis,
    };
  }
  return null;
}

/**
 * Generate all voicings and find best grip for each inversion on string groups
 */
export function generateRowVoicings(
  tones: ChordTone[],
  type: VoicingType,
  tuning: number[] = STANDARD_TUNING
): {
  title: string;
  cards: (VoicingResult | null)[];
}[] {
  const n = tones.length;
  const config = (n === 3 ? (STRING_SETS_CONFIG[3] as any)[type] : (STRING_SETS_CONFIG[4] as any)[type]) || [];

  return config.map((rowConfig: { name: string; sets: number[][] }) => {
    const cards: (VoicingResult | null)[] = [];

    for (let inv = 0; inv < n; inv++) {
      const v = buildVoicing(tones, inv, type);
      const bassIndex = v[0].idx;

      let bestFit: {
        set: number[];
        fr: number[];
        span: number;
        mx: number;
        midis: number[];
      } | null = null;

      for (const set of rowConfig.sets) {
        if (set.length !== v.length) continue;
        const fit = fitVoicingOnStrings(v, set, tuning);
        if (
          fit &&
          (!bestFit ||
            fit.span < bestFit.span ||
            (fit.span === bestFit.span && fit.mx < bestFit.mx))
        ) {
          bestFit = { set, ...fit };
        }
      }

      if (bestFit) {
        const fit: {
          set: number[];
          fr: number[];
          span: number;
          mx: number;
          midis: number[];
        } = bestFit;
        cards[bassIndex] = {
          v,
          set: fit.set,
          fr: fit.fr,
          midis: fit.midis,
          span: fit.span,
          inversion: bassIndex,
        };
      } else {
        cards[bassIndex] = null;
      }
    }

    return {
      title: rowConfig.name,
      cards,
    };
  });
}
