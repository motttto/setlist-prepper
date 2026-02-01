'use client';

import { useState, useCallback, useEffect } from 'react';
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
import { Song, CustomField, Setlist, SongType } from '@/types';
import SongListItem from './SongListItem';
import SongDetailsPanel from './SongDetailsPanel';
import { Button, Input, Card } from './ui';
import { Plus, Save, ArrowLeft, Settings2, X, Clock, Coffee, Star, Check } from 'lucide-react';
import Header from './Header';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface SetlistFormProps {
  initialSetlist?: Setlist;
  setlistId?: string;
}

export default function SetlistForm({ initialSetlist, setlistId }: SetlistFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialSetlist?.title || '');
  const [eventDate, setEventDate] = useState(initialSetlist?.eventDate || '');
  const [venue, setVenue] = useState(initialSetlist?.venue || '');
  const [songs, setSongs] = useState<Song[]>(initialSetlist?.songs || []);
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showFieldManager, setShowFieldManager] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load custom fields
  useEffect(() => {
    const loadCustomFields = async () => {
      try {
        const response = await fetch('/api/custom-fields');
        const data = await response.json();
        if (data.data) {
          setCustomFields(data.data);
        }
      } catch (err) {
        console.error('Error loading custom fields:', err);
      }
    };
    loadCustomFields();
  }, []);

  // Select first song if none selected
  useEffect(() => {
    if (!selectedSongId && songs.length > 0) {
      setSelectedSongId(songs[0].id);
    }
  }, [songs, selectedSongId]);

  const createEmptySong = useCallback(
    (position: number, type: SongType = 'song'): Song => ({
      id: uuidv4(),
      position,
      type,
      title: type === 'pause' ? 'Pause' : type === 'encore' ? '--- ZUGABE ---' : '',
      duration: type === 'pause' ? '15:00' : '',
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

  const addSong = () => {
    const newSong = createEmptySong(songs.length + 1, 'song');
    setSongs([...songs, newSong]);
    setSelectedSongId(newSong.id);
  };

  const addPause = () => {
    const newPause = createEmptySong(songs.length + 1, 'pause');
    setSongs([...songs, newPause]);
    setSelectedSongId(newPause.id);
  };

  const addEncore = () => {
    const newEncore = createEmptySong(songs.length + 1, 'encore');
    setSongs([...songs, newEncore]);
    setSelectedSongId(newEncore.id);
  };

  // Berechne Gesamtlänge
  const calculateTotalDuration = () => {
    let totalSeconds = 0;
    songs.forEach((song) => {
      if (song.duration) {
        const parts = song.duration.split(':');
        if (parts.length === 2) {
          totalSeconds += parseInt(parts[0] || '0') * 60 + parseInt(parts[1] || '0');
        } else if (parts.length === 1) {
          totalSeconds += parseInt(parts[0] || '0') * 60;
        }
      }
    });
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const updateSong = (songId: string, updatedSong: Song) => {
    setSongs(songs.map((s) => (s.id === songId ? updatedSong : s)));
  };

  const updateSongDuration = (songId: string, minutes: string, seconds: string) => {
    const duration = `${minutes || '0'}:${seconds || '00'}`;
    setSongs(songs.map((s) => (s.id === songId ? { ...s, duration } : s)));
  };

  const updateSongTitle = (songId: string, title: string) => {
    setSongs(songs.map((s) => (s.id === songId ? { ...s, title } : s)));
  };

  const deleteSong = (songId: string) => {
    const newSongs = songs.filter((s) => s.id !== songId);
    // Update positions
    const updatedSongs = newSongs.map((song, i) => ({ ...song, position: i + 1 }));
    setSongs(updatedSongs);

    // Select another song if deleted was selected
    if (selectedSongId === songId) {
      setSelectedSongId(updatedSongs.length > 0 ? updatedSongs[0].id : null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSongs((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);
        // Update positions
        return newItems.map((song, i) => ({ ...song, position: i + 1 }));
      });
    }
  };

  const addCustomField = async () => {
    if (!newFieldName.trim()) return;

    try {
      const response = await fetch('/api/custom-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldName: newFieldName.trim(), fieldType: 'text' }),
      });

      const data = await response.json();
      if (data.data) {
        setCustomFields([...customFields, data.data]);
        setNewFieldName('');
      }
    } catch (err) {
      console.error('Error adding custom field:', err);
    }
  };

  const deleteCustomField = async (fieldId: string) => {
    try {
      await fetch(`/api/custom-fields?id=${fieldId}`, { method: 'DELETE' });
      setCustomFields(customFields.filter((f) => f.id !== fieldId));
    } catch (err) {
      console.error('Error deleting custom field:', err);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Bitte gib einen Titel ein');
      return;
    }

    setIsSaving(true);
    setError('');
    setSaveSuccess(false);

    try {
      const payload = {
        title,
        eventDate: eventDate || null,
        venue: venue || null,
        songs,
      };

      const url = setlistId ? `/api/setlists/${setlistId}` : '/api/setlists';
      const method = setlistId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Speichern');
      }

      // Bei neuem Gig: URL aktualisieren ohne Reload
      if (!setlistId && data.data?.id) {
        window.history.replaceState({}, '', `/setlist/${data.data.id}`);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedSong = songs.find((s) => s.id === selectedSongId) || null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <Header />

      <div className="max-w-7xl mx-auto p-4 pb-24">
        {/* Page Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Zurück
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {setlistId ? 'Gig bearbeiten' : 'Neuer Gig'}
          </h1>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {saveSuccess && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-600 dark:text-green-400 text-sm flex items-center gap-2">
            <Check className="w-4 h-4" />
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

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Song List */}
          <div>
            {/* Song List Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  Songs ({songs.filter((s) => (s.type || 'song') === 'song').length})
                </h2>
                {songs.length > 0 && (
                  <div className="flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400">
                    <Clock className="w-4 h-4" />
                    {calculateTotalDuration()}
                  </div>
                )}
              </div>
            </div>

            {/* Add Buttons */}
            <div className="flex gap-2 mb-4">
              <Button onClick={addSong} size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Song
              </Button>
              <Button onClick={addPause} variant="secondary" size="sm">
                <Coffee className="w-4 h-4 mr-1" />
                Pause
              </Button>
              <Button onClick={addEncore} variant="secondary" size="sm">
                <Star className="w-4 h-4 mr-1" />
                Zugabe
              </Button>
            </div>

            {/* Song List */}
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
                  <div className="space-y-2">
                    {songs.map((song) => (
                      <SongListItem
                        key={song.id}
                        song={song}
                        isSelected={selectedSongId === song.id}
                        onSelect={() => setSelectedSongId(song.id)}
                        onDelete={() => deleteSong(song.id)}
                        onDurationChange={(min, sec) => updateSongDuration(song.id, min, sec)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            {/* Custom Fields Manager */}
            <Card className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-zinc-500" />
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    Eigene Felder
                  </h2>
                  <span className="text-sm text-zinc-500">({customFields.length})</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFieldManager(!showFieldManager)}
                >
                  {showFieldManager ? 'Schließen' : 'Verwalten'}
                </Button>
              </div>

              {showFieldManager && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      value={newFieldName}
                      onChange={(e) => setNewFieldName(e.target.value)}
                      placeholder="Neues Feld (z.B. Pyro-Cues)"
                      onKeyDown={(e) => e.key === 'Enter' && addCustomField()}
                    />
                    <Button onClick={addCustomField} size="sm">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  {customFields.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {customFields.map((field) => (
                        <div
                          key={field.id}
                          className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full text-sm"
                        >
                          <span className="text-zinc-700 dark:text-zinc-300">{field.fieldName}</span>
                          <button
                            onClick={() => deleteCustomField(field.id)}
                            className="text-zinc-400 hover:text-red-500"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-500">
                      Noch keine eigenen Felder. Füge Felder hinzu, die bei jedem Song erscheinen.
                    </p>
                  )}
                </div>
              )}

              {!showFieldManager && customFields.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {customFields.map((field) => (
                    <span
                      key={field.id}
                      className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-xs text-zinc-600 dark:text-zinc-400"
                    >
                      {field.fieldName}
                    </span>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Right Column - Song Details */}
          <div className="lg:sticky lg:top-4 lg:self-start">
            <Card className="h-[calc(100vh-200px)] min-h-[500px] overflow-hidden">
              <SongDetailsPanel
                song={selectedSong}
                customFields={customFields}
                onChange={(updated) => updateSong(updated.id, updated)}
              />
            </Card>
          </div>
        </div>

        {/* Fixed Save Button */}
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-700 p-4">
          <div className="max-w-7xl mx-auto flex justify-end gap-3">
            <Link href="/dashboard">
              <Button variant="secondary">Abbrechen</Button>
            </Link>
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
