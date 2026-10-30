import React, { useState, useMemo } from 'react';
import { ChordType, LabelMode, NotationStyle, VoicingResult, VoicingType } from '../types/music';
import { DEFAULT_CHORD_TYPES, SCALES } from '../data/defaultChords';
import {
  ROOTS,
  getChordTones,
  getScaleTones,
  noteName,
  parseChordInput,
  prettyInt,
  STANDARD_TUNING,
} from '../utils/musicTheory';
import {
  TYPES_3_VOICES,
  TYPES_4_VOICES,
  INVERSION_NAMES,
  generateRowVoicings,
} from '../utils/voicingEngine';
import { ChordDiagram } from './ChordDiagram';
import { FretboardView } from './FretboardView';
import { previewVoicing } from '../audio/soundEngine';
import { Play, Volume2, Info, ChevronRight, Music } from 'lucide-react';

interface ChordExplorerProps {
  labelMode: LabelMode;
  notationStyle: NotationStyle;
  isLeftHanded?: boolean;
  tuning?: number[];
  tuningNames?: string[];
  chordTypes?: ChordType[];
  initialChord?: string;
  onSelectChordForBackingTrack?: (chordTok: string) => void;
}

export const ChordExplorer: React.FC<ChordExplorerProps> = ({
  labelMode,
  notationStyle,
  isLeftHanded = false,
  tuning = STANDARD_TUNING,
  tuningNames = ['E', 'A', 'D', 'G', 'B', 'E'],
  chordTypes = DEFAULT_CHORD_TYPES,
  initialChord = 'Cmaj7',
  onSelectChordForBackingTrack,
}) => {
  const [rootLi, setRootLi] = useState<number>(0); // C
  const [rootAcc, setRootAcc] = useState<number>(0); // natural
  const [selectedQualityId, setSelectedQualityId] = useState<string>('maj7');
  const [voicingType, setVoicingType] = useState<VoicingType>('drop2');
  const [selectedVoicing, setSelectedVoicing] = useState<VoicingResult | null>(null);
  const [inputChordText, setInputChordText] = useState<string>(initialChord);
  const [parseError, setParseError] = useState<string>('');

  const currentQuality = useMemo(() => {
    return (
      chordTypes.find((q) => q.id === selectedQualityId) ||
      chordTypes[0] ||
      DEFAULT_CHORD_TYPES[0]
    );
  }, [chordTypes, selectedQualityId]);

  const chordTones = useMemo(() => {
    return getChordTones(rootLi, rootAcc, currentQuality);
  }, [rootLi, rootAcc, currentQuality]);

  const numVoices = chordTones.length;
  const availableVoicingTypes = numVoices === 3 ? TYPES_3_VOICES : TYPES_4_VOICES;

  const currentVoicingTypeDef = useMemo(() => {
    return (
      availableVoicingTypes.find((t) => t.id === voicingType && !t.disabled) ||
      availableVoicingTypes[0]
    );
  }, [availableVoicingTypes, voicingType]);

  const activeScaleDef = useMemo(() => {
    const scaleId = currentQuality.scale || 'mayor';
    return SCALES.find((s) => s.id === scaleId) || SCALES[0];
  }, [currentQuality]);

  const scaleTones = useMemo(() => {
    return getScaleTones(rootLi, rootAcc, activeScaleDef.degrees);
  }, [rootLi, rootAcc, activeScaleDef]);

  const voicingRows = useMemo(() => {
    return generateRowVoicings(chordTones, currentVoicingTypeDef.id, tuning);
  }, [chordTones, currentVoicingTypeDef, tuning]);

  // Handle direct text typing in input
  const handleInputChange = (text: string) => {
    setInputChordText(text);
    if (!text.trim()) {
      setParseError('');
      return;
    }
    const parsed = parseChordInput(text, chordTypes);
    if (!parsed) {
      setParseError('No reconozco ese acorde. Ejemplos: Cmaj7, F#m7, Bb7, Solm7b5, Dm7b5, A°7');
      return;
    }
    setParseError('');
    setRootLi(parsed.li);
    setRootAcc(parsed.acc);
    setSelectedQualityId(parsed.q);
  };

  const handleSelectRoot = (li: number, acc: number) => {
    setRootLi(li);
    setRootAcc(acc);
    const newName = noteName(li, acc, notationStyle) + currentQuality.name;
    setInputChordText(newName);
    setParseError('');
  };

  const handleSelectQuality = (qId: string) => {
    setSelectedQualityId(qId);
    const targetQ = chordTypes.find((q) => q.id === qId) || DEFAULT_CHORD_TYPES[0];
    const newName = noteName(rootLi, rootAcc, notationStyle) + targetQ.name;
    setInputChordText(newName);
    setParseError('');
  };

  const fullChordName = noteName(rootLi, rootAcc, notationStyle) + currentQuality.name;

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full">
      {/* Search and chip selectors */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col gap-4 shadow-lg backdrop-blur">
        {/* Chord Input */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1">
            <input
              type="text"
              value={inputChordText}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Buscar acorde (ej: Cmaj7, F#m7b5, Eb7, G/B)..."
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-3 text-lg font-bold text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-400 transition"
            />
            {parseError && (
              <p className="text-xs text-rose-400 mt-1 font-medium pl-1">{parseError}</p>
            )}
          </div>

          {onSelectChordForBackingTrack && (
            <button
              onClick={() => onSelectChordForBackingTrack(fullChordName)}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold border border-amber-500/20 transition text-sm whitespace-nowrap"
            >
              <Music className="w-4 h-4" />
              <span>Usar en Backing Track</span>
            </button>
          )}
        </div>

        {/* Root note chips */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Nota Raíz
          </span>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-800">
            {ROOTS.map(([letter, acc], idx) => {
              const li = ['C', 'D', 'E', 'F', 'G', 'A', 'B'].indexOf(letter);
              const isSelected = rootLi === li && rootAcc === acc;
              const name = noteName(li, acc, notationStyle);
              return (
                <button
                  key={`root-${idx}`}
                  onClick={() => handleSelectRoot(li, acc)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 shadow-md scale-105'
                      : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                  }`}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Chord quality chips */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Tipo de Acorde
          </span>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-800">
            {chordTypes.map((q) => {
              const isSelected = selectedQualityId === q.id;
              return (
                <button
                  key={`qual-${q.id}`}
                  onClick={() => handleSelectQuality(q.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-md scale-105'
                      : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                  }`}
                >
                  {q.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Chord Sheet header: big title, formula, voicing selection */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4 shadow-lg">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div className="flex items-baseline gap-3">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-100 font-display">
              {fullChordName}
            </h1>
            <span className="text-sm font-medium text-slate-400">
              {currentQuality.label}
            </span>
          </div>

          {/* Tone formula chips */}
          <div className="flex flex-wrap items-center gap-2">
            {chordTones.map((tone, i) => {
              const colors: Record<string, string> = {
                root: 'bg-red-500/20 text-red-300 border-red-500/40',
                '3': 'bg-amber-500/20 text-amber-300 border-amber-500/40',
                '5': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
                '7': 'bg-violet-500/20 text-violet-300 border-violet-500/40',
                sus: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
              };
              return (
                <div
                  key={`formula-${i}`}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-mono font-bold ${
                    colors[tone.fn] || 'bg-slate-800 text-slate-300'
                  }`}
                >
                  <span>{prettyInt(tone.lab)}</span>
                  <span className="text-slate-400 font-sans font-medium text-[11px]">
                    ({noteName(tone.li, tone.acc, notationStyle)})
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Voicing selection tabs and description */}
        <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {availableVoicingTypes.map((typeDef) => {
              const isSelected = currentVoicingTypeDef.id === typeDef.id;
              return (
                <button
                  key={`type-${typeDef.id}`}
                  disabled={typeDef.disabled}
                  onClick={() => setVoicingType(typeDef.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 font-bold shadow'
                      : typeDef.disabled
                      ? 'bg-slate-950 text-slate-600 cursor-not-allowed border border-slate-800/40'
                      : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  {typeDef.name}
                </button>
              );
            })}
          </div>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            {currentVoicingTypeDef.desc}
          </p>
        </div>
      </div>

      {/* Voicing cards grid by string groups */}
      <div className="flex flex-col gap-6">
        {voicingRows.map((row, rowIdx) => (
          <div key={`row-${rowIdx}`} className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {row.title}
              </h3>
              <div className="flex-1 h-px bg-slate-800" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {row.cards.map((card, invIdx) => {
                if (!card) {
                  return (
                    <div
                      key={`card-empty-${invIdx}`}
                      className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-3 flex flex-col items-center justify-center min-h-[170px] text-center text-slate-600 text-xs"
                    >
                      <span className="font-semibold text-slate-500 mb-1">
                        {INVERSION_NAMES[invIdx]}
                      </span>
                      <span>Sin digitación cómoda en este registro</span>
                    </div>
                  );
                }

                const isSelected = selectedVoicing === card;
                const bassTone = chordTones[card.inversion];
                const tabString = [0, 1, 2, 3, 4, 5]
                  .map((st) => {
                    const idx = card.set.indexOf(st);
                    return idx < 0 ? 'x' : card.fr[idx];
                  })
                  .join('-');

                return (
                  <div
                    key={`card-${invIdx}`}
                    onClick={() => {
                      previewVoicing(card, false);
                      setSelectedVoicing(card);
                    }}
                    className={`group bg-slate-900 border rounded-xl p-3 flex flex-col gap-2 cursor-pointer transition-all hover:-translate-y-1 ${
                      isSelected
                        ? 'border-amber-400 ring-2 ring-amber-400/20 shadow-lg bg-slate-900/90'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="font-bold text-slate-200">
                        {INVERSION_NAMES[card.inversion]}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        bajo {noteName(bassTone.li, bassTone.acc, notationStyle)}
                      </span>
                    </div>

                    <div className="w-full">
                      <ChordDiagram
                        voicing={card.v}
                        stringSet={card.set}
                        frets={card.fr}
                        labelMode={labelMode}
                        notationStyle={notationStyle}
                        isLeftHanded={isLeftHanded}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/60 font-mono text-slate-400">
                      <span className="text-[11px]">{tabString}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          previewVoicing(card, true);
                          setSelectedVoicing(card);
                        }}
                        className="text-amber-400 hover:text-amber-300 text-[10px] font-sans font-bold flex items-center gap-1"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Arpegio</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Interactive Fretboard Details */}
      <FretboardView
        chordTones={chordTones}
        scaleTones={scaleTones}
        selectedVoicing={selectedVoicing}
        labelMode={labelMode}
        notationStyle={notationStyle}
        isLeftHanded={isLeftHanded}
        tuning={tuning}
        tuningNames={tuningNames}
        chordName={fullChordName}
        scaleName={activeScaleDef.name}
      />
    </div>
  );
};
