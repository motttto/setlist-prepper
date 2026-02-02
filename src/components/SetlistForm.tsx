'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
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
import { Plus, Save, ArrowLeft, Settings2, X, Clock, Coffee, Star, Check, Cloud, CloudOff, Loader2, FileDown } from 'lucide-react';
import { exportSetlistToPdf } from '@/lib/pdfExport';
import Header from './Header';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRealtimeSetlist } from '@/hooks/useRealtimeSetlist';
import { PresenceIndicator } from './PresenceIndicator';
import { SetlistOperation } from '@/lib/realtimeTypes';

interface SetlistFormProps {
  initialSetlist?: Setlist;
  setlistId?: string;
  editorId?: string;
  editorName?: string;
}

export default function SetlistForm({
  initialSetlist,
  setlistId,
  editorId = 'anonymous',
  editorName = 'Anonymous',
}: SetlistFormProps) {
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
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Ref to track if update came from remote
  const isRemoteUpdateRef = useRef(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadRef = useRef(true);
  const skipNextAutoSaveRef = useRef(false);
  const AUTO_SAVE_DELAY = 2000;

  // Handle remote operations from other users
  const handleRemoteOperation = useCallback((operation: SetlistOperation) => {
    isRemoteUpdateRef.current = true;
    skipNextAutoSaveRef.current = true; // Skip auto-save for remote updates

    switch (operation.type) {
      case 'ADD_SONG':
        setSongs(prev => {
          const newSongs = [...prev];
          newSongs.splice(operation.position, 0, operation.song);
          return newSongs.map((s, i) => ({ ...s, position: i + 1 }));
        });
        break;

      case 'DELETE_SONG':
        setSongs(prev => {
          const filtered = prev.filter(s => s.id !== operation.songId);
          return filtered.map((s, i) => ({ ...s, position: i + 1 }));
        });
        if (selectedSongId === operation.songId) {
          setSelectedSongId(null);
        }
        break;

      case 'UPDATE_SONG':
        setSongs(prev => prev.map(s => {
          if (s.id !== operation.songId) return s;

          // Handle nested customFields updates
          if (typeof operation.field === 'string' && operation.field.startsWith('customFields.')) {
            const fieldKey = operation.field.replace('customFields.', '');
            return {
              ...s,
              customFields: { ...s.customFields, [fieldKey]: operation.value as string }
            };
          }

          return { ...s, [operation.field]: operation.value };
        }));
        break;

      case 'REORDER_SONGS':
        setSongs(prev => {
          const songMap = new Map(prev.map(s => [s.id, s]));
          return operation.songIds
            .map((id, i) => {
              const song = songMap.get(id);
              return song ? { ...song, position: i + 1 } : null;
            })
            .filter((s): s is Song => s !== null);
        });
        break;

      case 'UPDATE_METADATA':
        switch (operation.field) {
          case 'title':
            setTitle(operation.value || '');
            break;
          case 'eventDate':
            setEventDate(operation.value || '');
            break;
          case 'venue':
            setVenue(operation.value || '');
            break;
        }
        break;
    }

    // Reset flag after state update
    setTimeout(() => {
      isRemoteUpdateRef.current = false;
    }, 0);
  }, [selectedSongId]);

  // Realtime Hook
  const { presenceUsers, isConnected, broadcastOperation, updatePresence } = useRealtimeSetlist({
    setlistId: setlistId || '',
    editorId,
    editorName,
    onRemoteOperation: handleRemoteOperation,
    enabled: !!setlistId,
  });

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

  // Mark initial load complete after first render
  useEffect(() => {
    const timer = setTimeout(() => {
      initialLoadRef.current = false;
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Auto-save function
  const performAutoSave = useCallback(async () => {
    if (!title.trim() || !setlistId) return;

    setIsSaving(true);
    setSaveStatus('saving');
    setError('');

    try {
      const payload = {
        title,
        eventDate: eventDate || null,
        venue: venue || null,
        songs,
      };

      const response = await fetch(`/api/setlists/${setlistId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Speichern');
      }

      setLastSavedAt(new Date());
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern');
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  }, [setlistId, title, eventDate, venue, songs]);

  // Track changes and trigger auto-save (only for local changes, not remote, only when editing existing setlist)
  useEffect(() => {
    if (initialLoadRef.current || !setlistId) return;

    // Skip auto-save if this was a remote update
    if (skipNextAutoSaveRef.current) {
      skipNextAutoSaveRef.current = false;
      return;
    }

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new auto-save timeout
    autoSaveTimeoutRef.current = setTimeout(() => {
      performAutoSave();
    }, AUTO_SAVE_DELAY);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [title, eventDate, venue, songs, setlistId]);

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

    // Broadcast to others
    if (setlistId) {
      broadcastOperation({
        type: 'ADD_SONG',
        song: newSong,
        position: songs.length,
      });
    }
  };

  const addPause = () => {
    const newPause = createEmptySong(songs.length + 1, 'pause');
    setSongs([...songs, newPause]);
    setSelectedSongId(newPause.id);

    if (setlistId) {
      broadcastOperation({
        type: 'ADD_SONG',
        song: newPause,
        position: songs.length,
      });
    }
  };

  const addEncore = () => {
    const newEncore = createEmptySong(songs.length + 1, 'encore');
    setSongs([...songs, newEncore]);
    setSelectedSongId(newEncore.id);

    if (setlistId) {
      broadcastOperation({
        type: 'ADD_SONG',
        song: newEncore,
        position: songs.length,
      });
    }
  };

  // Update presence when selected song changes
  useEffect(() => {
    if (setlistId) {
      updatePresence(selectedSongId, null);
    }
  }, [selectedSongId, setlistId, updatePresence]);

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
    // Find what changed
    const oldSong = songs.find(s => s.id === songId);
    setSongs(songs.map((s) => (s.id === songId ? updatedSong : s)));

    // Broadcast changes (skip if this was a remote update)
    if (setlistId && !isRemoteUpdateRef.current && oldSong) {
      // Find changed fields and broadcast them
      const fields = Object.keys(updatedSong) as (keyof Song)[];
      for (const field of fields) {
        if (field === 'id' || field === 'position') continue;

        if (field === 'customFields') {
          // Handle custom fields separately
          const oldCustom = oldSong.customFields || {};
          const newCustom = updatedSong.customFields || {};
          for (const key of Object.keys(newCustom)) {
            if (oldCustom[key] !== newCustom[key]) {
              broadcastOperation({
                type: 'UPDATE_SONG',
                songId,
                field: `customFields.${key}`,
                value: newCustom[key],
              });
            }
          }
        } else if (JSON.stringify(oldSong[field]) !== JSON.stringify(updatedSong[field])) {
          broadcastOperation({
            type: 'UPDATE_SONG',
            songId,
            field,
            value: updatedSong[field],
          });
        }
      }
    }
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

    // Broadcast to others
    if (setlistId) {
      broadcastOperation({
        type: 'DELETE_SONG',
        songId,
      });
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
        const reorderedItems = newItems.map((song, i) => ({ ...song, position: i + 1 }));

        // Broadcast reorder to others
        if (setlistId) {
          broadcastOperation({
            type: 'REORDER_SONGS',
            songIds: reorderedItems.map(s => s.id),
          });
        }

        return reorderedItems;
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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Zurück
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {setlistId ? 'Gig bearbeiten' : 'Neuer Gig'}
            </h1>
            {/* Live Save Status Indicator */}
            {setlistId && (
              <div className="flex items-center gap-2">
                {saveStatus === 'saving' && (
                  <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Speichert...
                  </span>
                )}
                {saveStatus === 'saved' && (
                  <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                    <Cloud className="w-3 h-3" />
                    Gespeichert
                  </span>
                )}
                {saveStatus === 'error' && (
                  <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2 py-0.5 rounded-full">
                    <CloudOff className="w-3 h-3" />
                    Fehler
                  </span>
                )}
                {saveStatus === 'idle' && lastSavedAt && (
                  <span className="text-xs text-zinc-400 dark:text-zinc-500">
                    Zuletzt gespeichert {lastSavedAt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* PDF Export Button */}
            {songs.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => exportSetlistToPdf({ title, eventDate, songs })}
              >
                <FileDown className="w-4 h-4 mr-1" />
                PDF
              </Button>
            )}

            {/* Presence Indicator */}
            {setlistId && (
              <PresenceIndicator
                users={presenceUsers}
                currentUserId={editorId}
                currentUserName={editorName}
                isConnected={isConnected}
              />
            )}
          </div>
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
