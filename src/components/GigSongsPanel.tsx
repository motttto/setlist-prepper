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
import { Button } from './ui';
import GigEditDialog from './GigEditDialog';
import {
  Plus,
  Save,
  Coffee,
  Star,
  Check,
  Music2,
  Calendar,
  MapPin,
  Play,
} from 'lucide-react';

interface GigSongsPanelProps {
  setlist: Setlist | null;
  customFields: CustomField[];
  onSave: (setlist: Setlist) => Promise<void>;
  isLoading: boolean;
  openEditDialogTrigger?: number;
}

export default function GigSongsPanel({
  setlist,
  customFields,
  onSave,
  isLoading,
  openEditDialogTrigger,
}: GigSongsPanelProps) {
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [venue, setVenue] = useState('');
  const [songs, setSongs] = useState<Song[]>([]);
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Sync state when setlist changes
  useEffect(() => {
    if (setlist) {
      setTitle(setlist.title || '');
      setEventDate(setlist.eventDate || '');
      setStartTime(setlist.startTime || '');
      setVenue(setlist.venue || '');
      setSongs(setlist.songs || []);
      setSelectedSongId(setlist.songs?.[0]?.id || null);
    } else {
      setTitle('');
      setEventDate('');
      setStartTime('');
      setVenue('');
      setSongs([]);
      setSelectedSongId(null);
    }
  }, [setlist]);

  // Select first song if none selected
  useEffect(() => {
    if (!selectedSongId && songs.length > 0) {
      setSelectedSongId(songs[0].id);
    }
  }, [songs, selectedSongId]);

  // Open edit dialog when triggered from outside
  useEffect(() => {
    if (openEditDialogTrigger && openEditDialogTrigger > 0 && setlist) {
      setIsEditDialogOpen(true);
    }
  }, [openEditDialogTrigger, setlist]);

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

  const getTotalSeconds = () => {
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
    return totalSeconds;
  };

  const calculateTotalDuration = () => {
    const totalSeconds = getTotalSeconds();
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateEndTime = () => {
    if (!startTime) return '';
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalSeconds = getTotalSeconds();
    const totalMinutes = hours * 60 + minutes + Math.ceil(totalSeconds / 60);
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMins = totalMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
  };

  const updateSong = (songId: string, updatedSong: Song) => {
    setSongs(songs.map((s) => (s.id === songId ? updatedSong : s)));
  };

  const updateSongDuration = (songId: string, minutes: string, seconds: string) => {
    const duration = `${minutes || '0'}:${seconds || '00'}`;
    setSongs(songs.map((s) => (s.id === songId ? { ...s, duration } : s)));
  };

  const deleteSong = (songId: string) => {
    const newSongs = songs.filter((s) => s.id !== songId);
    const updatedSongs = newSongs.map((song, i) => ({ ...song, position: i + 1 }));
    setSongs(updatedSongs);

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
        return newItems.map((song, i) => ({ ...song, position: i + 1 }));
      });
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
      const updatedSetlist: Setlist = {
        id: setlist?.id || '',
        title,
        eventDate: eventDate || null,
        startTime: startTime || null,
        venue: venue || null,
        songs,
        createdAt: setlist?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await onSave(updatedSetlist);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handleEditDialogSave = (data: { title: string; eventDate: string; startTime: string; venue: string }) => {
    setTitle(data.title);
    setEventDate(data.eventDate);
    setStartTime(data.startTime);
    setVenue(data.venue);
  };

  const selectedSong = songs.find((s) => s.id === selectedSongId) || null;

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4" />
          <p className="text-zinc-500 dark:text-zinc-400">Wird geladen...</p>
        </div>
      </div>
    );
  }

  if (!setlist) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Music2 className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Kein Gig ausgewählt
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Wähle links einen Gig aus oder erstelle einen neuen
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Compact Header */}
      <div className="flex-shrink-0 mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          {title || 'Unbenannter Gig'}
        </h2>
        <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
          {eventDate && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(eventDate)}
            </span>
          )}
          {startTime && (
            <span className="flex items-center gap-1">
              <Play className="w-3.5 h-3.5" />
              {startTime} Uhr
            </span>
          )}
          {venue && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {venue}
            </span>
          )}
          {songs.length > 0 && (
            <>
              <span className="flex items-center gap-1">
                <Music2 className="w-3.5 h-3.5" />
                {songs.filter(s => (s.type || 'song') === 'song').length} Songs
              </span>
              <span className="flex items-center gap-1">
                Dauer {calculateTotalDuration()}
              </span>
              {startTime && (
                <span className="flex items-center gap-1">
                  Ende {calculateEndTime()}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <GigEditDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        onSave={handleEditDialogSave}
        initialData={{ title, eventDate, startTime, venue }}
      />

      {error && (
        <div className="flex-shrink-0 mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {saveSuccess && (
        <div className="flex-shrink-0 mb-3 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-600 dark:text-green-400 text-sm flex items-center gap-2">
          <Check className="w-4 h-4" />
          Gespeichert!
        </div>
      )}

      {/* Add Buttons */}
      <div className="flex-shrink-0 flex gap-2 mb-4">
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
        <div className="flex-1" />
        <Button onClick={handleSave} isLoading={isSaving} size="sm">
          <Save className="w-4 h-4 mr-1" />
          Speichern
        </Button>
      </div>

      {/* Content Area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0 overflow-hidden">
        {/* Song List */}
        <div className="overflow-y-auto min-h-0">
          {songs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-zinc-500 dark:text-zinc-400 mb-4">
                Noch keine Songs
              </p>
              <Button onClick={addSong} size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Ersten Song hinzufügen
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
        </div>

        {/* Song Details */}
        <div className="overflow-y-auto min-h-0 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
          <SongDetailsPanel
            song={selectedSong}
            customFields={customFields}
            onChange={(updated) => updateSong(updated.id, updated)}
          />
        </div>
      </div>
    </div>
  );
}
