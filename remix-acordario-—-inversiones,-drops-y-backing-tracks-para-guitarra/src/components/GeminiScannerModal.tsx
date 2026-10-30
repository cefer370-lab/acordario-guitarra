import React, { useState, useRef } from 'react';
import { Camera, Upload, Sparkles, X, Check, AlertCircle, FileText, Loader2, Music } from 'lucide-react';

interface GeminiScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyProgression: (progressionText: string, title?: string, bpm?: number, style?: string) => void;
}

// Sample lead sheet images generated as clean canvas charts for instant testing
const SAMPLE_PREVIEWS = [
  {
    name: 'Autumn Leaves (Real Book)',
    title: 'Autumn Leaves',
    bpm: 135,
    style: 'swing',
    previewText: 'Cm7 | F7 | Bbmaj7 | Ebmaj7\nAm7b5 | D7 | Gm | %',
  },
  {
    name: 'Blue Bossa (Kenny Dorham)',
    title: 'Blue Bossa',
    bpm: 140,
    style: 'bossa',
    previewText: 'Cm7 | % | Fm7 | %\nDm7b5 | G7 | Cm7 | %\nEbm7 | Ab7 | Dbmaj7 | %',
  },
  {
    name: 'Minor Swing (Django Reinhardt)',
    title: 'Minor Swing',
    bpm: 180,
    style: 'manouche',
    previewText: 'Am6 | % | Dm6 | %\nE7 | % | Am6 | %',
  },
];

export const GeminiScannerModal: React.FC<GeminiScannerModalProps> = ({
  isOpen,
  onClose,
  onApplyProgression,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>('image/jpeg');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<any | null>(null);
  const [scanError, setScanError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setScanError('Por favor selecciona un archivo de imagen (JPG, PNG o WEBP).');
      return;
    }

    setImageMime(file.type);
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
      setScanResult(null);
      setScanError('');
    };
    reader.readAsDataURL(file);
  };

  const processWithGemini = async (base64Img: string, mime: string) => {
    setIsScanning(true);
    setScanError('');
    setScanResult(null);

    try {
      const response = await fetch('/api/gemini/extract-grid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Img,
          mimeType: mime,
        }),
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) {
        throw new Error(resData.error || 'Error procesando la imagen con Gemini.');
      }

      setScanResult(resData.data);
    } catch (err: any) {
      console.error(err);
      setScanError(err.message || 'No se pudo leer la imagen. Intenta con una foto más nítida.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleApply = () => {
    if (!scanResult) return;
    onApplyProgression(
      scanResult.formattedProgression,
      scanResult.title,
      scanResult.bpm,
      scanResult.style
    );
    onClose();
  };

  // Helper to load sample chart
  const handleLoadSample = (sample: typeof SAMPLE_PREVIEWS[0]) => {
    // Generate a simple lead sheet graphic in canvas
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 360;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#fdfbf7';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(sample.name, 30, 45);

    ctx.font = '14px monospace';
    ctx.fillStyle = '#475569';
    ctx.fillText(`Tempo: ${sample.bpm} BPM   Style: ${sample.style}`, 30, 75);

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(30, 95);
    ctx.lineTo(570, 95);
    ctx.stroke();

    const lines = sample.previewText.split('\n');
    lines.forEach((line, i) => {
      ctx.font = 'bold 20px serif';
      ctx.fillStyle = '#0f172a';
      ctx.fillText(line, 40, 150 + i * 55);

      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(30, 170 + i * 55);
      ctx.lineTo(570, 170 + i * 55);
      ctx.stroke();
    });

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setSelectedImage(dataUrl);
    setImageMime('image/jpeg');
    processWithGemini(dataUrl, 'image/jpeg');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100 font-display">
                Lector de Grillas y Partituras con IA (Gemini)
              </h2>
              <p className="text-xs text-slate-400">
                Sube o toma una foto de un Real Book, grilla de acordes o chart manuscrito
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
          {/* Upload and Camera triggers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2.5 p-4 rounded-2xl bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/40 text-slate-200 font-semibold text-sm transition group"
            >
              <Upload className="w-4 h-4 text-amber-400 group-hover:scale-110 transition" />
              <span>Subir Foto o Captura</span>
            </button>

            <button
              onClick={() => cameraInputRef.current?.click()}
              className="flex items-center justify-center gap-2.5 p-4 rounded-2xl bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/40 text-slate-200 font-semibold text-sm transition group"
            >
              <Camera className="w-4 h-4 text-amber-400 group-hover:scale-110 transition" />
              <span>Tomar Foto con Cámara</span>
            </button>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <input
              type="file"
              ref={cameraInputRef}
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Preset quick test samples */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              O prueba un ejemplo de partitura rápido:
            </span>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_PREVIEWS.map((sample, i) => (
                <button
                  key={`sample-${i}`}
                  onClick={() => handleLoadSample(sample)}
                  className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 font-medium transition flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>{sample.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Image preview and scan status */}
          {selectedImage && (
            <div className="flex flex-col gap-3 bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                <span>Vista Previa de la Imagen</span>
                {!isScanning && (
                  <button
                    onClick={() => processWithGemini(selectedImage, imageMime)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Re-analizar con Gemini</span>
                  </button>
                )}
              </div>

              <div className="relative rounded-xl overflow-hidden max-h-56 bg-black flex items-center justify-center border border-slate-800">
                <img
                  src={selectedImage}
                  alt="Lead sheet preview"
                  className="max-h-56 w-auto object-contain"
                />
                {isScanning && (
                  <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                    <span className="text-sm font-semibold text-slate-200">
                      Gemini 3.8 Flash transcribiendo la partitura...
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Scan Error */}
          {scanError && (
            <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs sm:text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
              <span>{scanError}</span>
            </div>
          )}

          {/* Extracted result display */}
          {scanResult && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-emerald-400 flex items-center gap-1.5">
                  <Check className="w-4 h-4" />
                  <span>Progresión detectada exitosamente</span>
                </span>
                <span className="text-slate-400">
                  {scanResult.bpm ? `${scanResult.bpm} BPM` : ''} · {scanResult.style || 'swing'}
                </span>
              </div>

              {scanResult.title && (
                <div className="text-lg font-bold text-slate-100 font-display">
                  {scanResult.title}
                  {scanResult.composer && (
                    <span className="text-xs font-normal text-slate-400 ml-2">
                      ({scanResult.composer})
                    </span>
                  )}
                </div>
              )}

              <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-3 font-mono text-xs sm:text-sm text-amber-300 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                {scanResult.formattedProgression}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-800 bg-slate-950/60">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-400 hover:text-slate-200 transition"
          >
            Cancelar
          </button>
          <button
            disabled={!scanResult || isScanning}
            onClick={handleApply}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-xs sm:text-sm shadow-md transition"
          >
            <Music className="w-4 h-4" />
            <span>Cargar en Backing Track</span>
          </button>
        </div>
      </div>
    </div>
  );
};
