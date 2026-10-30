import React, { useState, useEffect } from 'react';
import { ChordType, LabelMode, NotationStyle, SongTheme } from './types/music';
import { DEFAULT_CHORD_TYPES } from './data/defaultChords';
import { DEFAULT_THEMES } from './data/defaultThemes';
import { TUNINGS } from './utils/musicTheory';
import { Navbar } from './components/Navbar';
import { ChordExplorer } from './components/ChordExplorer';
import { BackingTrackView } from './components/BackingTrackView';
import { GeminiScannerModal } from './components/GeminiScannerModal';
import { DatabaseModal } from './components/DatabaseModal';
import { AudioPlayerDrawer } from './components/AudioPlayerDrawer';

export default function App() {
  // Navigation & URL query check: ?v=base goes straight to backing track!
  const [currentView, setCurrentView] = useState<'acordes' | 'base'>('acordes');

  // Preferences
  const [labelMode, setLabelMode] = useState<LabelMode>('int');
  const [notationStyle, setNotationStyle] = useState<NotationStyle>('anglo');
  const [isLeftHanded, setIsLeftHanded] = useState<boolean>(false);
  const [selectedTuning, setSelectedTuning] = useState<string>('standard');

  // Modals & Drawers
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [isDatabaseOpen, setIsDatabaseOpen] = useState<boolean>(false);
  const [isAudioPlayerOpen, setIsAudioPlayerOpen] = useState<boolean>(false);

  // Cross-view chord navigation
  const [explorerInitialChord, setExplorerInitialChord] = useState<string>('Cmaj7');

  // Data persistence (localStorage)
  const [chordTypes, setChordTypes] = useState<ChordType[]>(() => {
    try {
      const saved = localStorage.getItem('acordario_chord_types');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_CHORD_TYPES;
  });

  const [themes, setThemes] = useState<SongTheme[]>(() => {
    try {
      const saved = localStorage.getItem('acordario_saved_themes');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_THEMES;
  });

  // Check URL query parameters and location hash on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('v') === 'base' || window.location.hash === '#base') {
      setCurrentView('base');
    }
  }, []);

  // Save chord types to localStorage
  const handleUpdateChordTypes = (updated: ChordType[]) => {
    setChordTypes(updated);
    try {
      localStorage.setItem('acordario_chord_types', JSON.stringify(updated));
    } catch {}
  };

  // Save theme to localStorage
  const handleSaveTheme = (newTheme: SongTheme) => {
    setThemes((prev) => {
      const filtered = prev.filter((t) => t.id !== newTheme.id && t.nombre !== newTheme.nombre);
      const updated = [newTheme, ...filtered];
      try {
        localStorage.setItem('acordario_saved_themes', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Delete theme from localStorage
  const handleDeleteTheme = (themeId: string) => {
    setThemes((prev) => {
      const updated = prev.filter((t) => t.id !== themeId);
      try {
        localStorage.setItem('acordario_saved_themes', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Switch to chord explorer with selected chord
  const handleOpenInChordExplorer = (chordText: string) => {
    setExplorerInitialChord(chordText);
    setCurrentView('acordes');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Applied progression from Gemini scanner
  const handleApplyProgressionFromScanner = (
    progressionText: string,
    title?: string,
    bpm?: number,
    style?: string
  ) => {
    const newTheme: SongTheme = {
      id: `u_${Date.now()}`,
      nombre: title || 'Partitura Escaneada con IA',
      bpm: bpm || 130,
      estilo: (style as any) || 'swing',
      progresion: progressionText,
      actualizado: new Date().toISOString(),
    };
    handleSaveTheme(newTheme);
    setCurrentView('base');
  };

  const currentTuningObj = TUNINGS[selectedTuning] || TUNINGS.standard;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Navigation */}
      <Navbar
        currentView={currentView}
        onChangeView={(v) => {
          setCurrentView(v);
          window.location.hash = v;
        }}
        labelMode={labelMode}
        onChangeLabelMode={setLabelMode}
        notationStyle={notationStyle}
        onChangeNotationStyle={setNotationStyle}
        isLeftHanded={isLeftHanded}
        onToggleLeftHanded={() => setIsLeftHanded(!isLeftHanded)}
        selectedTuning={selectedTuning}
        onChangeTuning={setSelectedTuning}
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenDatabase={() => setIsDatabaseOpen(true)}
        onToggleAudioPlayer={() => setIsAudioPlayerOpen(!isAudioPlayerOpen)}
        isAudioPlayerOpen={isAudioPlayerOpen}
      />

      {/* Main Views Container */}
      <main className="flex-1 px-4 sm:px-6 py-6 max-w-6xl mx-auto w-full">
        {currentView === 'acordes' ? (
          <ChordExplorer
            labelMode={labelMode}
            notationStyle={notationStyle}
            isLeftHanded={isLeftHanded}
            tuning={currentTuningObj.midis}
            tuningNames={currentTuningObj.names}
            chordTypes={chordTypes}
            initialChord={explorerInitialChord}
            onSelectChordForBackingTrack={(tok) => {
              setCurrentView('base');
            }}
          />
        ) : (
          <BackingTrackView
            labelMode={labelMode}
            notationStyle={notationStyle}
            isLeftHanded={isLeftHanded}
            tuning={currentTuningObj.midis}
            tuningNames={currentTuningObj.names}
            chordTypes={chordTypes}
            themes={themes}
            onSaveTheme={handleSaveTheme}
            onDeleteTheme={handleDeleteTheme}
            onOpenInChordExplorer={handleOpenInChordExplorer}
            onOpenGeminiScanner={() => setIsScannerOpen(true)}
          />
        )}
      </main>

      {/* Floating Audio Player Drawer */}
      <AudioPlayerDrawer
        isOpen={isAudioPlayerOpen}
        onClose={() => setIsAudioPlayerOpen(false)}
      />

      {/* Gemini AI Vision Scanner Modal */}
      <GeminiScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onApplyProgression={handleApplyProgressionFromScanner}
      />

      {/* Database Modal (HOJA_TIPOS) */}
      <DatabaseModal
        isOpen={isDatabaseOpen}
        onClose={() => setIsDatabaseOpen(false)}
        chordTypes={chordTypes}
        onUpdateChordTypes={handleUpdateChordTypes}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 px-4 text-center text-xs text-slate-500 font-medium">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            Acordario · Guitar Voicings (Drop 2, Drop 3, Drop 2&4, Tríadas) & Backing Tracks
          </p>
          <p className="font-mono text-slate-600">
            Audio WebAPI Karplus-Strong · Escáner Gemini 3.8 Flash
          </p>
        </div>
      </footer>
    </div>
  );
}
