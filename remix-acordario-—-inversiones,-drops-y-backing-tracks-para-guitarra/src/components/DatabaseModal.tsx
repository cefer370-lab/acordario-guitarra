import React, { useState } from 'react';
import { ChordType } from '../types/music';
import { DEFAULT_CHORD_TYPES, SCALES, parseDegreesToTones } from '../data/defaultChords';
import { Database, Plus, Trash2, RotateCcw, Download, Upload, X, Check, AlertCircle } from 'lucide-react';

interface DatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  chordTypes: ChordType[];
  onUpdateChordTypes: (updated: ChordType[]) => void;
}

export const DatabaseModal: React.FC<DatabaseModalProps> = ({
  isOpen,
  onClose,
  chordTypes,
  onUpdateChordTypes,
}) => {
  const [editingList, setEditingList] = useState<ChordType[]>(chordTypes);
  const [searchFilter, setSearchFilter] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  if (!isOpen) return null;

  const handleToggleActive = (index: number) => {
    const next = [...editingList];
    next[index] = { ...next[index], active: !next[index].active };
    setEditingList(next);
  };

  const handleFieldChange = (index: number, field: keyof ChordType, value: any) => {
    const next = [...editingList];
    if (field === 'degrees') {
      const tones = parseDegreesToTones(value);
      next[index] = { ...next[index], degrees: value, tones };
    } else if (field === 'aliases') {
      const aliasArr = String(value).split(',').map((s) => s.trim());
      next[index] = { ...next[index], aliases: aliasArr };
    } else {
      next[index] = { ...next[index], [field]: value };
    }
    setEditingList(next);
  };

  const handleAddNew = () => {
    const newChord: ChordType = {
      id: `custom_${Date.now()}`,
      name: 'add9',
      label: 'add9',
      aliases: ['add9', '2'],
      degrees: '1,3,5,9',
      tones: parseDegreesToTones('1,3,5,9'),
      scale: 'mayor',
      active: true,
    };
    setEditingList([newChord, ...editingList]);
  };

  const handleDelete = (index: number) => {
    const next = editingList.filter((_, i) => i !== index);
    setEditingList(next);
  };

  const handleResetDefaults = () => {
    if (window.confirm('¿Restaurar los tipos de acordes originales de la base de datos?')) {
      setEditingList(DEFAULT_CHORD_TYPES);
      onUpdateChordTypes(DEFAULT_CHORD_TYPES);
      setStatusMsg('Base de datos restaurada a los valores predeterminados.');
      setTimeout(() => setStatusMsg(''), 3000);
    }
  };

  const handleSave = () => {
    onUpdateChordTypes(editingList);
    setStatusMsg('Cambios guardados con éxito.');
    setTimeout(() => {
      setStatusMsg('');
      onClose();
    }, 800);
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(editingList, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', 'acordario_tipos_acordes.json');
    dlAnchor.click();
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          setEditingList(parsed);
          setStatusMsg('Base de datos importada exitosamente.');
          setTimeout(() => setStatusMsg(''), 3000);
        }
      } catch {
        alert('Archivo JSON no válido.');
      }
    };
    reader.readAsText(file);
  };

  const filteredList = editingList.filter(
    (c) =>
      c.label.toLowerCase().includes(searchFilter.toLowerCase()) ||
      c.id.toLowerCase().includes(searchFilter.toLowerCase()) ||
      c.degrees.includes(searchFilter)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100 font-display">
                Base de Datos de Acordes (Hoja "Tipos")
              </h2>
              <p className="text-xs text-slate-400">
                Personaliza los grados, etiquetas, alias y escalas asociadas para cada acorde
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

        {/* Action bar */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-950/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Buscar en la base de datos..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAddNew}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo Acorde</span>
            </button>

            <button
              onClick={handleExportJson}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700 transition"
              title="Exportar a JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar</span>
            </button>

            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700 transition cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Importar</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportJson}
                className="hidden"
              />
            </label>

            <button
              onClick={handleResetDefaults}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 text-xs border border-slate-700 transition"
              title="Restaurar a los 18 acordes originales"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurar</span>
            </button>
          </div>
        </div>

        {/* Table of chord types */}
        <div className="flex-1 overflow-y-auto p-4">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-2">Activo</th>
                <th className="py-2.5 px-2">ID</th>
                <th className="py-2.5 px-2">Símbolo</th>
                <th className="py-2.5 px-2">Etiqueta</th>
                <th className="py-2.5 px-2">Grados</th>
                <th className="py-2.5 px-2">Escala Asociada</th>
                <th className="py-2.5 px-2">Alias</th>
                <th className="py-2.5 px-2 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredList.map((chord, idx) => {
                const realIndex = editingList.indexOf(chord);
                return (
                  <tr key={`chord-${realIndex}`} className="hover:bg-slate-800/30 transition">
                    <td className="py-2 px-2">
                      <input
                        type="checkbox"
                        checked={chord.active !== false}
                        onChange={() => handleToggleActive(realIndex)}
                        className="accent-amber-500 rounded cursor-pointer"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={chord.id}
                        onChange={(e) => handleFieldChange(realIndex, 'id', e.target.value)}
                        className="w-16 bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-slate-200 font-mono"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={chord.name}
                        onChange={(e) => handleFieldChange(realIndex, 'name', e.target.value)}
                        className="w-16 bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-slate-200 font-bold"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={chord.label}
                        onChange={(e) => handleFieldChange(realIndex, 'label', e.target.value)}
                        className="w-20 bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-slate-200"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={chord.degrees}
                        onChange={(e) => handleFieldChange(realIndex, 'degrees', e.target.value)}
                        className="w-24 bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-amber-300 font-mono"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <select
                        value={chord.scale || 'mayor'}
                        onChange={(e) => handleFieldChange(realIndex, 'scale', e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-slate-200 text-xs"
                      >
                        {SCALES.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={chord.aliases.join(', ')}
                        onChange={(e) => handleFieldChange(realIndex, 'aliases', e.target.value)}
                        className="w-32 bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-slate-400 font-mono text-[11px]"
                      />
                    </td>
                    <td className="py-2 px-2 text-right">
                      <button
                        onClick={() => handleDelete(realIndex)}
                        className="p-1 text-slate-500 hover:text-rose-400 transition"
                        title="Eliminar este acorde"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <span className="text-xs text-emerald-400 font-semibold">{statusMsg}</span>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 transition"
            >
              Cerrar
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition"
            >
              <Check className="w-4 h-4" />
              <span>Guardar Cambios</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
