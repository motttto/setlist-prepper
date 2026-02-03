'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button, Input } from './ui';

interface GigEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { title: string; eventDate: string; startTime: string; venue: string }) => void;
  initialData: {
    title: string;
    eventDate: string;
    startTime: string;
    venue: string;
  };
}

export default function GigEditDialog({
  isOpen,
  onClose,
  onSave,
  initialData,
}: GigEditDialogProps) {
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [venue, setVenue] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTitle(initialData.title);
      setEventDate(initialData.eventDate);
      setStartTime(initialData.startTime);
      setVenue(initialData.venue);
    }
    // Only re-run when isOpen changes to true, not when initialData object reference changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleSave = () => {
    onSave({ title, eventDate, startTime, venue });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative bg-white dark:bg-zinc-800 rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Gig bearbeiten
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <Input
            label="Gig-Titel"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="z.B. Sommerfestival 2025"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Datum"
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
            <Input
              label="Konzertstart"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>

          <Input
            label="Venue"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            placeholder="z.B. Olympiastadion Berlin"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button onClick={handleSave}>
            Speichern
          </Button>
        </div>
      </div>
    </div>
  );
}
