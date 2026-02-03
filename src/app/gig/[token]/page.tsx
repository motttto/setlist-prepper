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
import { Song, CustomField, CustomFieldType, SongType, ActType } from '@/types';
import SongListItem from '@/components/SongListItem';
import SongDetailsPanel from '@/components/SongDetailsPanel';
import { Button, Input, Card } from '@/components/ui';
import { Plus, Lock, Music2, Coffee, Star, Clock, AlertTriangle, RefreshCw, User, Loader2, Cloud, CloudOff, Settings, FileDown, X, MapPin, Calendar, Users, Disc3 } from 'lucide-react';
import { exportSetlistToPdf } from '@/lib/pdfExport';
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
  const [startTime, setStartTime] = useState('');
  const [venue, setVenue] = useState('');
  const [songs, setSongs] = useState<Song[]>([]);
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState('');
  const [editorName, setEditorName] = useState('');
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [updatedAt, setUpdatedAt] = useState('');
  const [lastEditedBy, setLastEditedBy] = useState('');
  const [hasConflict, setHasConflict] = useState(false);
  const [sessionId] = useState(() => uuidv4());
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Custom field creation (nur im Settings Panel für ältere Felder)
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<CustomFieldType>('text');
  const [newDropdownOptions, setNewDropdownOptions] = useState('');
  const [isAddingField, setIsAddingField] = useState(false);
  const [fieldError, setFieldError] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showMobileDetails, setShowMobileDetails] = useState(false);

  // Act-share mode
  const [isActShare, setIsActShare] = useState(false);
  const [sharedActName, setSharedActName] = useState<string | null>(null);
  // Role: 'band' = can only edit songs, 'orga' = can edit everything
  const [shareRole, setShareRole] = useState<'band' | 'orga'>('band');

  const isRemoteUpdateRef = useRef(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadRef = useRef(true);
  const AUTO_SAVE_DELAY = 2000;

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
          case 'startTime':
            setStartTime(operation.value || '');
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

      initialLoadRef.current = true;
      setStoredPassword(password);
      setTitle(data.data.title);
      setEventDate(data.data.eventDate || '');
      setStartTime(data.data.startTime || '');
      setVenue(data.data.venue || '');
      // Ensure songs is always an array
      setSongs(Array.isArray(data.data.songs) ? data.data.songs : []);
      setCustomFields(Array.isArray(data.data.customFields) ? data.data.customFields : []);
      setUpdatedAt(data.data.updatedAt || '');
      setLastEditedBy(data.data.lastEditedBy || '');
      // Act-share mode info
      setIsActShare(data.data.isActShare || false);
      setSharedActName(data.data.sharedActName || null);
      // Role info
      setShareRole(data.data.shareRole || 'band');
      setIsAuthenticated(true);
      setShowNamePrompt(true);
      // Allow changes to trigger auto-save after initial load
      setTimeout(() => {
        initialLoadRef.current = false;
      }, 100);
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

  const addAct = (actType: ActType = 'band') => {
    const actLabels: Record<ActType, string> = {
      band: 'Neue Band',
      dj: 'Neuer DJ',
      solo: 'Neuer Solo-Act',
      workshop: 'Neuer Workshop',
      performance: 'Neue Performance',
      other: 'Neuer Act',
    };
    const newAct: Song = {
      id: uuidv4(),
      position: songs.length + 1,
      type: 'act',
      title: actLabels[actType],
      actType,
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
    };
    setSongs([...songs, newAct]);
    setSelectedSongId(newAct.id);
    broadcastOperation({
      type: 'ADD_SONG',
      song: newAct,
      position: songs.length,
    });
  };

  const calculateTotalDuration = () => {
    let totalSeconds = 0;
    songs.forEach((song) => {
      // Skip muted songs in duration calculation
      if (song.muted) return;
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

  const duplicateSong = (songId: string) => {
    const songToDuplicate = songs.find((s) => s.id === songId);
    if (!songToDuplicate) return;

    const songIndex = songs.findIndex((s) => s.id === songId);
    const duplicatedSong: Song = {
      ...songToDuplicate,
      id: uuidv4(),
      position: songIndex + 2,
    };

    const newSongs = [
      ...songs.slice(0, songIndex + 1),
      duplicatedSong,
      ...songs.slice(songIndex + 1),
    ];
    const updatedSongs = newSongs.map((song, i) => ({ ...song, position: i + 1 }));
    setSongs(updatedSongs);
    setSelectedSongId(duplicatedSong.id);

    broadcastOperation({
      type: 'ADD_SONG',
      song: duplicatedSong,
      position: songIndex + 2,
    });
  };

  const toggleMute = (songId: string) => {
    const song = songs.find((s) => s.id === songId);
    if (!song) return;

    const newMutedState = !song.muted;
    setSongs(songs.map((s) => (s.id === songId ? { ...s, muted: newMutedState } : s)));

    broadcastOperation({
      type: 'UPDATE_SONG',
      songId,
      field: 'muted',
      value: newMutedState,
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

  // Auto-save function
  const performAutoSave = useCallback(async () => {
    if (!title.trim() || !storedPassword) return;

    setIsSaving(true);
    setSaveStatus('saving');
    setSaveError('');
    setHasConflict(false);

    try {
      const response = await fetch(`/api/gig/${token}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: storedPassword,
          title,
          eventDate: eventDate || null,
          startTime: startTime || null,
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
          setSaveStatus('error');
        } else {
          throw new Error(data.error || 'Fehler beim Speichern');
        }
        return;
      }

      setUpdatedAt(data.updatedAt);
      setLastEditedBy(data.lastEditedBy);
      setLastSavedAt(new Date());
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Fehler beim Speichern');
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  }, [token, storedPassword, title, eventDate, startTime, venue, songs, editorName, updatedAt]);

  // Track changes and trigger auto-save (only for local changes, not remote)
  useEffect(() => {
    if (initialLoadRef.current || !isAuthenticated || showNamePrompt || isRemoteUpdateRef.current) return;

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
  }, [title, eventDate, startTime, venue, songs, isAuthenticated, showNamePrompt]);

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
        setStartTime(data.data.startTime || '');
        setVenue(data.data.venue || '');
        // Ensure songs is always an array
        setSongs(Array.isArray(data.data.songs) ? data.data.songs : []);
        setUpdatedAt(data.data.updatedAt || '');
        setLastEditedBy(data.data.lastEditedBy || '');
        setShareRole(data.data.shareRole || 'band');
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

  const handleAddCustomField = async (fieldData?: { fieldName: string; fieldType: CustomFieldType; dropdownOptions?: string[] }) => {
    const fieldName = fieldData?.fieldName || newFieldName.trim();
    const fieldType = fieldData?.fieldType || newFieldType;
    const dropdownOptions = fieldData?.dropdownOptions || (newFieldType === 'dropdown' ? newDropdownOptions.split(',').map(o => o.trim()).filter(Boolean) : undefined);

    if (!fieldName) return;

    setIsAddingField(true);
    setFieldError('');

    try {
      const response = await fetch(`/api/gig/${token}/custom-fields`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: storedPassword,
          fieldName,
          fieldType,
          dropdownOptions,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Erstellen');
      }

      setCustomFields([...customFields, data.data]);
      if (!fieldData) {
        setNewFieldName('');
        setNewDropdownOptions('');
      }
    } catch (err) {
      setFieldError(err instanceof Error ? err.message : 'Fehler beim Erstellen');
    } finally {
      setIsAddingField(false);
    }
  };

  const handleDeleteCustomField = async (fieldId: string) => {
    try {
      const response = await fetch(`/api/gig/${token}/custom-fields?id=${fieldId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: storedPassword }),
      });

      if (response.ok) {
        setCustomFields(customFields.filter(f => f.id !== fieldId));
      }
    } catch (err) {
      console.error('Error deleting custom field:', err);
    }
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

  // Helper function to calculate end time
  const calculateEndTime = () => {
    if (!startTime) return '';
    const [hours, minutes] = startTime.split(':').map(Number);
    let totalSeconds = 0;
    songs.forEach((song) => {
      // Skip muted songs in duration calculation
      if (song.muted) return;
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

  const formatEventDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Main Editor View - Layout like Admin Panel
  return (
    <div className="h-screen flex flex-col bg-zinc-200 dark:bg-zinc-950">
      {/* Header - Compact on mobile */}
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-300 dark:border-zinc-800">
        <div className="px-3 sm:px-4 py-2 sm:py-3">
          {/* First Row: Title, PDF, Presence */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-indigo-600 rounded-lg">
                <Music2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-xl font-bold text-zinc-900 dark:text-zinc-100">
                    {isActShare && sharedActName ? sharedActName : (title || 'Gig')}
                  </h1>
                  {/* Role badge */}
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    shareRole === 'orga'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                  }`}>
                    {shareRole === 'orga' ? 'Orga' : 'Band'}
                  </span>
                </div>
                {isActShare && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {title}
                  </p>
                )}
              </div>
            </div>
            {/* Event Info - Desktop only */}
            <div className="hidden lg:flex items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400">
              {eventDate && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {formatEventDate(eventDate)}
                </span>
              )}
              {venue && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {venue}
                </span>
              )}
              {startTime && (
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {startTime} - {calculateEndTime()}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Music2 className="w-4 h-4" />
                {songs.filter(s => (s.type || 'song') === 'song' && !s.muted).length} Songs
              </span>
              <span className="text-zinc-500 dark:text-zinc-500">
                Dauer: {calculateTotalDuration()}
              </span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
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
              <PresenceIndicator
                users={presenceUsers}
                currentUserId={sessionId}
                currentUserName={editorName}
                isConnected={isConnected}
              />
            </div>
          </div>
          {/* Second Row: Gig Info - Mobile only */}
          <div className="lg:hidden mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700 text-xs text-zinc-500 dark:text-zinc-400 flex flex-wrap items-center gap-x-3 gap-y-1">
            {eventDate && <span>{formatEventDate(eventDate)}</span>}
            {venue && <span>{venue}</span>}
            {startTime && <span>{startTime} - {calculateEndTime()}</span>}
            <span>{songs.filter(s => (s.type || 'song') === 'song' && !s.muted).length} Songs</span>
            <span>Dauer: {calculateTotalDuration()}</span>
          </div>
        </div>
      </header>

      {/* Two Column Layout like Admin Panel */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Main Content Area - Songs Panel */}
        <div className="flex-1 min-w-0 p-2 sm:p-4 overflow-hidden flex flex-col">
          {/* Conflict Warning */}
          {hasConflict && (
            <div className="flex-shrink-0 mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Konflikt erkannt. Jemand anderes hat den Gig bearbeitet.
                  </p>
                  <Button
                    onClick={handleReload}
                    variant="secondary"
                    size="sm"
                    className="mt-2"
                    isLoading={isLoading}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Neu laden
                  </Button>
                </div>
              </div>
            </div>
          )}

          {saveError && !hasConflict && (
            <div className="flex-shrink-0 mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm flex items-center justify-between">
              <span>{saveError}</span>
              <button onClick={() => setSaveError('')} className="text-red-400 hover:text-red-600">×</button>
            </div>
          )}

          {/* Add Buttons - compact on mobile, hide act buttons for act-shares and band role */}
          <div className="flex-shrink-0 flex flex-wrap gap-1.5 sm:gap-2 mb-2 sm:mb-4">
            {/* Only orga role can add acts, and not in act-share mode */}
            {!isActShare && shareRole === 'orga' && (
              <>
                <Button onClick={() => addAct('band')} variant="secondary" size="sm" className="px-2 sm:px-3 bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-900/30 dark:hover:bg-cyan-900/50 border-cyan-300 dark:border-cyan-700">
                  <Users className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  <span className="hidden sm:inline ml-1 text-cyan-700 dark:text-cyan-300">Band</span>
                </Button>
                <Button onClick={() => addAct('dj')} variant="secondary" size="sm" className="px-2 sm:px-3 bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-900/30 dark:hover:bg-cyan-900/50 border-cyan-300 dark:border-cyan-700">
                  <Disc3 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  <span className="hidden sm:inline ml-1 text-cyan-700 dark:text-cyan-300">DJ</span>
                </Button>
                <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-600 self-center mx-1" />
              </>
            )}
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

          {/* Content Area - Song list full width on mobile, two columns on desktop */}
          <div className="flex-1 flex gap-2 sm:gap-4 min-h-0 overflow-hidden">
            {/* Song List - full height on mobile */}
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
                      {(() => {
                        let activePosition = 0;
                        return songs.map((song) => {
                          if (!song.muted && (song.type || 'song') === 'song') {
                            activePosition++;
                          }
                          const displayPos = song.muted ? undefined : activePosition;
                          return (
                            <SongListItem
                              key={song.id}
                              song={song}
                              displayPosition={displayPos}
                              isSelected={selectedSongId === song.id}
                              onSelect={() => {
                                setSelectedSongId(song.id);
                                // Open modal on mobile
                                if (window.innerWidth < 1024) {
                                  setShowMobileDetails(true);
                                }
                              }}
                              onDelete={() => deleteSong(song.id)}
                              onDuplicate={() => duplicateSong(song.id)}
                              onToggleMute={() => toggleMute(song.id)}
                              onDurationChange={(mins, secs) => updateSongDuration(song.id, mins, secs)}
                            />
                          );
                        });
                      })()}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>

            {/* Song Details - Desktop only (hidden on mobile, shown in modal instead) */}
            <div className="hidden lg:block lg:w-1/2 overflow-y-auto min-h-0 bg-zinc-100 dark:bg-zinc-800 rounded-lg border border-zinc-300 dark:border-zinc-700">
              <SongDetailsPanel
                song={selectedSong}
                customFields={customFields}
                onChange={(updatedSong) => {
                  if (selectedSongId) {
                    updateSong(selectedSongId, updatedSong);
                  }
                }}
                onAddCustomField={handleAddCustomField}
                onDeleteCustomField={handleDeleteCustomField}
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
                    onChange={(updatedSong) => {
                      if (selectedSongId) {
                        updateSong(selectedSongId, updatedSong);
                      }
                    }}
                    onAddCustomField={handleAddCustomField}
                    onDeleteCustomField={handleDeleteCustomField}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
