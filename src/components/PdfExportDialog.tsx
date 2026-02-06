'use client';

import { useState } from 'react';
import Modal from './ui/Modal';
import { Button } from './ui';
import { FileDown, ListMusic, BookOpen } from 'lucide-react';

export type PdfExportMode = 'tracklist' | 'full';

interface PdfExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (mode: PdfExportMode) => void;
}

export default function PdfExportDialog({
  isOpen,
  onClose,
  onExport,
}: PdfExportDialogProps) {
  const [selectedMode, setSelectedMode] = useState<PdfExportMode>('tracklist');

  const handleExport = () => {
    onExport(selectedMode);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="PDF exportieren" size="sm">
      <div className="space-y-3">
        {/* Tracklist Option */}
        <button
          onClick={() => setSelectedMode('tracklist')}
          className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
            selectedMode === 'tracklist'
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
              : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
          }`}
        >
          <div className="flex items-center gap-3">
            <ListMusic className={`w-5 h-5 ${
              selectedMode === 'tracklist' ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400'
            }`} />
            <div>
              <div className={`font-medium ${
                selectedMode === 'tracklist' ? 'text-indigo-700 dark:text-indigo-300' : 'text-zinc-700 dark:text-zinc-300'
              }`}>
                Nur Trackliste
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Zeitplan, Songtitel und Dauer
              </div>
            </div>
          </div>
        </button>

        {/* Full Export Option */}
        <button
          onClick={() => setSelectedMode('full')}
          className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
            selectedMode === 'full'
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
              : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
          }`}
        >
          <div className="flex items-center gap-3">
            <BookOpen className={`w-5 h-5 ${
              selectedMode === 'full' ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400'
            }`} />
            <div>
              <div className={`font-medium ${
                selectedMode === 'full' ? 'text-indigo-700 dark:text-indigo-300' : 'text-zinc-700 dark:text-zinc-300'
              }`}>
                Vollständig mit Anweisungen
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Alle Details: Licht, Bühne, Audio, Texte, Notizen
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 mt-5">
        <Button variant="secondary" onClick={onClose}>
          Abbrechen
        </Button>
        <Button onClick={handleExport}>
          <FileDown className="w-4 h-4 mr-2" />
          Exportieren
        </Button>
      </div>
    </Modal>
  );
}
