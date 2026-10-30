import React, { useState } from 'react';
import { LabelMode, NotationStyle } from '../types/music';
import { TUNINGS } from '../utils/musicTheory';
import {
  Music,
  Disc,
  Guitar,
  Settings,
  X,
  Database,
  Camera,
  Download,
  Terminal,
} from 'lucide-react';

interface NavbarProps {
  currentView: 'acordes' | 'base';
  onChangeView: (view: 'acordes' | 'base') => void;
  labelMode: LabelMode;
  onChangeLabelMode: (mode: LabelMode) => void;
  notationStyle: NotationStyle;
  onChangeNotationStyle: (style: NotationStyle) => void;
  isLeftHanded: boolean;
  onToggleLeftHanded: () => void;
  selectedTuning: string;
  onChangeTuning: (tuningKey: string) => void;
  onOpenScanner: () => void;
  onOpenDatabase: () => void;
  onToggleAudioPlayer: () => void;
  isAudioPlayerOpen: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onChangeView,
  labelMode,
  onChangeLabelMode,
  notationStyle,
  onChangeNotationStyle,
  isLeftHanded,
  onToggleLeftHanded,
  selectedTuning,
  onChangeTuning,
  onOpenScanner,
  onOpenDatabase,
  onToggleAudioPlayer,
  isAudioPlayerOpen,
}) => {
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showDownloadInfo, setShowDownloadInfo] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 px-3 sm:px-6 py-2.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-black shadow-md flex-shrink-0">
              <Guitar className="w-4 h-4 stroke-[2.4]" />
            </div>
            <span className="text-base sm:text-lg font-black tracking-tight text-slate-100 font-display">
              Acord<span className="text-amber-400">ario</span>
            </span>
          </div>

          {/* Main View Switcher Tabs */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1">
            <button
              onClick={() => onChangeView('acordes')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition ${
                currentView === 'acordes'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span>Acordes</span>
            </button>
            <button
              onClick={() => onChangeView('base')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition ${
                currentView === 'base'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Disc className="w-3.5 h-3.5" />
              <span>Backing Track</span>
            </button>
          </div>

          {/* Action buttons (Download ZIP + Settings) */}
          <div className="flex items-center gap-2">
            <a
              href="/api/download-zip"
              download="acordario-proyecto-guitarra.zip"
              onClick={() => setShowDownloadInfo(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition transform active:scale-95"
              title="Descargar todo el código del proyecto en un archivo ZIP a tu PC"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Descargar ZIP</span>
            </a>

            <button
              onClick={() => setShowSettingsMenu(!showSettingsMenu)}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition flex items-center gap-1 text-xs font-semibold"
              title="Ajustes de visualización y afinación"
            >
              <Settings className="w-4 h-4 text-amber-400" />
              <span className="hidden md:inline">Ajustes</span>
            </button>
          </div>
        </div>
      </header>

      {/* Settings Modal / Drawer */}
      {showSettingsMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 flex items-center gap-2 text-sm">
                <Settings className="w-4 h-4 text-amber-400" />
                <span>Ajustes de la Guitarra</span>
              </h3>
              <button
                onClick={() => setShowSettingsMenu(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Intervalos vs Notas */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-semibold">Etiquetas en diagramas:</span>
              <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-0.5 font-bold">
                <button
                  onClick={() => onChangeLabelMode('int')}
                  className={`px-2.5 py-1 rounded ${labelMode === 'int' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}`}
                >
                  Intervalos
                </button>
                <button
                  onClick={() => onChangeLabelMode('note')}
                  className={`px-2.5 py-1 rounded ${labelMode === 'note' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}`}
                >
                  Notas
                </button>
              </div>
            </div>

            {/* Nomenclatura */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-semibold">Nomenclatura:</span>
              <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-0.5 font-bold">
                <button
                  onClick={() => onChangeNotationStyle('anglo')}
                  className={`px-2.5 py-1 rounded ${notationStyle === 'anglo' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}`}
                >
                  C D E
                </button>
                <button
                  onClick={() => onChangeNotationStyle('latin')}
                  className={`px-2.5 py-1 rounded ${notationStyle === 'latin' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}`}
                >
                  Do Re Mi
                </button>
              </div>
            </div>

            {/* Afinación */}
            <div className="flex flex-col gap-1 text-xs">
              <span className="text-slate-300 font-semibold">Afinación de la guitarra:</span>
              <select
                value={selectedTuning}
                onChange={(e) => onChangeTuning(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-2 font-medium"
              >
                {Object.entries(TUNINGS).map(([key, val]) => (
                  <option key={key} value={key}>
                    {val.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Modo Zurdo */}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-300 font-semibold">Orientación del diapasón:</span>
              <button
                onClick={onToggleLeftHanded}
                className={`px-3 py-1.5 rounded-lg border font-bold text-xs ${
                  isLeftHanded
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}
              >
                {isLeftHanded ? 'Zurdo' : 'Diestro'}
              </button>
            </div>

            {/* Base de datos de acordes button */}
            <button
              onClick={() => {
                setShowSettingsMenu(false);
                onOpenDatabase();
              }}
              className="w-full py-2 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800 flex items-center justify-center gap-2 transition"
            >
              <Database className="w-3.5 h-3.5 text-amber-400" />
              <span>Base de datos de acordes (Hoja Tipos)</span>
            </button>

            {/* Descargar ZIP directo desde ajustes */}
            <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
              <span className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                Código Fuente:
              </span>
              <a
                href="/api/download-zip"
                download="acordario-proyecto-guitarra.zip"
                onClick={() => {
                  setShowSettingsMenu(false);
                  setShowDownloadInfo(true);
                }}
                className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow"
              >
                <Download className="w-4 h-4" />
                <span>Descargar todo el proyecto (ZIP)</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Download Info Modal */}
      {showDownloadInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 sm:p-6 flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <Download className="w-5 h-5" />
                <h3 className="font-bold text-slate-100 text-base">
                  ¡Descarga Iniciada!
                </h3>
              </div>
              <button
                onClick={() => setShowDownloadInfo(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              El archivo <b className="text-amber-400 font-mono">acordario-proyecto-guitarra.zip</b> se está descargando en tu carpeta de <span className="underline">Descargas</span> con el 100% del código fuente, audio y componentes.
            </p>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-2.5">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Terminal className="w-4 h-4" />
                <span>Cómo ejecutarlo en tu PC:</span>
              </span>

              <ol className="text-xs text-slate-300 list-decimal list-inside space-y-1.5 font-medium leading-relaxed">
                <li>Descomprime el archivo <span className="font-mono text-amber-300">.zip</span> en tu PC.</li>
                <li>Abre una terminal en esa carpeta.</li>
                <li>
                  Ejecuta:
                  <pre className="bg-slate-900 p-2 rounded-lg font-mono text-[11px] text-emerald-300 my-1 overflow-x-auto border border-slate-800">
                    npm install
                  </pre>
                </li>
                <li>
                  Inicia la aplicación con:
                  <pre className="bg-slate-900 p-2 rounded-lg font-mono text-[11px] text-emerald-300 my-1 overflow-x-auto border border-slate-800">
                    npm run dev
                  </pre>
                </li>
                <li>Abre en tu navegador: <span className="font-mono text-cyan-300">http://localhost:3000</span></li>
              </ol>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowDownloadInfo(false)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
