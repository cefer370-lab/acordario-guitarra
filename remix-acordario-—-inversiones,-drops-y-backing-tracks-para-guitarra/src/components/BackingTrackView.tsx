import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ChordTone,
  ChordType,
  LabelMode,
  LoopSettings,
  MixerVolumes,
  NotationStyle,
  ParsedChord,
  ParsedMeasure,
  PlaybackStyle,
  SongTheme,
  TimelineEvent,
  TimelineSlot,
  VoicingResult,
  VoicingType,
} from '../types/music';
import { DEFAULT_CHORD_TYPES, SCALES } from '../data/defaultChords';
import { DEFAULT_THEMES, PLAYBACK_STYLES } from '../data/defaultThemes';
import {
  parseChordInput,
  noteName,
  STANDARD_TUNING,
  transposeProgressionText,
  getChordTones,
  getScaleTones,
  getDefaultScaleForChord,
  prettyInt,
  NAT,
} from '../utils/musicTheory';
import { generateRowVoicings, TYPES_4_VOICES, TYPES_3_VOICES } from '../utils/voicingEngine';
import { ChordDiagram } from './ChordDiagram';
import { FretboardView } from './FretboardView';
import {
  applyMixerVolumes,
  getAudioContext,
  playBrush,
  playClick,
  playHat,
  playKick,
  playLeadSoloNote,
  playNote,
  playRide,
  playRim,
  playShaker,
  playSnare,
  playStrum,
  previewVoicing,
  pluckGuitarNote,
  unlockAudio,
} from '../audio/soundEngine';
import {
  generateBeatSoloNotes,
  ImproviserSettings,
  ScheduledSoloNote,
} from '../utils/improviserEngine';
import {
  Play,
  Square,
  Sliders,
  Sparkles,
  Camera,
  Save,
  Trash2,
  Repeat,
  ChevronRight,
  Music,
  Edit3,
  ChevronDown,
  ChevronUp,
  Volume2,
  VolumeX,
  Wand2,
  Layers,
  Activity,
} from 'lucide-react';

interface BackingTrackViewProps {
  labelMode: LabelMode;
  notationStyle: NotationStyle;
  isLeftHanded?: boolean;
  tuning?: number[];
  tuningNames?: string[];
  chordTypes?: ChordType[];
  themes: SongTheme[];
  onSaveTheme: (theme: SongTheme) => void;
  onDeleteTheme: (themeId: string) => void;
  onOpenInChordExplorer: (chordText: string) => void;
  onOpenGeminiScanner: () => void;
}

export const BackingTrackView: React.FC<BackingTrackViewProps> = ({
  labelMode,
  notationStyle,
  isLeftHanded = false,
  tuning = STANDARD_TUNING,
  tuningNames = ['E', 'A', 'D', 'G', 'B', 'E'],
  chordTypes = DEFAULT_CHORD_TYPES,
  themes,
  onSaveTheme,
  onDeleteTheme,
  onOpenInChordExplorer,
  onOpenGeminiScanner,
}) => {
  // Current active theme
  const initialTheme = themes[0] || DEFAULT_THEMES[0];
  const [selectedThemeId, setSelectedThemeId] = useState<string>(initialTheme.id);
  const [progressionText, setProgressionText] = useState<string>(initialTheme.progresion);
  const [bpm, setBpm] = useState<number>(initialTheme.bpm || 130);
  const [style, setStyle] = useState<PlaybackStyle>(initialTheme.estilo || 'swing');
  const [themeNameInput, setThemeNameInput] = useState<string>(initialTheme.nombre);

  // Voicing preferences below chart
  const [selectedVoicingType, setSelectedVoicingType] = useState<VoicingType>('drop2');
  const [selectedStringSetIdx, setSelectedStringSetIdx] = useState<number>(0);
  const [selectedInversionIdx, setSelectedInversionIdx] = useState<number>(0);
  const [showFretboard, setShowFretboard] = useState<boolean>(true);

  // Auto-Improviser / Soloist Engine state
  const [improviser, setImproviser] = useState<ImproviserSettings>({
    enabled: true,
    mode: 'arp',
    meter: '4/4',
    figure: 'corcheas',
    direction: 'updown',
    timbre: 'guitar_clean',
    octave: 'mid',
    scaleId: 'auto',
    swing: true,
  });

  // Real-time active solo note badge for visual feedback
  const [activeSoloNote, setActiveSoloNote] = useState<{
    midi: number;
    label: string;
    interval: string;
  } | null>(null);

  // Collapsible drawers
  const [showEditor, setShowEditor] = useState<boolean>(false);
  const [showMixer, setShowMixer] = useState<boolean>(false);
  const [showLoop, setShowLoop] = useState<boolean>(false);

  // Playback runtime state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentMeasureIdx, setCurrentMeasureIdx] = useState<number>(0);
  const [currentBeat, setCurrentBeat] = useState<number>(0);
  const [currentSlotIdx, setCurrentSlotIdx] = useState<number>(0);
  const [countInBeat, setCountInBeat] = useState<number | null>(null);

  // Mixer
  const [mixer, setMixer] = useState<MixerVolumes>({
    g: 0.8,
    b: 0.75,
    d: 0.5,
    m: 0.8,
    c: 0.0,
  });

  // Loop settings
  const [loop, setLoop] = useState<LoopSettings>({
    on: false,
    a: 1,
    b: 4,
    prog: false,
    step: 5,
    max: 220,
  });

  const [saveMessage, setSaveMessage] = useState<string>('');

  // Audio scheduler refs
  const isPlayingRef = useRef(false);
  const currentSlotIdxRef = useRef(0);
  const nextBeatTimeRef = useRef(0);
  const countInRemainingRef = useRef(0);
  const schedulerTimerRef = useRef<any>(null);
  const animationFrameRef = useRef<any>(null);
  const scheduledQueueRef = useRef<{
    time: number;
    slotIdx: number;
    count?: number;
    soloNote?: { midi: number; label: string; interval: string } | null;
  }[]>([]);
  const tapTimesRef = useRef<number[]>([]);
  const improviserStepCounterRef = useRef({ current: 0 });

  // Keep references to state in ref for scheduler
  const improviserRef = useRef(improviser);
  useEffect(() => {
    improviserRef.current = improviser;
  }, [improviser]);

  const selectedVoicingTypeRef = useRef(selectedVoicingType);
  useEffect(() => {
    selectedVoicingTypeRef.current = selectedVoicingType;
  }, [selectedVoicingType]);

  const mixerRef = useRef(mixer);
  useEffect(() => {
    mixerRef.current = mixer;
  }, [mixer]);

  // Parse text progression into measures and sections
  const { measures, sections, badChords } = useMemo(() => {
    const measList: ParsedMeasure[] = [];
    const secList: number[][] = [[]];
    const bads: string[] = [];
    let previousMeasure: ParsedMeasure | null = null;

    const lines = progressionText.replace(/\r/g, '').split('\n');
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        if (secList.length > 0 && secList[secList.length - 1].length > 0) {
          secList.push([]);
        }
        return;
      }

      const segments = trimmed.split('|').map((s) => s.trim()).filter(Boolean);
      segments.forEach((seg) => {
        if (seg === '%') {
          if (!previousMeasure) return;
          const rep: ParsedMeasure = { chords: previousMeasure.chords, repeat: true };
          secList[secList.length - 1].push(measList.length);
          measList.push(rep);
          previousMeasure = rep;
        } else {
          const chordTokens = seg.split(/\s+/).filter((t) => t && t !== '%');
          const parsedList = chordTokens.map((tok) => {
            const c = parseChordInput(tok, chordTypes);
            if (!c) {
              bads.push(tok);
              return { li: 0, acc: 0, q: '', tok, bad: true };
            }
            return c;
          });
          if (parsedList.length > 0) {
            const m: ParsedMeasure = { chords: parsedList.slice(0, 4), repeat: false };
            secList[secList.length - 1].push(measList.length);
            measList.push(m);
            previousMeasure = m;
          }
        }
      });
    });

    if (secList.length > 0 && secList[secList.length - 1].length === 0) {
      secList.pop();
    }

    return { measures: measList, sections: secList, badChords: bads };
  }, [progressionText, chordTypes]);

  // Build timeline events and slots
  const { timelineSlots, measureStartIndices } = useMemo(() => {
    const slots: TimelineSlot[] = [];
    const mStarts: number[] = [];
    const beatDistributions = [[4], [2, 2], [2, 1, 1], [1, 1, 1, 1]];

    const rawEvents: TimelineEvent[] = [];
    measures.forEach((m, mi) => {
      const dist = beatDistributions[m.chords.length - 1] || [4];
      let beatAcc = 0;
      m.chords.forEach((c, ci) => {
        const beats = dist[ci] || 1;
        rawEvents.push({
          mi,
          ci,
          start: beatAcc,
          beats,
          c,
          bad: c.bad,
        });
        beatAcc += beats;
      });
    });

    // Populate chords and voicings
    rawEvents.forEach((ev) => {
      if (ev.c.bad) return;
      const q = chordTypes.find((x) => x.id === ev.c.q) || DEFAULT_CHORD_TYPES[0];
      ev.T = getChordTones(ev.c.li, ev.c.acc, q);
      ev.rootPc = ev.T[0]?.pc ?? 0;
      ev.bassPc = ev.c.bass
        ? (NAT[ev.c.bass.li] + ev.c.bass.acc + 120) % 12
        : ev.rootPc;
      ev.thirdPc = ev.T[1]?.pc ?? ev.rootPc;
      ev.fifthPc = ev.T[2]?.pc ?? ev.rootPc;

      if (ev.T && ev.T.length >= 3) {
        const vTypeToUse = ev.T.length === 3 ? (selectedVoicingType === 'closed' ? 'closed' : 'drop2') : selectedVoicingType;
        const rows = generateRowVoicings(ev.T, vTypeToUse, tuning);
        for (const row of rows) {
          for (const card of row.cards) {
            if (card) {
              ev.voi = card;
              break;
            }
          }
          if (ev.voi) break;
        }
      }
    });

    // Expand slots per beat
    rawEvents.forEach((ev, i) => {
      if (ev.start === 0) {
        mStarts[ev.mi] = slots.length;
      }
      for (let k = 0; k < ev.beats; k++) {
        slots.push({
          mi: ev.mi,
          ci: ev.ci,
          beat: ev.start + k,
          k,
          ev,
          next: rawEvents[(i + 1) % rawEvents.length],
        });
      }
    });

    return { timelineSlots: slots, measureStartIndices: mStarts };
  }, [measures, chordTypes, tuning, selectedVoicingType]);

  // Current slot and active chord
  const currentSlot =
    timelineSlots.length > 0 && currentSlotIdx < timelineSlots.length
      ? timelineSlots[currentSlotIdx]
      : timelineSlots[0] || null;
  const activeEvent = currentSlot?.ev || null;

  // Active chord tones & voicings for the active chord
  const activeChordQuality = useMemo(() => {
    if (!activeEvent || !activeEvent.c || activeEvent.c.bad) return null;
    return chordTypes.find((x) => x.id === activeEvent.c.q) || DEFAULT_CHORD_TYPES[0];
  }, [activeEvent, chordTypes]);

  const activeChordTones: ChordTone[] = useMemo(() => {
    if (!activeEvent || !activeEvent.c || !activeChordQuality) return [];
    return getChordTones(activeEvent.c.li, activeEvent.c.acc, activeChordQuality);
  }, [activeEvent, activeChordQuality]);

  const activeScaleTones = useMemo(() => {
    if (!activeEvent || !activeEvent.c || !activeChordQuality) return [];
    const scaleId = improviser.scaleId && improviser.scaleId !== 'auto'
      ? improviser.scaleId
      : getDefaultScaleForChord(activeChordQuality);
    const scaleDef = SCALES.find((s) => s.id === scaleId) || SCALES[0];
    return getScaleTones(activeEvent.c.li, activeEvent.c.acc, scaleDef.degrees);
  }, [activeEvent, activeChordQuality, improviser.scaleId]);

  // Compute available voicing rows for the active chord below the chart
  const activeVoicingRows = useMemo(() => {
    if (!activeChordTones || activeChordTones.length < 3) return [];
    const vTypeToUse = activeChordTones.length === 3 && selectedVoicingType !== 'closed'
      ? 'drop2'
      : selectedVoicingType;
    return generateRowVoicings(activeChordTones, vTypeToUse, tuning);
  }, [activeChordTones, selectedVoicingType, tuning]);

  const selectedVoicingCard: VoicingResult | null = useMemo(() => {
    if (activeVoicingRows.length === 0) return null;
    const row = activeVoicingRows[selectedStringSetIdx] || activeVoicingRows[0];
    if (!row) return null;
    return row.cards[selectedInversionIdx] || row.cards.find(Boolean) || null;
  }, [activeVoicingRows, selectedStringSetIdx, selectedInversionIdx]);

  // Handle mixer updates
  useEffect(() => {
    applyMixerVolumes(mixer, style);
  }, [mixer, style]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, []);

  // Audio synthesis scheduler
  const scheduleBeatAudio = (slot: TimelineSlot, beatTime: number, beatDuration: number) => {
    if (!slot || !slot.ev) return;
    const isSwingStyle = style === 'swing' || style === 'manouche';
    const swingFactor = isSwingStyle ? (bpm > 200 ? 0.6 : 0.66) : 0.5;
    const b = slot.beat;
    const ev = slot.ev;

    // 1. Metronome Click
    if (mixerRef.current.c > 0) {
      playClick(beatTime, b === 0, false);
    }

    // Determine comping midis based on selected voicing or fallbacks
    const compingMidis = ev.voi?.midis || (ev.T
      ? [48 + (ev.bassPc || 0), 55 + (ev.thirdPc || 0), 60 + (ev.fifthPc || 0)]
      : [48, 52, 55]);

    // 2. Rhythm comping by style
    if (style === 'manouche') {
      if (b % 2 === 0) {
        playStrum(compingMidis, beatTime, beatDuration * 0.45, 0.55, false, 0.01, 'g');
        playKick(beatTime, 0.4);
      } else {
        playStrum(compingMidis, beatTime, 0.08, 0.85, false, 0.008, 'g');
        playBrush(beatTime, 0.35, 0.12);
      }
    } else if (style === 'swing') {
      playStrum(compingMidis, beatTime, beatDuration * 0.48, b % 2 === 1 ? 0.65 : 0.5, false, 0.008, 'g');
      playRide(beatTime, 0.32);
      if (b % 2 === 1) {
        playHat(beatTime, 0.25);
        playRide(beatTime + beatDuration * swingFactor, 0.22);
      }
      const bassMidi = 36 + (b === 0 ? ev.bassPc || 0 : ev.thirdPc || 0);
      playNote(bassMidi, beatTime, beatDuration * 0.9, 0.8, getAudioContext().destination, 'b');
    } else if (style === 'bossa') {
      const e = beatDuration / 2;
      if (b === 0 || b === 2) {
        playStrum(compingMidis, beatTime, e * 1.6, 0.55, false, 0.005, 'n');
      } else if (b === 1 || b === 3) {
        playStrum(compingMidis, beatTime + e, e * 1.5, 0.5, false, 0.005, 'n');
      }
      playShaker(beatTime, 0.12);
      playShaker(beatTime + e, 0.18);
      if (b === 0 || b === 2) playKick(beatTime, 0.45);
      if (b === 1 || b === 3) playRim(beatTime + e * 0.5, 0.4);
    } else if (style === 'pop') {
      const e = beatDuration / 2;
      playStrum(compingMidis, beatTime, e * 1.8, 0.6, false, 0.012, 'g');
      playStrum(compingMidis, beatTime + e, e * 1.3, 0.4, true, 0.01, 'g');
      playHat(beatTime, 0.2);
      playHat(beatTime + e, 0.15);
      if (b === 0 || b === 2) playKick(beatTime, 0.8);
      if (b === 1 || b === 3) playSnare(beatTime, 0.65);
    } else if (style === 'balada') {
      const e = beatDuration / 2;
      playNote(compingMidis[b % compingMidis.length], beatTime, beatDuration * 1.8, 0.6, getAudioContext().destination, 'n');
      playNote(compingMidis[(b + 1) % compingMidis.length], beatTime + e, beatDuration * 1.5, 0.45, getAudioContext().destination, 'n');
      playHat(beatTime, 0.08);
      if (b === 0) playKick(beatTime, 0.65);
      if (b === 1 || b === 3) playRim(beatTime, 0.35);
    }

    // 3. AUTO-IMPROVISER / ARPEGGIATOR OF THE MACHINE
    const imp = improviserRef.current;
    if (imp.enabled && ev.T && ev.T.length > 0) {
      const soloNotes = generateBeatSoloNotes(
        b,
        4,
        beatDuration,
        ev.c,
        ev.T,
        imp,
        improviserStepCounterRef.current
      );

      const leadVol = mixerRef.current.m > 0 ? mixerRef.current.m : 0.8;
      soloNotes.forEach((sn) => {
        const noteAbsoluteTime = beatTime + sn.timeOffset;
        playLeadSoloNote(sn.midi, noteAbsoluteTime, sn.duration, leadVol, imp.timbre);

        // Queue visual feedback for this solo note
        scheduledQueueRef.current.push({
          time: noteAbsoluteTime,
          slotIdx: slot.mi,
          soloNote: {
            midi: sn.midi,
            label: sn.label,
            interval: sn.interval,
          },
        });
      });
    }
  };

  const startPlayback = () => {
    if (timelineSlots.length === 0) return;
    unlockAudio();
    const ctx = getAudioContext();

    setIsPlaying(true);
    isPlayingRef.current = true;

    let startSlot = 0;
    if (loop.on) {
      const loopStartMeasure = Math.max(0, loop.a - 1);
      startSlot = measureStartIndices[loopStartMeasure] || 0;
    } else if (currentMeasureIdx > 0 && currentMeasureIdx < measures.length) {
      startSlot = measureStartIndices[currentMeasureIdx] || 0;
    }

    currentSlotIdxRef.current = startSlot;
    scheduledQueueRef.current = [];
    countInRemainingRef.current = 4; // 4 count-in clicks
    nextBeatTimeRef.current = ctx.currentTime + 0.05;
    improviserStepCounterRef.current = { current: 0 };

    const tickScheduler = () => {
      if (!isPlayingRef.current) return;
      const currentTime = ctx.currentTime;
      const beatDuration = 60 / bpm;

      while (nextBeatTimeRef.current < currentTime + 0.25) {
        const t = nextBeatTimeRef.current;

        if (countInRemainingRef.current > 0) {
          playClick(t, countInRemainingRef.current === 4, true);
          scheduledQueueRef.current.push({
            time: t,
            slotIdx: currentSlotIdxRef.current,
            count: 5 - countInRemainingRef.current,
          });
          countInRemainingRef.current--;
        } else {
          let slotIdx = currentSlotIdxRef.current;
          if (slotIdx >= timelineSlots.length) {
            slotIdx = 0;
          }
          const slot = timelineSlots[slotIdx];

          if (slot) {
            scheduleBeatAudio(slot, t, beatDuration);
            scheduledQueueRef.current.push({
              time: t,
              slotIdx,
            });
          }

          let nextSlot = slotIdx + 1;
          if (loop.on) {
            const loopEndMeasure = Math.min(measures.length - 1, loop.b - 1);
            if (nextSlot >= timelineSlots.length || timelineSlots[nextSlot].mi > loopEndMeasure) {
              const loopStartMeasure = Math.max(0, loop.a - 1);
              nextSlot = measureStartIndices[loopStartMeasure] || 0;
              if (loop.prog) {
                setBpm((prev) => Math.min(loop.max, prev + loop.step));
              }
            }
          } else if (nextSlot >= timelineSlots.length) {
            nextSlot = 0;
          }

          currentSlotIdxRef.current = nextSlot;
        }

        nextBeatTimeRef.current += beatDuration;
      }
    };

    const updateUIFrame = () => {
      if (!isPlayingRef.current) return;
      const currentTime = ctx.currentTime;

      while (scheduledQueueRef.current.length > 0 && scheduledQueueRef.current[0].time <= currentTime) {
        const item = scheduledQueueRef.current.shift();
        if (item) {
          if (item.count !== undefined) {
            setCountInBeat(item.count);
          } else if (item.soloNote) {
            setActiveSoloNote(item.soloNote);
          } else {
            setCountInBeat(null);
            setCurrentSlotIdx(item.slotIdx);
            const slot = timelineSlots[item.slotIdx];
            if (slot) {
              setCurrentMeasureIdx(slot.mi);
              setCurrentBeat(slot.beat);
            }
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(updateUIFrame);
    };

    schedulerTimerRef.current = setInterval(tickScheduler, 25);
    animationFrameRef.current = requestAnimationFrame(updateUIFrame);
  };

  const stopPlayback = () => {
    setIsPlaying(false);
    isPlayingRef.current = false;
    setCountInBeat(null);
    setActiveSoloNote(null);
    if (schedulerTimerRef.current) {
      clearInterval(schedulerTimerRef.current);
      schedulerTimerRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    scheduledQueueRef.current = [];
  };

  const handleTapTempo = () => {
    const now = performance.now();
    const taps = tapTimesRef.current;
    if (taps.length > 0 && now - taps[taps.length - 1] > 2000) {
      tapTimesRef.current = [now];
      return;
    }
    taps.push(now);
    if (taps.length > 4) taps.shift();

    if (taps.length >= 2) {
      const intervals = [];
      for (let i = 1; i < taps.length; i++) {
        intervals.push(taps[i] - taps[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const calculatedBpm = Math.round(60000 / avgInterval);
      setBpm(Math.max(40, Math.min(300, calculatedBpm)));
    }
  };

  const handleTranspose = (semitones: number) => {
    const transposed = transposeProgressionText(progressionText, semitones);
    setProgressionText(transposed);
  };

  const handleSelectTheme = (themeId: string) => {
    setSelectedThemeId(themeId);
    const target = themes.find((t) => t.id === themeId);
    if (target) {
      setProgressionText(target.progresion);
      setBpm(target.bpm || 130);
      setStyle(target.estilo || 'swing');
      setThemeNameInput(target.nombre);
      setCurrentMeasureIdx(0);
      setCurrentSlotIdx(0);
      setSaveMessage('');
      if (isPlaying) {
        stopPlayback();
      }
    }
  };

  const handleSaveTheme = () => {
    const name = themeNameInput.trim() || 'Mi Tema';
    const newTheme: SongTheme = {
      id: selectedThemeId.startsWith('u_') ? selectedThemeId : `u_${Date.now()}`,
      nombre: name,
      bpm,
      estilo: style,
      progression: progressionText,
      actualizado: new Date().toISOString(),
    } as any;
    onSaveTheme(newTheme);
    setSelectedThemeId(newTheme.id);
    setSaveMessage('¡Tema guardado exitosamente!');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const currentThemeObj = themes.find((t) => t.id === selectedThemeId) || initialTheme;

  // Quick set loop to specific bar range
  const handleSetQuickLoop = (fromBar: number, toBar: number) => {
    setLoop({
      ...loop,
      on: true,
      a: fromBar,
      b: Math.min(measures.length, toBar),
    });
  };

  return (
    <div className="flex flex-col gap-5 max-w-5xl mx-auto w-full pb-14">
      {/* 1. SELECTOR PRINCIPAL DE CANCIONES (EN LO MÁS ALTO) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col gap-3 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
            <Music className="w-4 h-4" />
            <span>Seleccionar Canción / Tema</span>
          </label>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEditor(!showEditor)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 font-semibold text-xs border border-slate-800 transition"
            >
              <Edit3 className="w-3.5 h-3.5 text-amber-400" />
              <span>{showEditor ? 'Ocultar Editor' : 'Editar Acordes'}</span>
            </button>
            <button
              onClick={onOpenGeminiScanner}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-amber-300 font-bold text-xs border border-amber-500/30 transition shadow-sm"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Foto (IA)</span>
            </button>
          </div>
        </div>

        {/* Dropdown de temas grande y claro */}
        <select
          value={selectedThemeId}
          onChange={(e) => handleSelectTheme(e.target.value)}
          className="w-full bg-slate-950 border-2 border-amber-500/50 hover:border-amber-400 text-slate-100 font-bold text-base sm:text-lg rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-amber-400/30 transition cursor-pointer"
        >
          <optgroup label="Estándares Clásicos">
            {DEFAULT_THEMES.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.nombre} · ({theme.bpm} BPM, {PLAYBACK_STYLES[theme.estilo]?.name.split(' ')[0] || theme.estilo})
              </option>
            ))}
          </optgroup>
          {themes.some((t) => t.id.startsWith('u_')) && (
            <optgroup label="Mis Temas Guardados">
              {themes
                .filter((t) => t.id.startsWith('u_'))
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    ⭐ {t.nombre} ({t.bpm} BPM)
                  </option>
                ))}
            </optgroup>
          )}
        </select>
      </div>

      {/* 2. BARRA DE REPRODUCCIÓN (PLAY, TEMPO, ESTILO, TONO) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          {/* Botón Play / Stop Gigante */}
          <button
            onClick={() => (isPlaying ? stopPlayback() : startPlayback())}
            className={`w-16 h-16 sm:w-18 sm:h-18 rounded-full flex items-center justify-center font-black transition-all transform active:scale-95 shadow-xl ${
              isPlaying
                ? 'bg-rose-500 hover:bg-rose-400 text-white animate-pulse'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
            }`}
            title="Reproducir / Detener (Espacio)"
          >
            {isPlaying ? (
              <Square className="w-7 h-7 fill-current" />
            ) : (
              <Play className="w-8 h-8 fill-current ml-1" />
            )}
          </button>

          {/* Control de Tempo */}
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Tempo
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setBpm((prev) => Math.max(40, prev - 5))}
                className="w-8 h-8 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-200 font-bold text-sm border border-slate-800 flex items-center justify-center"
              >
                -5
              </button>
              <div className="flex items-baseline gap-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1">
                <span className="font-mono font-black text-xl text-amber-300">{bpm}</span>
                <span className="text-[10px] font-bold text-slate-500">BPM</span>
              </div>
              <button
                onClick={() => setBpm((prev) => Math.min(300, prev + 5))}
                className="w-8 h-8 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-200 font-bold text-sm border border-slate-800 flex items-center justify-center"
              >
                +5
              </button>
              <button
                onClick={handleTapTempo}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 ml-1"
                title="Toca al ritmo para fijar el tempo"
              >
                Tap
              </button>
            </div>
          </div>
        </div>

        {/* Estilo Rítmico y Transponer */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Estilo Base
            </span>
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value as PlaybackStyle)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-100 focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              {Object.entries(PLAYBACK_STYLES).map(([key, cfg]) => (
                <option key={key} value={key}>
                  {cfg.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Tono
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleTranspose(-1)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 font-bold text-xs border border-slate-800"
                title="Bajar medio tono"
              >
                −½
              </button>
              <button
                onClick={() => handleTranspose(1)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 font-bold text-xs border border-slate-800"
                title="Subir medio tono"
              >
                +½
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. EL CHART (GRILLA COMPLETA DE COMPASES) INMEDIATAMENTE DESPUÉS DEL PLAY */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col gap-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-baseline gap-2">
            <h2 className="text-base sm:text-lg font-black text-slate-100 font-display">
              Chart de Acordes: <span className="text-amber-400">{currentThemeObj.nombre}</span>
            </h2>
            <span className="text-xs text-slate-500 font-mono">({measures.length} compases)</span>
          </div>

          <div className="flex items-center gap-2">
            {loop.on && (
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 font-bold flex items-center gap-1 animate-pulse">
                <Repeat className="w-3 h-3" />
                <span>Loop activo: compases {loop.a} al {loop.b}</span>
              </span>
            )}
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Toca un compás para arrancar desde ahí
            </p>
          </div>
        </div>

        {/* Grilla limpia y visible de compases */}
        <div className="flex flex-col gap-3">
          {sections.map((sec, secIdx) => (
            <div
              key={`sec-${secIdx}`}
              className="grid grid-cols-2 sm:grid-cols-4 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/70"
            >
              {sec.map((mIdx) => {
                const measure = measures[mIdx];
                if (!measure) return null;
                const isCurrent = isPlaying && currentMeasureIdx === mIdx;
                const inLoopRange = loop.on && mIdx >= loop.a - 1 && mIdx <= loop.b - 1;

                return (
                  <button
                    key={`meas-${mIdx}`}
                    onClick={() => {
                      setCurrentMeasureIdx(mIdx);
                      if (isPlaying) {
                        currentSlotIdxRef.current = measureStartIndices[mIdx] || 0;
                      }
                    }}
                    className={`relative p-3.5 min-h-[76px] flex flex-col justify-center items-center gap-1 border-r border-b border-slate-800/80 transition-all text-center ${
                      isCurrent
                        ? 'bg-amber-500/25 text-amber-300 font-black shadow-inner ring-2 ring-amber-400'
                        : inLoopRange
                        ? 'bg-emerald-950/40 text-slate-200 ring-1 ring-emerald-500/30'
                        : 'hover:bg-slate-900 text-slate-200'
                    }`}
                  >
                    {/* Número de compás */}
                    <span className="absolute top-1.5 right-2 font-mono text-[10px] text-slate-500 font-semibold">
                      {mIdx + 1}
                    </span>

                    {/* Acorde(s) del compás */}
                    {measure.repeat ? (
                      <span className="text-2xl font-black font-mono text-slate-500">%</span>
                    ) : (
                      <div className="flex flex-wrap items-center justify-center gap-1.5">
                        {measure.chords.map((c, ci) => (
                          <span
                            key={`ch-${ci}`}
                            className={`text-lg sm:text-2xl font-black font-display tracking-tight ${
                              c.bad
                                ? 'text-rose-400 underline decoration-wavy'
                                : isCurrent && currentSlot?.ci === ci
                                ? 'text-amber-400 scale-105'
                                : 'text-slate-100'
                            }`}
                          >
                            {c.tok}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Barra de progreso del compás en tiempo real */}
                    {isCurrent && (
                      <div
                        className="absolute bottom-0 left-0 h-1.5 bg-amber-400 transition-all duration-100"
                        style={{ width: `${((currentBeat + 1) / 4) * 100}%` }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* 4. NOTAS DEL ACORDE, VOICINGS Y DIAPASÓN (JUSTO DEBAJO DEL CHART) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col gap-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Acorde en Reproducción
              </span>
              <div className="flex items-center gap-1.5">
                {[0, 1, 2, 3].map((b) => (
                  <div
                    key={`led-dot-${b}`}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      isPlaying && currentBeat === b
                        ? b === 0
                          ? 'bg-rose-500 scale-125 ring-2 ring-rose-400/50'
                          : 'bg-amber-400 scale-110 ring-2 ring-amber-300/40'
                        : 'bg-slate-800'
                    }`}
                  />
                ))}
              </div>
            </div>

            {countInBeat ? (
              <span className="text-2xl font-black text-amber-400 font-mono animate-bounce">
                Cuenta: {countInBeat}
              </span>
            ) : activeEvent && !activeEvent.bad ? (
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-slate-100 font-display">
                  {activeEvent.c?.tok || ''}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  (Compás {currentMeasureIdx + 1})
                </span>
              </div>
            ) : (
              <span className="text-xl font-bold text-slate-600">--</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {activeEvent?.c?.tok && (
              <button
                onClick={() => onOpenInChordExplorer(activeEvent.c.tok)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-amber-400 hover:text-amber-300 text-xs font-bold border border-slate-800 transition"
              >
                <span>Explorar todas las inversiones</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Desglose de las notas del acorde (Fundamental, 3ª, 5ª, 7ª...) */}
        {activeChordTones.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-400 mr-1">Notas del acorde:</span>
            {activeChordTones.map((tone, idx) => {
              const bg =
                tone.fn === 'root'
                  ? 'bg-rose-950/80 text-rose-300 border-rose-800/80'
                  : tone.fn === '3'
                  ? 'bg-amber-950/80 text-amber-300 border-amber-800/80'
                  : tone.fn === '5'
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80'
                  : 'bg-violet-950/80 text-violet-300 border-violet-800/80';

              return (
                <div
                  key={`tone-${idx}`}
                  className={`px-3 py-1 rounded-xl text-xs font-bold border flex items-center gap-1.5 shadow-sm ${bg}`}
                >
                  <span className="opacity-75 font-mono text-[11px]">{prettyInt(tone.lab)}:</span>
                  <span className="font-extrabold text-sm">
                    {noteName(tone.li, tone.acc, notationStyle)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Selectores de Disposición (Drop 2, Drop 3, Cerradas, etc.) */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Tipo de Voicing para la Guitarra
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(activeChordTones.length === 3 ? TYPES_3_VOICES : TYPES_4_VOICES).map((tDef) => (
                  <button
                    key={tDef.id}
                    disabled={tDef.disabled}
                    onClick={() => setSelectedVoicingType(tDef.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      selectedVoicingType === tDef.id
                        ? 'bg-amber-500 text-slate-950 shadow-md'
                        : tDef.disabled
                        ? 'opacity-40 bg-slate-900 text-slate-600 cursor-not-allowed'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                    }`}
                  >
                    {tDef.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Selector de set de cuerdas */}
            {activeVoicingRows.length > 0 && (
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Cuerdas
                </span>
                <select
                  value={selectedStringSetIdx}
                  onChange={(e) => setSelectedStringSetIdx(parseInt(e.target.value))}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-200"
                >
                  {activeVoicingRows.map((row, idx) => (
                    <option key={`row-opt-${idx}`} value={idx}>
                      {row.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Tarjetas de las 4 inversiones para este acorde y voicing */}
          {activeVoicingRows[selectedStringSetIdx] && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {['Fundamental', '1ª Inversión', '2ª Inversión', '3ª Inversión']
                .slice(0, activeChordTones.length)
                .map((invTitle, invIdx) => {
                  const card = activeVoicingRows[selectedStringSetIdx]?.cards[invIdx];
                  const isSelected = selectedInversionIdx === invIdx;

                  if (!card) {
                    return (
                      <div
                        key={`inv-${invIdx}`}
                        className="p-2.5 rounded-xl border border-dashed border-slate-800/80 text-center text-xs text-slate-600 flex flex-col justify-center items-center min-h-[110px]"
                      >
                        <span className="font-semibold text-slate-500">{invTitle}</span>
                        <span className="text-[10px] mt-1 text-slate-600">Fuera de rango</span>
                      </div>
                    );
                  }

                  const fretStr = [0, 1, 2, 3, 4, 5]
                    .map((st) => {
                      const k = card.set.indexOf(st);
                      return k < 0 ? 'x' : card.fr[k];
                    })
                    .join('-');

                  return (
                    <button
                      key={`inv-${invIdx}`}
                      onClick={() => {
                        setSelectedInversionIdx(invIdx);
                        previewVoicing(card, false);
                      }}
                      className={`p-2.5 rounded-xl border transition-all text-left flex flex-col justify-between ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-400 text-slate-100 shadow-md ring-1 ring-amber-400/40'
                          : 'bg-slate-900 hover:bg-slate-800/80 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-400">{invTitle}</span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {card.span > 0 ? `span ${card.span}tr` : 'abierto'}
                        </span>
                      </div>

                      <div className="my-1 text-center font-mono text-xs text-slate-200 font-bold bg-slate-950/80 px-2 py-1 rounded">
                        {fretStr}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="text-emerald-400 font-medium">Bajo en {invIdx === 0 ? 'R' : invIdx === 1 ? '3ª' : invIdx === 2 ? '5ª' : '7ª'}</span>
                        <span className="text-[10px] text-amber-300 hover:underline">Tocar ♫</span>
                      </div>
                    </button>
                  );
                })}
            </div>
          )}
        </div>

        {/* Botón para ver/ocultar el Diapasón Completo */}
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={() => setShowFretboard(!showFretboard)}
            className="flex items-center gap-2 text-xs font-bold text-amber-400 hover:text-amber-300"
          >
            <Layers className="w-4 h-4" />
            <span>{showFretboard ? 'Ocultar Diapasón Completo' : 'Ver Diapasón Completo en la Guitarra'}</span>
            {showFretboard ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {activeSoloNote && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 text-xs font-mono font-bold animate-pulse">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              <span>Improvisando: {activeSoloNote.label} ({activeSoloNote.interval})</span>
            </div>
          )}
        </div>

        {/* Diapasón Interactivo */}
        {showFretboard && activeChordTones.length > 0 && (
          <div className="animate-fade-in pt-1">
            <FretboardView
              chordTones={activeChordTones}
              scaleTones={activeScaleTones}
              selectedVoicing={selectedVoicingCard}
              labelMode={labelMode}
              notationStyle={notationStyle}
              isLeftHanded={isLeftHanded}
              tuning={tuning}
              tuningNames={tuningNames}
              scaleName={improviser.scaleId && improviser.scaleId !== 'auto' ? improviser.scaleId : 'Escala del acorde'}
              chordName={activeEvent?.c?.tok || ''}
              activeSoloMidi={activeSoloNote?.midi || null}
              activeSoloNoteName={activeSoloNote?.label || ''}
            />
          </div>
        )}
      </div>

      {/* 5. PANEL DE AUTO-IMPROVISACIÓN / ARPEGIADOR ("LA MISMA MÁQUINA") */}
      <div className="bg-slate-900 border-2 border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col gap-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-100 font-display flex items-center gap-2">
                <span>Auto-Improvisador de la Máquina</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-bold uppercase tracking-wider">
                  Arpegios & Escalas
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                La máquina toca arpegios o escalas automáticamente sobre los acordes que van sonando
              </p>
            </div>
          </div>

          {/* Toggle Activar / Desactivar Improvisador */}
          <button
            onClick={() => setImproviser((prev) => ({ ...prev, enabled: !prev.enabled }))}
            className={`px-4 py-2 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md ${
              improviser.enabled
                ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 ring-2 ring-amber-400/50'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                improviser.enabled ? 'bg-slate-950 animate-ping' : 'bg-slate-600'
              }`}
            />
            <span>{improviser.enabled ? 'Arpegiador / Solo ACTIVO' : 'Activar Arpegiador / Solo'}</span>
          </button>
        </div>

        {/* Controles de Configuración del Improvisador */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {/* MODO (Arpegio, Escala, Mixto, Pentatónica) */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Modo Musical
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'arp' as const, label: 'Arpegio (1-3-5-7)' },
                { id: 'scale' as const, label: 'Escala (Modal)' },
                { id: 'mixed' as const, label: 'Mixto (Arp+Escala)' },
                { id: 'penta' as const, label: 'Pentatónica' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setImproviser((prev) => ({ ...prev, mode: m.id }))}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition text-center ${
                    improviser.mode === m.id
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* RÍTMICA & SUBDIVISIÓN (Negras, Corcheas, Tresillos 3x2, Semicorcheas) */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Rítmica / Figuración
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'negras' as const, label: 'Negras (1/4)' },
                { id: 'corcheas' as const, label: 'Corcheas (1/8)' },
                { id: 'tresillos' as const, label: 'Tresillos (1/8T)' },
                { id: 'tresillos_3x2' as const, label: 'Tresillo 3x2 (Hemiola)' },
                { id: 'semicorcheas' as const, label: 'Semicorcheas (1/16)' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setImproviser((prev) => ({ ...prev, figure: f.id }))}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition text-center ${
                    improviser.figure === f.id
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* PATRÓN / DIRECCIÓN (Ascendente, Descendente, Ida y Vuelta, Terceras, Melódico) */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Dirección Melódica
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'up' as const, label: 'Ascendente ↑' },
                { id: 'down' as const, label: 'Descendente ↓' },
                { id: 'updown' as const, label: 'Ida y Vuelta ↕' },
                { id: 'thirds' as const, label: 'Por Terceras ⤹' },
                { id: 'melodic' as const, label: 'Jazz Melódico ♫' },
              ].map((d) => (
                <button
                  key={d.id}
                  onClick={() => setImproviser((prev) => ({ ...prev, direction: d.id }))}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition text-center ${
                    improviser.direction === d.id
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* INSTRUMENTO SOLISTA */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Sonido / Instrumento
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'guitar_clean' as const, label: 'Guitarra Jazz (Limpia)' },
                { id: 'guitar_lead' as const, label: 'Guitarra Lead (Drive)' },
                { id: 'rhodes' as const, label: 'Rhodes / Eléctrico' },
                { id: 'synth' as const, label: 'Sintetizador' },
              ].map((inst) => (
                <button
                  key={inst.id}
                  onClick={() => setImproviser((prev) => ({ ...prev, timbre: inst.id }))}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition text-center ${
                    improviser.timbre === inst.id
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  {inst.label}
                </button>
              ))}
            </div>
          </div>

          {/* REGISTRO / OCTAVA */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Registro en Guitarra
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'mid' as const, label: 'Medio (5-12)' },
                { id: 'high' as const, label: 'Agudo (9-17)' },
                { id: 'wide' as const, label: 'Completo' },
              ].map((oct) => (
                <button
                  key={oct.id}
                  onClick={() => setImproviser((prev) => ({ ...prev, octave: oct.id }))}
                  className={`px-2 py-1.5 rounded-lg text-xs font-bold transition text-center ${
                    improviser.octave === oct.id
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  {oct.label}
                </button>
              ))}
            </div>
          </div>

          {/* VOLUMEN DEL IMPROVISADOR */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col gap-1.5 justify-center">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[11px]">
                Volumen Melodía Solista
              </span>
              <span className="font-mono text-amber-300 font-bold">
                {Math.round(mixer.m * 100)}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMixer((m) => ({ ...m, m: m.m === 0 ? 0.8 : 0 }))}
                className="text-slate-400 hover:text-slate-200 p-1"
                title={mixer.m === 0 ? 'Activar audio solista' : 'Silenciar solista'}
              >
                {mixer.m === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(mixer.m * 100)}
                onChange={(e) => setMixer((m) => ({ ...m, m: parseInt(e.target.value) / 100 }))}
                className="w-full accent-amber-500"
              />
            </div>
          </div>
        </div>

        {/* BUCLE DE PRÁCTICA (LOOP SOBRE COMPASES PARA IMPROVISAR) */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-300">Práctica en Loop continuo:</span>
            <button
              onClick={() => handleSetQuickLoop(1, 4)}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 font-medium"
            >
              Compases 1-4
            </button>
            <button
              onClick={() => handleSetQuickLoop(5, 8)}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 font-medium"
            >
              Compases 5-8
            </button>
            <button
              onClick={() => handleSetQuickLoop(9, 12)}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 font-medium"
            >
              Compases 9-12
            </button>
            <button
              onClick={() => handleSetQuickLoop(currentMeasureIdx + 1, currentMeasureIdx + 1)}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 font-medium"
            >
              Solo compás {currentMeasureIdx + 1}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setLoop((l) => ({ ...l, on: !l.on }))}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition ${
                loop.on
                  ? 'bg-emerald-500 text-slate-950 font-black shadow'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              {loop.on ? `Loop Compases ${loop.a}-${loop.b} (Activo)` : 'Activar Loop'}
            </button>
          </div>
        </div>
      </div>

      {/* 6. OPCIONES COLAPSABLES (MEZCLADOR, LOOP AVANZADO, EDITOR DE ACORDES) */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          onClick={() => setShowMixer(!showMixer)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold text-xs border border-slate-800 transition"
        >
          <Sliders className="w-3.5 h-3.5 text-amber-400" />
          <span>Volúmenes e Instrumentos de la Base</span>
          {showMixer ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
        </button>

        <button
          onClick={() => setShowLoop(!showLoop)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold text-xs border border-slate-800 transition"
        >
          <Repeat className="w-3.5 h-3.5 text-amber-400" />
          <span>Ajustes de Loop y Aceleración</span>
          {showLoop ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
        </button>
      </div>

      {/* Panel del Mezclador (si está desplegado) */}
      {showMixer && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col gap-3 shadow-lg animate-fade-in">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Mezclador de Volúmenes de la Banda
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { key: 'g' as keyof MixerVolumes, label: 'Guitarra Rítmica (Comping)' },
              { key: 'b' as keyof MixerVolumes, label: 'Contrabajo / Bajo' },
              { key: 'd' as keyof MixerVolumes, label: 'Batería / Percusión' },
              { key: 'm' as keyof MixerVolumes, label: 'Auto-Improvisador (Melodía)' },
              { key: 'c' as keyof MixerVolumes, label: 'Metrónomo Click' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center gap-3 text-xs bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                <span className="w-36 text-slate-300 font-semibold">{label}</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(mixer[key] * 100)}
                  onChange={(e) =>
                    setMixer((m) => ({ ...m, [key]: parseInt(e.target.value) / 100 }))
                  }
                  className="flex-1 accent-amber-500"
                />
                <span className="w-8 text-right font-mono text-slate-500">
                  {Math.round(mixer[key] * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Panel de Loop Avanzado (si está desplegado) */}
      {showLoop && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center gap-4 text-xs text-slate-300 shadow-lg animate-fade-in">
          <button
            onClick={() => setLoop((l) => ({ ...l, on: !l.on }))}
            className={`px-3 py-1.5 rounded-xl font-bold transition border ${
              loop.on
                ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                : 'bg-slate-950 text-slate-400 border-slate-800'
            }`}
          >
            {loop.on ? 'Loop Activado' : 'Activar Loop'}
          </button>

          <div className="flex items-center gap-2">
            <span>Repetir del compás</span>
            <input
              type="number"
              min="1"
              max={measures.length}
              value={loop.a}
              onChange={(e) => setLoop((l) => ({ ...l, a: Math.max(1, parseInt(e.target.value) || 1) }))}
              className="w-14 bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-center font-mono text-amber-300 font-bold"
            />
            <span>al</span>
            <input
              type="number"
              min="1"
              max={measures.length}
              value={loop.b}
              onChange={(e) => setLoop((l) => ({ ...l, b: Math.max(loop.a, parseInt(e.target.value) || 1) }))}
              className="w-14 bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-center font-mono text-amber-300 font-bold"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <input
              type="checkbox"
              checked={loop.prog}
              onChange={(e) => setLoop((l) => ({ ...l, prog: e.target.checked }))}
              className="accent-amber-500 rounded"
            />
            <span>Aumentar +{loop.step} BPM cada ciclo hasta {loop.max} BPM</span>
          </label>
        </div>
      )}

      {/* Panel de Edición de Acordes (si está desplegado) */}
      {showEditor && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col gap-3 shadow-lg animate-fade-in">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Editor de Acordes
          </h3>

          <textarea
            value={progressionText}
            onChange={(e) => setProgressionText(e.target.value)}
            rows={6}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-sm text-slate-200 focus:outline-none focus:border-amber-400 leading-relaxed"
            placeholder="Cmaj7 | Am7 | Dm7 | G7"
          />

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 flex-1 max-w-sm">
              <input
                type="text"
                value={themeNameInput}
                onChange={(e) => setThemeNameInput(e.target.value)}
                placeholder="Nombre de la canción..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
              />
              <button
                onClick={handleSaveTheme}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs whitespace-nowrap"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Guardar</span>
              </button>
            </div>

            {selectedThemeId.startsWith('u_') && (
              <button
                onClick={() => onDeleteTheme(selectedThemeId)}
                className="p-2 rounded-xl bg-slate-950 hover:bg-rose-950/40 text-rose-400 border border-slate-800"
                title="Eliminar tema"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {saveMessage && (
            <span className="text-xs text-emerald-400 font-semibold">{saveMessage}</span>
          )}
        </div>
      )}
    </div>
  );
};
