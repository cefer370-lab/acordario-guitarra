import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, Volume2, FastForward, Repeat, X, Upload, Link as LinkIcon, Music } from 'lucide-react';

interface AudioPlayerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AudioPlayerDrawer: React.FC<AudioPlayerDrawerProps> = ({ isOpen, onClose }) => {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioName, setAudioName] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [loopA, setLoopA] = useState<number | null>(null);
  const [loopB, setLoopB] = useState<number | null>(null);
  const [isLooping, setIsLooping] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    setAudioName(file.name);
    setIsPlaying(false);
    setLoopA(null);
    setLoopB(null);
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const curr = audioRef.current.currentTime;
    setCurrentTime(curr);

    if (isLooping && loopA !== null && loopB !== null && loopB > loopA) {
      if (curr >= loopB) {
        audioRef.current.currentTime = loopA;
      }
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-800 p-4 shadow-2xl backdrop-blur-md animate-slide-up">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left: Info & Upload */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
            <Music className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1 sm:flex-initial">
            <h4 className="text-sm font-bold text-slate-100 truncate max-w-[200px]">
              {audioName || 'Reproductor de Audio de Práctica'}
            </h4>
            <p className="text-[11px] text-slate-400">
              {audioUrl ? 'Práctica con control de velocidad y A-B loop' : 'Carga un MP3 o WAV'}
            </p>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700 transition"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Cargar Audio</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            accept="audio/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Center: Controls & Scrubber */}
        {audioUrl && (
          <div className="flex flex-col items-center gap-2 w-full max-w-md">
            <audio
              ref={audioRef}
              src={audioUrl}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
              onEnded={() => setIsPlaying(false)}
            />

            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  if (audioRef.current) audioRef.current.currentTime = Math.max(0, currentTime - 5);
                }}
                className="text-slate-400 hover:text-slate-200 text-xs font-mono"
                title="Retroceder 5 segundos"
              >
                -5s
              </button>

              <button
                onClick={togglePlay}
                className="w-10 h-10 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-md hover:bg-amber-400 transition"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>

              <button
                onClick={() => {
                  if (audioRef.current) audioRef.current.currentTime = Math.min(duration, currentTime + 5);
                }}
                className="text-slate-400 hover:text-slate-200 text-xs font-mono"
                title="Adelantar 5 segundos"
              >
                +5s
              </button>

              {/* Speed controls */}
              <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 text-[11px] font-bold">
                {[0.75, 0.9, 1.0, 1.15].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => setPlaybackRate(rate)}
                    className={`px-1.5 py-0.5 rounded ${
                      playbackRate === rate ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>

            {/* Scrubber */}
            <div className="flex items-center gap-2 w-full text-[11px] text-slate-400 font-mono">
              <span>{formatTime(currentTime)}</span>
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setCurrentTime(val);
                  if (audioRef.current) audioRef.current.currentTime = val;
                }}
                className="flex-1 accent-amber-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
              />
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        )}

        {/* Right: Loop A-B & Close */}
        <div className="flex items-center gap-2">
          {audioUrl && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <button
                onClick={() => setLoopA(currentTime)}
                className={`px-2 py-1 rounded border text-[11px] font-mono ${
                  loopA !== null ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'border-slate-800'
                }`}
              >
                A: {loopA !== null ? formatTime(loopA) : '--'}
              </button>
              <button
                onClick={() => setLoopB(currentTime)}
                className={`px-2 py-1 rounded border text-[11px] font-mono ${
                  loopB !== null ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'border-slate-800'
                }`}
              >
                B: {loopB !== null ? formatTime(loopB) : '--'}
              </button>
              <button
                onClick={() => setIsLooping(!isLooping)}
                className={`p-1.5 rounded-lg border ${
                  isLooping ? 'bg-emerald-500 text-slate-950 border-emerald-400' : 'border-slate-800 text-slate-400'
                }`}
                title="Activar A-B Loop"
              >
                <Repeat className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
