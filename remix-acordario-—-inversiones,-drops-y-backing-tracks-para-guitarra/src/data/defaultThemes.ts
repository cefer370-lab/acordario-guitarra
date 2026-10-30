import { SongTheme, StyleConfig } from '../types/music';

export const PLAYBACK_STYLES: Record<string, StyleConfig> = {
  manouche: {
    name: 'Pompe Manouche (Gypsy Jazz)',
    swing: true,
    target: 57,
    tone: 5200,
    description: 'Choc percusivo en 2 y 4 ("la pompe"), contrabajo acentuado en 1 y 3, sonoridad acústica gypsy jazz.',
  },
  swing: {
    name: 'Swing 4/4 (Freddie Green & Walking Bass)',
    swing: true,
    target: 51,
    tone: 3600,
    description: 'Platillo ride con swing tradicional, línea de walking bass melódica y acordes de 3 notas con voice leading.',
  },
  bossa: {
    name: 'Bossa Nova (João Gilberto Style)',
    swing: false,
    target: 59,
    tone: 2600,
    description: 'Clave brasileña en aro y shaker, síncopas suaves de guitarra de nylon y bajo suave.',
  },
  pop: {
    name: 'Pop / Acústico (Strumming & Grooving)',
    swing: false,
    target: 56,
    tone: 4200,
    description: 'Rasgueo rítmico en corcheas con bombo a tierra, redoblante y bajo eléctrico dinámico.',
  },
  balada: {
    name: 'Balada Arpegiada (Lush Fingerstyle)',
    swing: false,
    target: 58,
    tone: 3000,
    description: 'Arpegio suave en cuerdas de nylon/acero, escobillas en redoblante y atmósfera íntima.',
  },
};

export const DEFAULT_THEMES: SongTheme[] = [
  {
    id: 'p0',
    nombre: "I Can't Give You Anything But Love",
    bpm: 160,
    estilo: 'manouche',
    progresion: `G | G/B Bb° | Am7 | D7
G | G/B Bb° | Am7 | D7
G7 | % | C | %
A7 | % | D7 | %

G | G/B Bb° | Am7 | D7
G7 | % | C | %
C | C#° | G/D | E7
Am7 | D7 | G E7 | Am7 D7`,
  },
  {
    id: 'p1',
    nombre: 'Minor Swing (Django Reinhardt)',
    bpm: 175,
    estilo: 'manouche',
    progresion: `Am6 | % | Dm6 | %
E7 | % | Am6 | %
Dm6 | % | Am6 | %
E7 | % | Am6 | %`,
  },
  {
    id: 'p2',
    nombre: 'Autumn Leaves (Les Feuilles Mortes)',
    bpm: 135,
    estilo: 'swing',
    progresion: `Cm7 | F7 | Bbmaj7 | Ebmaj7
Am7b5 | D7 | Gm | %
Cm7 | F7 | Bbmaj7 | Ebmaj7
Am7b5 | D7 | Gm | %

Am7b5 | D7 | Gm | %
Cm7 | F7 | Bbmaj7 | Ebmaj7
Am7b5 | D7 | Gm7 C7 | Fm7 Bb7
Ebmaj7 | Am7b5 D7 | Gm | %`,
  },
  {
    id: 'p3',
    nombre: 'Blue Bossa (Kenny Dorham)',
    bpm: 140,
    estilo: 'bossa',
    progresion: `Cm7 | % | Fm7 | %
Dm7b5 | G7 | Cm7 | %
Ebm7 | Ab7 | Dbmaj7 | %
Dm7b5 | G7 | Cm7 | Dm7b5 G7`,
  },
  {
    id: 'p4',
    nombre: 'All of Me (Simons & Marks)',
    bpm: 155,
    estilo: 'swing',
    progresion: `Cmaj7 | % | E7 | %
A7 | % | Dm7 | %
E7 | % | Am7 | %
D7 | % | Dm7 | G7

Cmaj7 | % | E7 | %
A7 | % | Dm7 | %
Fmaj7 | Fm6 | Cmaj7 Em7 | A7
Dm7 | G7 | C6 | Dm7 G7`,
  },
  {
    id: 'p5',
    nombre: 'Blues en F (Jazz Blues estándar)',
    bpm: 126,
    estilo: 'swing',
    progresion: `F7 | Bb7 | F7 | Cm7 F7
Bb7 | Bdim7 | F7 | Am7 D7
Gm7 | C7 | F7 D7 | Gm7 C7`,
  },
  {
    id: 'p6',
    nombre: 'ii–V–I menor (Re menor)',
    bpm: 130,
    estilo: 'bossa',
    progresion: `Dm7 | % | Em7b5 A7 | Dm7
Gm7 | C7 | Fmaj7 | Em7b5 A7`,
  },
  {
    id: 'p7',
    nombre: 'Rhythm Changes en Bb (Sección A)',
    bpm: 190,
    estilo: 'manouche',
    progresion: `Bb G7 | Cm7 F7 | Bb G7 | Cm7 F7
Fm7 Bb7 | Eb Ebm6 | Dm7 G7 | Cm7 F7`,
  },
  {
    id: 'p8',
    nombre: 'Pop I–V–vi–IV (Eje de 4 acordes)',
    bpm: 104,
    estilo: 'pop',
    progresion: `C | G | Am | F
C | G | Am | F`,
  },
  {
    id: 'p9',
    nombre: 'Balada en Do (Standard Jazz Ballad)',
    bpm: 72,
    estilo: 'balada',
    progresion: `Cmaj7 | Am7 | Dm7 | G7
Em7 | A7 | Dm7 | G7sus4 G7
Cmaj7 | Gm7 C7 | Fmaj7 | Fm6
Em7 A7 | Dm7 G7 | Cmaj7 | %`,
  },
];
