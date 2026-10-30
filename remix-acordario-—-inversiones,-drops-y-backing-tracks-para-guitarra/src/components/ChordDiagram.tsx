import React from 'react';
import { ChordTone, LabelMode, NotationStyle } from '../types/music';
import { prettyInt, noteName } from '../utils/musicTheory';

interface ChordDiagramProps {
  voicing: ChordTone[];
  stringSet: number[]; // string indices [0..5]
  frets: number[]; // fret per string in stringSet
  labelMode: LabelMode;
  notationStyle: NotationStyle;
  isLeftHanded?: boolean;
}

export const ChordDiagram: React.FC<ChordDiagramProps> = ({
  voicing,
  stringSet,
  frets,
  labelMode,
  notationStyle,
  isLeftHanded = false,
}) => {
  const fretted = frets.filter((f) => f > 0);
  const maxFret = Math.max(...frets, 0);
  const minFret = fretted.length ? Math.min(...fretted) : 1;
  const startFret = maxFret <= 5 ? 1 : minFret;

  const X0 = 24;
  const DX = 15;
  const Y0 = 24;
  const DY = 20;
  const NUM_FRETS = 5;

  const functionColors: Record<string, string> = {
    root: '#ef4444', // Red-500
    '3': '#f59e0b', // Amber-500
    '5': '#10b981', // Emerald-500
    '7': '#8b5cf6', // Violet-500
    sus: '#64748b', // Slate-500
  };

  return (
    <svg
      viewBox="0 0 120 144"
      className="w-full h-auto select-none"
      role="img"
      aria-label="Diagrama de acorde"
    >
      {/* Fretboard background */}
      <rect
        x={X0}
        y={Y0}
        width={DX * 5}
        height={DY * NUM_FRETS}
        className="fill-slate-900/80 stroke-slate-800"
      />

      {/* Frets (horizontal lines) */}
      {Array.from({ length: NUM_FRETS + 1 }).map((_, i) => {
        const isNut = i === 0 && startFret === 1;
        return (
          <line
            key={`fret-${i}`}
            x1={X0}
            x2={X0 + DX * 5}
            y1={Y0 + i * DY}
            y2={Y0 + i * DY}
            className={isNut ? 'stroke-slate-200 stroke-[3]' : 'stroke-slate-700 stroke-[1.2]'}
          />
        );
      })}

      {/* Strings (vertical lines) */}
      {Array.from({ length: 6 }).map((_, s) => {
        const xPos = isLeftHanded ? X0 + (5 - s) * DX : X0 + s * DX;
        return (
          <line
            key={`str-${s}`}
            x1={xPos}
            x2={xPos}
            y1={Y0}
            y2={Y0 + DY * NUM_FRETS}
            className="stroke-slate-600/70 stroke-[1]"
          />
        );
      })}

      {/* Position indicator if higher than fret 1 */}
      {startFret > 1 && (
        <text
          x={isLeftHanded ? X0 + DX * 5 + 8 : X0 - 7}
          y={Y0 + DY * 0.5 + 4}
          className="fill-amber-400 font-mono text-[9.5px] font-bold text-center"
          textAnchor={isLeftHanded ? 'start' : 'end'}
        >
          {startFret}fr
        </text>
      )}

      {/* Notes & Mutes on each of the 6 guitar strings */}
      {Array.from({ length: 6 }).map((_, stringIndex) => {
        const setIdx = stringSet.indexOf(stringIndex);
        const xPos = isLeftHanded ? X0 + (5 - stringIndex) * DX : X0 + stringIndex * DX;

        // String muted
        if (setIdx < 0) {
          return (
            <text
              key={`mute-${stringIndex}`}
              x={xPos}
              y={Y0 - 7}
              className="fill-slate-500 font-sans font-bold text-[10px]"
              textAnchor="middle"
            >
              ×
            </text>
          );
        }

        const fret = frets ? frets[setIdx] : undefined;
        const tone = voicing ? voicing[setIdx] : undefined;

        if (!tone || fret === undefined) {
          return (
            <text
              key={`mute-${stringIndex}`}
              x={xPos}
              y={Y0 - 7}
              className="fill-slate-500 font-sans font-bold text-[10px]"
              textAnchor="middle"
            >
              ×
            </text>
          );
        }

        const label =
          labelMode === 'int'
            ? prettyInt(tone.lab || '')
            : noteName(tone.li, tone.acc, notationStyle);
        const color = functionColors[tone.fn] || '#3b82f6';

        // Open string
        if (fret === 0) {
          return (
            <g key={`note-${stringIndex}`}>
              <circle
                cx={xPos}
                cy={Y0 - 9}
                r="6"
                fill={color}
                className="stroke-slate-900 stroke-1"
              />
              <text
                x={xPos}
                y={Y0 - 9}
                className="fill-white font-sans font-bold text-[7px]"
                textAnchor="middle"
                dominantBaseline="central"
              >
                {label}
              </text>
            </g>
          );
        }

        // Fretted note
        const yPos = Y0 + (fret - startFret + 0.5) * DY;
        return (
          <g key={`note-${stringIndex}`}>
            <circle
              cx={xPos}
              cy={yPos}
              r="7.5"
              fill={color}
              className="drop-shadow-sm stroke-slate-950 stroke-[1.2]"
            />
            <text
              x={xPos}
              y={yPos}
              className="fill-white font-sans font-bold text-[7.5px]"
              textAnchor="middle"
              dominantBaseline="central"
            >
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
};
