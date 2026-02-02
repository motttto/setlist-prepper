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
import { Song, CustomField, CustomFieldType, Setlist, SongType } from '@/types';
import SongListItem from './SongListItem';
import SongDetailsPanel from './SongDetailsPanel';
import { Button, Input, Card } from './ui';
import { Plus, Save, ArrowLeft, Settings2, X, Clock, Coffee, Star, Check, Cloud, CloudOff, Loader2, FileDown, Music2 } from 'lucide-react';
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
  const [startTime, setStartTime] = useState(initialSetlist?.startTime || '');
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
  const [showMobileDetails, setShowMobileDetails] = useState(false);

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
        startTime: startTime || null,
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
  }, [setlistId, title, eventDate, startTime, venue, songs]);

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
  }, [title, eventDate, startTime, venue, songs, setlistId]);

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

  const addCustomField = async (fieldData?: { fieldName: string; fieldType: CustomFieldType; dropdownOptions?: string[] }) => {
    const fieldName = fieldData?.fieldName || newFieldName.trim();
    const fieldType = fieldData?.fieldType || 'text';
    const dropdownOptions = fieldData?.dropdownOptions;

    if (!fieldName) return;

    try {
      const response = await fetch('/api/custom-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldName, fieldType, dropdownOptions }),
      });

      const data = await response.json();
      if (data.data) {
        setCustomFields([...customFields, data.data]);
        if (!fieldData) {
          setNewFieldName('');
        }
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
        startTime: startTime || null,
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

  // Helper function to calculate end time
  const calculateEndTime = () => {
    if (!startTime) return '';
    const [hours, minutes] = startTime.split(':').map(Number);
    let totalSeconds = 0;
    songs.forEach((song) => {
      if (song.duration) {
        const parts = song.duration.split(':');
        if (parts.length === 2) {
          totalSeconds += parseInt(parts[0] || '0') * 60 + parseInt(parts[1] || '0');
        }
      }
    });
    const totalMinutes = hours * 60 + minutes + Math.ceil(totalSeconds / 60);
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMins = totalMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-screen flex flex-col bg-zinc-200 dark:bg-zinc-950">
      {/* Header - Compact on mobile */}
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-300 dark:border-zinc-800">
        <div className="px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="p-1.5 sm:p-2">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-base sm:text-xl font-bold text-zinc-900 dark:text-zinc-100">
                  {title || (setlistId ? 'Gig bearbeiten' : 'Neuer Gig')}
                </h1>
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300">
                  {editorName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Save Status - icon only on mobile */}
              {setlistId && (
                <>
                  {saveStatus === 'saving' && (
                    <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </span>
                  )}
                  {saveStatus === 'saved' && (
                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                      <Cloud className="w-4 h-4" />
                    </span>
                  )}
                  {saveStatus === 'error' && (
                    <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                      <CloudOff className="w-4 h-4" />
                    </span>
                  )}
                </>
              )}
              {/* PDF Export Button - icon only on mobile */}
              {songs.length > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => exportSetlistToPdf({ title, eventDate, startTime, venue, songs })}
                  className="px-2 sm:px-3"
                >
                  <FileDown className="w-4 h-4" />
                  <span className="hidden sm:inline ml-1">PDF</span>
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
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Column - Song List */}
        <div className="flex-1 min-w-0 p-2 sm:p-4 overflow-hidden flex flex-col">
          {/* Compact Stats Row */}
          <div className="flex-shrink-0 mb-2 sm:mb-4">
            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-2">
              <div className="flex items-center gap-2">
                {saveStatus === 'idle' && lastSavedAt && (
                  <span className="text-zinc-400 dark:text-zinc-500">
                    <span className="sm:hidden">{lastSavedAt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="hidden sm:inline">Zuletzt gespeichert {lastSavedAt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                {startTime && <span>{startTime}</span>}
                <span className="flex items-center gap-1">
                  <Music2 className="w-3 h-3" />
                  {songs.filter(s => (s.type || 'song') === 'song').length}
                </span>
                <span>{calculateTotalDuration()}</span>
                {startTime && <span className="hidden sm:inline">→ {calculateEndTime()}</span>}
              </div>
            </div>
          </div>

          {error && (
            <div className="flex-shrink-0 mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">×</button>
            </div>
          )}

          {saveSuccess && (
            <div className="flex-shrink-0 mb-3 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-600 dark:text-green-400 text-sm flex items-center gap-2">
              <Check className="w-4 h-4" />
              Gespeichert!
            </div>
          )}

          {/* Add Buttons - compact on mobile */}
          <div className="flex-shrink-0 flex gap-1.5 sm:gap-2 mb-2 sm:mb-4">
            <Button onClick={addSong} size="sm" className="px-2 sm:px-3">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">Song</span>
            </Button>
            <Button onClick={addPause} variant="secondary" size="sm" className="px-2 sm:px-3">
              <Coffee className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">Pause</span>
            </Button>
            <Button onClick={addEncore} variant="secondary" size="sm" className="px-2 sm:px-3">
              <Star className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">Zugabe</span>
            </Button>
          </div>

          {/* Content Area - Song list full width on mobile */}
          <div className="flex-1 flex gap-2 sm:gap-4 min-h-0 overflow-hidden">
            {/* Song List */}
            <div className="flex-1 lg:flex-none lg:w-1/2 overflow-y-auto min-h-0">
              {songs.length === 0 ? (
                <div className="text-center py-6 sm:py-8">
                  <p className="text-zinc-500 dark:text-zinc-400 mb-3 sm:mb-4 text-sm">
                    Noch keine Songs
                  </p>
                  <Button onClick={addSong} size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    Ersten Song hinzufuegen
                  </Button>
                </div>
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
                    <div className="space-y-1.5 sm:space-y-2">
                      {songs.map((song) => (
                        <SongListItem
                          key={song.id}
                          song={song}
                          isSelected={selectedSongId === song.id}
                          onSelect={() => {
                            setSelectedSongId(song.id);
                            // Open modal on mobile
                            if (window.innerWidth < 1024) {
                              setShowMobileDetails(true);
                            }
                          }}
                          onDelete={() => deleteSong(song.id)}
                          onDurationChange={(min, sec) => updateSongDuration(song.id, min, sec)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>

            {/* Song Details - Desktop only */}
            <div className="hidden lg:block lg:w-1/2 overflow-y-auto min-h-0 bg-zinc-100 dark:bg-zinc-800 rounded-lg border border-zinc-300 dark:border-zinc-700">
              <SongDetailsPanel
                song={selectedSong}
                customFields={customFields}
                onChange={(updated) => updateSong(updated.id, updated)}
                onAddCustomField={addCustomField}
                onDeleteCustomField={deleteCustomField}
              />
            </div>
          </div>

          {/* Mobile Song Details Modal */}
          {showMobileDetails && selectedSong && (
            <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setShowMobileDetails(false)}>
              <div
                className="absolute inset-x-0 bottom-0 top-12 bg-zinc-100 dark:bg-zinc-800 rounded-t-2xl overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between p-3 border-b border-zinc-300 dark:border-zinc-700 bg-zinc-200 dark:bg-zinc-900">
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {selectedSong.title || 'Song bearbeiten'}
                  </h3>
                  <button
                    onClick={() => setShowMobileDetails(false)}
                    className="p-2 rounded-full hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
                  >
                    <X className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                  </button>
                </div>
                {/* Modal Content */}
                <div className="flex-1 overflow-y-auto">
                  <SongDetailsPanel
                    song={selectedSong}
                    customFields={customFields}
                    onChange={(updated) => updateSong(updated.id, updated)}
                    onAddCustomField={addCustomField}
                    onDeleteCustomField={deleteCustomField}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Settings / Custom Fields */}
        <div className={`w-full lg:w-72 flex-shrink-0 border-t lg:border-t-0 lg:border-l border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-y-auto ${showFieldManager ? '' : 'lg:block'}`}>
          {/* Mobile toggle */}
          <button
            onClick={() => setShowFieldManager(!showFieldManager)}
            className="lg:hidden w-full flex items-center justify-between p-3 text-left"
          >
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                Einstellungen
              </span>
            </div>
            <svg
              className={`w-4 h-4 text-zinc-500 transition-transform ${showFieldManager ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Settings content */}
          <div className={`p-4 pt-0 lg:pt-4 ${showFieldManager ? 'block' : 'hidden lg:block'}`}>
            {/* Event Details */}
            <div className="mb-6">
              <h4 className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-3 uppercase tracking-wider">
                Event-Details
              </h4>
              <div className="space-y-3">
                <Input
                  label="Gig-Titel"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="z.B. Sommerfestival 2025"
                  className="text-sm"
                />
                <Input
                  label="Datum"
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="text-sm"
                />
                <Input
                  label="Startzeit"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="text-sm"
                />
                <Input
                  label="Venue"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="z.B. Olympiastadion"
                  className="text-sm"
                />
              </div>
            </div>

            {/* Custom Fields */}
            <div className="border-t border-zinc-200 dark:border-zinc-700 pt-4">
              <h4 className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-3 uppercase tracking-wider">
                Eigene Felder
              </h4>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value)}
                    placeholder="Neues Feld..."
                    onKeyDown={(e) => e.key === 'Enter' && addCustomField()}
                    className="text-sm"
                  />
                  <Button onClick={() => addCustomField()} size="sm">
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
                  <p className="text-xs text-zinc-500">
                    Noch keine eigenen Felder.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Fixed Save Button - bottom bar */}
      <div className="flex-shrink-0 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-700 p-3 sm:p-4">
        <div className="flex justify-end gap-2 sm:gap-3">
          <Link href="/dashboard">
            <Button variant="secondary" size="sm">
              <span className="hidden sm:inline">Abbrechen</span>
              <span className="sm:hidden">×</span>
            </Button>
          </Link>
          <Button onClick={handleSave} isLoading={isSaving} size="sm">
            <Save className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Speichern</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
