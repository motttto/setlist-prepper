'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
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
import SongListItem from '@/components/SongListItem';
import SongDetailsPanel from '@/components/SongDetailsPanel';
import { Button, Input, Card } from '@/components/ui';
import { Plus, Save, Lock, Music2, Coffee, Star, Clock, AlertTriangle, RefreshCw, User } from 'lucide-react';
import { SongType } from '@/types';
import { useRealtimeSetlist } from '@/hooks/useRealtimeSetlist';
import { PresenceIndicator } from '@/components/PresenceIndicator';
import { SetlistOperation } from '@/lib/realtimeTypes';

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
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [customFields] = useState<CustomField[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [editorName, setEditorName] = useState('');
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [updatedAt, setUpdatedAt] = useState('');
  const [lastEditedBy, setLastEditedBy] = useState('');
  const [hasConflict, setHasConflict] = useState(false);
  const [sessionId] = useState(() => uuidv4());

  const isRemoteUpdateRef = useRef(false);

  const handleRemoteOperation = useCallback((operation: SetlistOperation) => {
    isRemoteUpdateRef.current = true;

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

    setTimeout(() => {
      isRemoteUpdateRef.current = false;
    }, 0);
  }, [selectedSongId]);

  const { presenceUsers, isConnected, broadcastOperation, updatePresence } = useRealtimeSetlist({
    setlistId: `shared:${token}`,
    editorId: sessionId,
    editorName: editorName || 'Unbekannt',
    onRemoteOperation: handleRemoteOperation,
    enabled: isAuthenticated && !showNamePrompt,
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Update presence when selected song changes
  useEffect(() => {
    if (isAuthenticated && !showNamePrompt) {
      updatePresence(selectedSongId, null);
    }
  }, [selectedSongId, isAuthenticated, showNamePrompt, updatePresence]);

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
      setShowNamePrompt(true);
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

  const addSong = () => {
    const newSong = createEmptySong(songs.length + 1, 'song');
    setSongs([...songs, newSong]);
    setSelectedSongId(newSong.id);
    broadcastOperation({
      type: 'ADD_SONG',
      song: newSong,
      position: songs.length,
    });
  };

  const addPause = () => {
    const newSong = createEmptySong(songs.length + 1, 'pause');
    setSongs([...songs, newSong]);
    setSelectedSongId(newSong.id);
    broadcastOperation({
      type: 'ADD_SONG',
      song: newSong,
      position: songs.length,
    });
  };

  const addEncore = () => {
    const newSong = createEmptySong(songs.length + 1, 'encore');
    setSongs([...songs, newSong]);
    setSelectedSongId(newSong.id);
    broadcastOperation({
      type: 'ADD_SONG',
      song: newSong,
      position: songs.length,
    });
  };

  const calculateTotalDuration = () => {
    let totalSeconds = 0;
    songs.forEach((song) => {
      if (song.duration) {
        const parts = song.duration.split(':');
        if (parts.length === 2) {
          totalSeconds += parseInt(parts[0] || '0') * 60 + parseInt(parts[1] || '0');
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
    const oldSong = songs.find(s => s.id === songId);
    setSongs(songs.map((s) => (s.id === songId ? updatedSong : s)));

    if (!isRemoteUpdateRef.current && oldSong) {
      const fields = Object.keys(updatedSong) as (keyof Song)[];
      for (const field of fields) {
        if (field === 'id' || field === 'position') continue;

        if (field === 'customFields') {
          const oldCustom = oldSong.customFields || {};
          const newCustom = updatedSong.customFields || {};
          for (const key of Object.keys(newCustom)) {
            if (oldCustom[key] !== newCustom[key]) {
              broadcastOperation({
                type: 'UPDATE_SONG',
                songId: updatedSong.id,
                field: `customFields.${key}`,
                value: newCustom[key],
              });
            }
          }
        } else if (JSON.stringify(oldSong[field]) !== JSON.stringify(updatedSong[field])) {
          broadcastOperation({
            type: 'UPDATE_SONG',
            songId: updatedSong.id,
            field,
            value: updatedSong[field],
          });
        }
      }
    }
  };

  const updateSongDuration = (songId: string, minutes: string, seconds: string) => {
    const duration = `${minutes || '0'}:${seconds || '00'}`;
    const song = songs.find(s => s.id === songId);
    if (song) {
      updateSong(songId, { ...song, duration });
    }
  };

  const deleteSong = (songId: string) => {
    const newSongs = songs.filter((s) => s.id !== songId);
    const updatedSongs = newSongs.map((song, i) => ({ ...song, position: i + 1 }));
    setSongs(updatedSongs);

    if (selectedSongId === songId) {
      setSelectedSongId(updatedSongs.length > 0 ? updatedSongs[0].id : null);
    }

    broadcastOperation({
      type: 'DELETE_SONG',
      songId,
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSongs((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);
        const reorderedItems = newItems.map((song, i) => ({ ...song, position: i + 1 }));

        broadcastOperation({
          type: 'REORDER_SONGS',
          songIds: reorderedItems.map(s => s.id),
        });

        return reorderedItems;
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
        setSelectedSongId(null);
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

  const selectedSong = songs.find((s) => s.id === selectedSongId) || null;

  // Password Entry View
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

  // Name Entry Modal
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

  // Main Editor View - Two Column Layout like Admin Panel
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      {/* Header */}
      <header className="bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
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
            <div className="flex items-center gap-4">
              <PresenceIndicator
                users={presenceUsers}
                currentUserId={sessionId}
                isConnected={isConnected}
              />
              {updatedAt && (
                <div className="text-right text-sm text-zinc-500 dark:text-zinc-400 hidden sm:block">
                  <p>Zuletzt: {formatDate(updatedAt)}</p>
                  {lastEditedBy && <p>von {lastEditedBy}</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 pb-24">
        {/* Conflict Warning */}
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
                  Lade die Seite neu, um die neueste Version zu sehen.
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

        {/* Two-Column Layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Column - Song List */}
          <div className="lg:w-1/2">
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
            </div>

            <div className="flex items-center gap-2 mb-4">
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
                        onDurationChange={(mins, secs) => updateSongDuration(song.id, mins, secs)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>

          {/* Right Column - Song Details Panel */}
          <div className="lg:w-1/2">
            <Card className="sticky top-4 h-[calc(100vh-280px)] overflow-hidden">
              <SongDetailsPanel
                song={selectedSong}
                customFields={customFields}
                onChange={(updatedSong) => {
                  if (selectedSongId) {
                    updateSong(selectedSongId, updatedSong);
                  }
                }}
              />
            </Card>
          </div>
        </div>

        {/* Fixed Save Button */}
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-700 p-4">
          <div className="max-w-7xl mx-auto flex justify-end">
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
