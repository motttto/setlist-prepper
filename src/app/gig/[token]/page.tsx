'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { v4 as uuidv4 } from 'uuid';
import { Song, CustomField } from '@/types';
import SongCard from '@/components/SongCard';
import { Button, Input, Card } from '@/components/ui';
import { Plus, Save, Lock, Music2, Coffee, Star, Clock, AlertTriangle, RefreshCw, User } from 'lucide-react';
import { SongType } from '@/types';

export default function SharedGigPage() {
  const params = useParams();
  const token = params.token as string;

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [storedPassword, setStoredPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [venue, setVenue] = useState('');
  const [songs, setSongs] = useState<Song[]>([]);
  const [customFields] = useState<CustomField[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [editorName, setEditorName] = useState('');
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [updatedAt, setUpdatedAt] = useState('');
  const [lastEditedBy, setLastEditedBy] = useState('');
  const [hasConflict, setHasConflict] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleAuthenticate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError('');

    try {
      const response = await fetch(`/api/gig/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setAuthError(data.error || 'Zugriff verweigert');
        return;
      }

      setStoredPassword(password);
      setTitle(data.data.title);
      setEventDate(data.data.eventDate || '');
      setVenue(data.data.venue || '');
      setSongs(data.data.songs || []);
      setUpdatedAt(data.data.updatedAt || '');
      setLastEditedBy(data.data.lastEditedBy || '');
      setIsAuthenticated(true);
      setShowNamePrompt(true); // Frage nach dem Namen beim ersten Zugriff
    } catch (err) {
      console.error('Auth error:', err);
      setAuthError('Verbindungsfehler');
    } finally {
      setIsLoading(false);
    }
  };

  const createEmptySong = useCallback(
    (position: number, type: SongType = 'song'): Song => ({
      id: uuidv4(),
      position,
      type,
      title: type === 'pause' ? 'Pause' : type === 'encore' ? 'Zugabe' : '',
      duration: '',
      lyrics: '',
      visualDescription: '',
      timingBpm: '',
      transitionTypes: [],
      transitions: '',
      lighting: '',
      mediaLinks: [],
      stageDirections: '',
      audioCues: '',
      customFields: {},
    }),
    []
  );

  const addPause = () => {
    setSongs([...songs, createEmptySong(songs.length + 1, 'pause')]);
  };

  const addEncore = () => {
    setSongs([...songs, createEmptySong(songs.length + 1, 'encore')]);
  };

  const calculateTotalDuration = () => {
    let totalMinutes = 0;
    let totalSeconds = 0;

    songs.forEach((song) => {
      if (song.duration) {
        const parts = song.duration.split(':');
        if (parts.length === 2) {
          totalMinutes += parseInt(parts[0], 10) || 0;
          totalSeconds += parseInt(parts[1], 10) || 0;
        }
      }
    });

    totalMinutes += Math.floor(totalSeconds / 60);
    totalSeconds = totalSeconds % 60;

    return `${totalMinutes}:${totalSeconds.toString().padStart(2, '0')}`;
  };

  const addSong = () => {
    setSongs([...songs, createEmptySong(songs.length + 1)]);
  };

  const updateSong = (index: number, updatedSong: Song) => {
    const newSongs = [...songs];
    newSongs[index] = updatedSong;
    setSongs(newSongs);
  };

  const deleteSong = (index: number) => {
    const newSongs = songs.filter((_, i) => i !== index);
    setSongs(newSongs.map((song, i) => ({ ...song, position: i + 1 })));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSongs((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);
        return newItems.map((song, i) => ({ ...song, position: i + 1 }));
      });
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setSaveError('Bitte gib einen Titel ein');
      return;
    }

    setIsSaving(true);
    setSaveError('');
    setSaveSuccess(false);
    setHasConflict(false);

    try {
      const response = await fetch(`/api/gig/${token}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: storedPassword,
          title,
          eventDate: eventDate || null,
          venue: venue || null,
          songs,
          editorName: editorName || 'Unbekannt',
          expectedUpdatedAt: updatedAt,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === 'CONFLICT') {
          setHasConflict(true);
          setSaveError(data.error);
        } else {
          throw new Error(data.error || 'Fehler beim Speichern');
        }
        return;
      }

      // Update local state mit neuem Timestamp
      setUpdatedAt(data.updatedAt);
      setLastEditedBy(data.lastEditedBy);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Fehler beim Speichern');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReload = async () => {
    setIsLoading(true);
    setHasConflict(false);
    setSaveError('');

    try {
      const response = await fetch(`/api/gig/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: storedPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        setTitle(data.data.title);
        setEventDate(data.data.eventDate || '');
        setVenue(data.data.venue || '');
        setSongs(data.data.songs || []);
        setUpdatedAt(data.data.updatedAt || '');
        setLastEditedBy(data.data.lastEditedBy || '');
      }
    } catch (err) {
      console.error('Reload error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Passwort-Eingabe Ansicht
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full mb-4">
              <Lock className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Geteilter Gig
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-2">
              Gib das Passwort ein, um auf diesen Gig zuzugreifen
            </p>
          </div>

          <form onSubmit={handleAuthenticate} className="space-y-4">
            {authError && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                {authError}
              </div>
            )}

            <Input
              label="Passwort"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Gig-Passwort eingeben"
              required
            />

            <Button type="submit" className="w-full" isLoading={isLoading}>
              <Lock className="w-4 h-4 mr-2" />
              Zugreifen
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  // Name-Eingabe Modal
  if (showNamePrompt) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full mb-4">
              <User className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Wer bist du?
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-2">
              Dein Name wird angezeigt, wenn du Änderungen speicherst
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (editorName.trim()) {
                setShowNamePrompt(false);
              }
            }}
            className="space-y-4"
          >
            <Input
              label="Dein Name"
              value={editorName}
              onChange={(e) => setEditorName(e.target.value)}
              placeholder="z.B. Max, Drummer, Gitarrist..."
              required
            />

            <Button type="submit" className="w-full" disabled={!editorName.trim()}>
              Weiter zum Gig
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  // Gig-Bearbeitungs-Ansicht
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      {/* Header */}
      <header className="bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg">
              <Music2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                {title || 'Geteilter Gig'}
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Bearbeitet als: {editorName}
              </p>
            </div>
          </div>
          {updatedAt && (
            <div className="text-right text-sm text-zinc-500 dark:text-zinc-400">
              <p>Zuletzt bearbeitet:</p>
              <p className="font-medium">{formatDate(updatedAt)}</p>
              {lastEditedBy && <p>von {lastEditedBy}</p>}
            </div>
          )}
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 pb-24">
        {/* Konflikt-Warnung */}
        {hasConflict && (
          <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-amber-800 dark:text-amber-200">
                  Bearbeitungskonflikt
                </h3>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  Jemand anderes hat den Gig bearbeitet, während du Änderungen gemacht hast.
                  Lade die Seite neu, um die neueste Version zu sehen (deine Änderungen gehen dabei verloren).
                </p>
                <Button
                  onClick={handleReload}
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  isLoading={isLoading}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Neu laden
                </Button>
              </div>
            </div>
          </div>
        )}

        {saveError && !hasConflict && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
            {saveError}
          </div>
        )}

        {saveSuccess && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-600 dark:text-green-400 text-sm">
            Änderungen gespeichert!
          </div>
        )}

        {/* Metadata */}
        <Card className="mb-6">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            Event-Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Gig-Titel"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Sommerfestival 2025"
              required
            />
            <Input
              label="Datum"
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
            <Input
              label="Venue"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="z.B. Olympiastadion Berlin"
            />
          </div>
        </Card>

        {/* Songs List */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Songs ({songs.length})
              </h2>
              <div className="flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400">
                <Clock className="w-4 h-4" />
                <span>Gesamt: {calculateTotalDuration()}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={addSong} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Song
              </Button>
              <Button onClick={addPause} size="sm" variant="secondary">
                <Coffee className="w-4 h-4 mr-2" />
                Pause
              </Button>
              <Button onClick={addEncore} size="sm" variant="secondary">
                <Star className="w-4 h-4 mr-2" />
                Zugabe
              </Button>
            </div>
          </div>

          {songs.length === 0 ? (
            <Card className="text-center py-12">
              <p className="text-zinc-500 dark:text-zinc-400 mb-4">
                Noch keine Songs hinzugefügt
              </p>
              <Button onClick={addSong}>
                <Plus className="w-4 h-4 mr-2" />
                Ersten Song hinzufügen
              </Button>
            </Card>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={songs.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {songs.map((song, index) => (
                    <SongCard
                      key={song.id}
                      song={song}
                      customFields={customFields}
                      onChange={(updated) => updateSong(index, updated)}
                      onDelete={() => deleteSong(index)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Fixed Save Button */}
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-700 p-4">
          <div className="max-w-4xl mx-auto flex justify-end">
            <Button onClick={handleSave} isLoading={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              Speichern
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
