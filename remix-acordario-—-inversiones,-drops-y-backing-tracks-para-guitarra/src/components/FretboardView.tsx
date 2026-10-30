import React, { useState, useEffect } from 'react';
import { ChordTone, LabelMode, NotationStyle, ScaleTone, VoicingResult } from '../types/music';
import { pluckGuitarNote, playNote, getAudioContext } from '../audio/soundEngine';
import { prettyInt, noteName, STANDARD_TUNING } from '../utils/musicTheory';
import { Play, Volume2, Sparkles } from 'lucide-react';

interface FretboardViewProps {
  chordTones: ChordTone[];
  scaleTones: ScaleTone[];
  selectedVoicing: VoicingResult | null;
  labelMode: LabelMode;
  notationStyle: NotationStyle;
  isLeftHanded?: boolean;
  tuning?: number[];
  tuningNames?: string[];
  scaleName?: string;
  chordName?: string;
  activeSoloMidi?: number | null;
  activeSoloNoteName?: string;
}

export const FretboardView: React.FC<FretboardViewProps> = ({
  chordTones,
  scaleTones,
  selectedVoicing,
  labelMode,
  notationStyle,
  isLeftHanded = false,
  tuning = STANDARD_TUNING,
  tuningNames = ['E', 'A', 'D', 'G', 'B', 'E'],
  scaleName = '',
  chordName = '',
  activeSoloMidi = null,
  activeSoloNoteName = '',
}) => {
  const [displayMode, setDisplayMode] = useState<'both' | 'arp' | 'scale'>('both');
  const [activeMidi, setActiveMidi] = useState<number | null>(null);
  const [isPlayingSeq, setIsPlayingSeq] = useState(false);

  // Calculate fret view bounds based on selected voicing
  const fretsFretted = selectedVoicing ? selectedVoicing.fr.filter((f) => f > 0) : [];
  const minFretInVoicing = fretsFretted.length ? Math.min(...fretsFretted) : 0;
  const startFret = Math.max(0, minFretInVoicing - 2);
  const endFret = Math.min(18, Math.max(startFret + 6, 8));
  const numFretsVisible = endFret - Math.max(1, startFret) + 1;

  const L = 46; // Left margin for string names & nut
  const W = 42; // Fret width
  const Y0 = 22; // Top margin
  const DY = 25; // String spacing
  const totalWidth = L + numFretsVisible * W + 20;
  const totalHeight = Y0 + DY * 5 + 34;

  const ys = (st: number) => Y0 + (5 - st) * DY;
  const xs = (f: number) => (f === 0 ? L - 16 : L + (f - Math.max(1, startFret) + 0.5) * W);

  const chordPcMap = new Map<number, ChordTone>();
  chordTones.forEach((t) => chordPcMap.set(t.pc, t));

  const scalePcMap = new Map<number, ScaleTone>();
  scaleTones.forEach((t) => {
    if (!scalePcMap.has(t.pc)) scalePcMap.set(t.pc, t);
  });

  const voicedNotesSet = new Set(
    selectedVoicing
      ? selectedVoicing.set.map((st, i) => `${st}-${selectedVoicing.fr[i]}`)
      : []
  );

  const functionColors: Record<string, string> = {
    root: '#ef4444',
    '3': '#f59e0b',
    '5': '#10b981',
    '7': '#8b5cf6',
    sus: '#64748b',
  };

  // Play sequence of notes (arpeggio or scale)
  const playSequence = (type: 'arp' | 'scale') => {
    if (isPlayingSeq) return;
    setIsPlayingSeq(true);

    const notesToPlay: { midi: number; stringIdx: number; fret: number }[] = [];
    for (let st = 0; st < 6; st++) {
      for (let f = startFret; f <= endFret; f++) {
        const midi = tuning[st] + f;
        const pc = midi % 12;
        const isChord = chordPcMap.has(pc);
        const isScale = scalePcMap.has(pc);

        if (type === 'arp' && isChord) {
          notesToPlay.push({ midi, stringIdx: st, fret: f });
        } else if (type === 'scale' && (isScale || isChord)) {
          notesToPlay.push({ midi, stringIdx: st, fret: f });
        }
      }
    }

    // Sort by ascending pitch
    notesToPlay.sort((a, b) => a.midi - b.midi);
    // Optional pendulum (up and down)
    const seq = notesToPlay.concat(notesToPlay.slice(0, -1).reverse());
    const stepDuration = 0.18;
    const ctx = getAudioContext();
    const t0 = ctx.currentTime + 0.05;

    seq.forEach((item, i) => {
      playNote(item.midi, t0 + i * stepDuration, 0.8, 0.85, ctx.destination, 'g');
      setTimeout(() => {
        setActiveMidi(item.midi);
      }, (i * stepDuration + 0.05) * 1000);
    });

    setTimeout(() => {
      setActiveMidi(null);
      setIsPlayingSeq(false);
    }, (seq.length * stepDuration + 0.25) * 1000);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col gap-4 shadow-xl">
      {/* Header controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
          <h3 className="font-bold text-slate-100 text-sm sm:text-base">
            Diapasón Interactivo: {chordName || 'Acorde'}
          </h3>
          {scaleName && (
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/60 font-medium">
              Escala {scaleName}
            </span>
          )}
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setDisplayMode('both')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
              displayMode === 'both'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Ambos
          </button>
          <button
            onClick={() => setDisplayMode('arp')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
              displayMode === 'arp'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Arpegio
          </button>
          <button
            onClick={() => setDisplayMode('scale')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
              displayMode === 'scale'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Escala
          </button>
        </div>
      </div>

      {/* Interactive Fretboard SVG container */}
      <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-700">
        <svg
          viewBox={`0 0 ${totalWidth} ${totalHeight}`}
          className="w-full min-w-[580px] max-w-full h-auto select-none"
          role="img"
          aria-label="Diapasón con arpegio y escala"
        >
          <defs>
            <linearGradient id="woodFretboard" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1e1b18" />
              <stop offset="50%" stopColor="#25221e" />
              <stop offset="100%" stopColor="#1c1916" />
            </linearGradient>
          </defs>

          {/* Fretboard Wood Base */}
          <rect
            x={L}
            y={Y0}
            width={numFretsVisible * W}
            height={DY * 5}
            rx="4"
            fill="url(#woodFretboard)"
            className="stroke-amber-950/60 stroke-1"
          />

          {/* Fret Markers Inlays (dots on 3, 5, 7, 9, 15, 17 and double dot on 12) */}
          {Array.from({ length: numFretsVisible }).map((_, i) => {
            const f = Math.max(1, startFret) + i;
            const xCenter = xs(f);
            const isSingleDot = [3, 5, 7, 9, 15, 17, 19, 21].includes(f);
            const isDoubleDot = f === 12;

            if (isSingleDot) {
              return (
                <circle
                  key={`inlay-${f}`}
                  cx={xCenter}
                  cy={Y0 + DY * 2.5}
                  r="4"
                  className="fill-slate-600/30"
                />
              );
            }
            if (isDoubleDot) {
              return (
                <g key={`inlay-double-${f}`}>
                  <circle cx={xCenter} cy={Y0 + DY * 1.5} r="3.5" className="fill-amber-400/40" />
                  <circle cx={xCenter} cy={Y0 + DY * 3.5} r="3.5" className="fill-amber-400/40" />
                </g>
              );
            }
            return null;
          })}

          {/* Frets (vertical nickel frets) */}
          {Array.from({ length: numFretsVisible + 1 }).map((_, i) => {
            const isNut = i === 0 && startFret === 0;
            return (
              <line
                key={`fret-line-${i}`}
                x1={L + i * W}
                x2={L + i * W}
                y1={Y0}
                y2={Y0 + DY * 5}
                className={isNut ? 'stroke-amber-200 stroke-[4]' : 'stroke-slate-500/80 stroke-[1.5]'}
              />
            );
          })}

          {/* Strings (horizontal lines with proportional gauges) */}
          {Array.from({ length: 6 }).map((_, st) => {
            const y = ys(st);
            const strokeWidth = 1 + (5 - st) * 0.45; // 6th string thicker than 1st
            return (
              <g key={`string-${st}`}>
                <line
                  x1={startFret === 0 ? L - 24 : L}
                  x2={L + numFretsVisible * W}
                  y1={y}
                  y2={y}
                  strokeWidth={strokeWidth}
                  className="stroke-slate-400/70"
                />
                <text
                  x={12}
                  y={y}
                  className="fill-slate-400 font-bold text-[10px] select-none"
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {tuningNames[st]}
                </text>
              </g>
            );
          })}

          {/* Fret Numbers below the neck */}
          {Array.from({ length: numFretsVisible }).map((_, i) => {
            const f = Math.max(1, startFret) + i;
            const isMarkerFret = [3, 5, 7, 9, 12, 15, 17].includes(f);
            return (
              <text
                key={`fret-num-${f}`}
                x={xs(f)}
                y={Y0 + DY * 5 + 18}
                className={`font-mono text-[10px] select-none ${
                  isMarkerFret ? 'fill-amber-400 font-bold text-[11px]' : 'fill-slate-500'
                }`}
                textAnchor="middle"
              >
                {f}
              </text>
            );
          })}

          {/* Note Dots on the neck */}
          {Array.from({ length: 6 }).map((_, st) => {
            return Array.from({ length: numFretsVisible + (startFret === 0 ? 1 : 0) }).map((_, fi) => {
              const f = startFret === 0 ? fi : startFret + fi;
              if (f > endFret) return null;

              const midi = tuning[st] + f;
              const pc = midi % 12;
              const chordTone = chordPcMap.get(pc);
              const scaleTone = scalePcMap.get(pc);

              const isChord = !!chordTone;
              const isScale = !!scaleTone;
              const isVoiced = voicedNotesSet.has(`${st}-${f}`);
              const isPlucking = activeMidi === midi;

              // Filter according to display mode
              if (displayMode === 'arp' && !isChord) return null;
              if (displayMode === 'scale' && !isScale && !isChord) return null;
              if (displayMode === 'both' && !isChord && !isScale) return null;

              const x = xs(f);
              const y = ys(st);

              let fillColor = '#334155'; // default slate-700
              let label = '';
              let isRoot = false;

              if (isChord) {
                fillColor = functionColors[chordTone.fn] || '#3b82f6';
                label =
                  labelMode === 'int'
                    ? prettyInt(chordTone.lab)
                    : noteName(chordTone.li, chordTone.acc, notationStyle);
                isRoot = chordTone.fn === 'root';
              } else if (isScale) {
                fillColor = scaleTone.lab === '1' ? '#ef4444' : '#1e293b';
                label =
                  labelMode === 'int'
                    ? prettyInt(scaleTone.lab)
                    : noteName(scaleTone.li, scaleTone.acc, notationStyle);
                isRoot = scaleTone.lab === '1';
              }

              return (
                <g
                  key={`dot-${st}-${f}`}
                  className="cursor-pointer transition-transform hover:scale-110"
                  onClick={() => {
                    pluckGuitarNote(midi);
                    setActiveMidi(midi);
                    setTimeout(() => setActiveMidi(null), 350);
                  }}
                >
                  {/* Active solo note from auto-improviser */}
                  {(activeSoloMidi === midi || (activeSoloMidi !== null && activeSoloMidi % 12 === pc && isChord)) && (
                    <circle
                      cx={x}
                      cy={y}
                      r="16"
                      className="fill-amber-400/20 stroke-amber-400 stroke-[3] animate-pulse"
                    />
                  )}

                  {/* Outer ring for voicing note */}
                  {isVoiced && (
                    <circle
                      cx={x}
                      cy={y}
                      r="13"
                      className="fill-none stroke-amber-300 stroke-[2.2] animate-pulse"
                    />
                  )}

                  {/* Active plucked feedback ring */}
                  {isPlucking && (
                    <circle
                      cx={x}
                      cy={y}
                      r="15"
                      className="fill-none stroke-cyan-400 stroke-[3] animate-ping"
                    />
                  )}

                  {/* Main note badge */}
                  <circle
                    cx={x}
                    cy={y}
                    r={isVoiced ? '9.5' : '8.5'}
                    fill={fillColor}
                    className={`stroke-slate-950 stroke-[1.2] shadow-sm ${
                      !isChord && isScale ? 'stroke-slate-400 stroke-1' : ''
                    }`}
                  />

                  {/* Note/Degree Label */}
                  <text
                    x={x}
                    y={y}
                    className="fill-white font-sans font-bold text-[8px] select-none pointer-events-none"
                    textAnchor="middle"
                    dominantBaseline="central"
                  >
                    {label}
                  </text>
                </g>
              );
            });
          })}
        </svg>
      </div>

      {/* Footer controls & legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 border-t border-slate-800/80 pt-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => playSequence('arp')}
            disabled={isPlayingSeq}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Arpegio</span>
          </button>
          <button
            onClick={() => playSequence('scale')}
            disabled={isPlayingSeq}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold border border-slate-700 transition disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Escala</span>
          </button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
            <span>Fundamental</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
            <span>3ª</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
            <span>5ª</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-violet-500 inline-block" />
            <span>7ª / 6ª</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full border-2 border-amber-300 inline-block" />
            <span>Tu Voicing</span>
          </div>
        </div>
      </div>
    </div>
  );
};
