'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  const [mounted, setMounted] = useState(false);

  // Ensure we're mounted before using portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTitle(initialData.title || '');
      setEventDate(initialData.eventDate || '');
      setStartTime(initialData.startTime || '');
      setVenue(initialData.venue || '');
    }
    // Only re-run when isOpen changes to true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleSave = useCallback(() => {
    onSave({ title, eventDate, startTime, venue });
    onClose();
  }, [title, eventDate, startTime, venue, onSave, onClose]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleClose();
  }, [handleClose]);

  const handleDialogClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  // Don't render anything if not open or not mounted
  if (!isOpen || !mounted) return null;

  const dialogContent = (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 99999 }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleBackdropClick}
        onMouseDown={handleBackdropClick}
      />

      {/* Dialog */}
      <div
        className="relative bg-white dark:bg-zinc-800 rounded-xl shadow-xl w-full max-w-md mx-4 p-6"
        onClick={handleDialogClick}
        onMouseDown={handleDialogClick}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Gig bearbeiten
          </h2>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleClose();
            }}
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
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleClose();
            }}
            className="px-4 py-2 text-base font-medium rounded-lg bg-zinc-200 text-zinc-900 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600 transition-colors"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSave();
            }}
            className="px-4 py-2 text-base font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            Speichern
          </button>
        </div>
      </div>
    </div>
  );

  // Use portal to render outside React tree
  return createPortal(dialogContent, document.body);
}
