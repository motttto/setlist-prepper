'use client';

import { useState, useCallback } from 'react';
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
import { Act, Song, SongType } from '@/types';
import SongListItem from './SongListItem';
import { Button } from './ui';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Coffee,
  Star,
  Edit2,
  Trash2,
  Users,
  Disc3,
  Music,
  Sparkles,
  GripVertical,
  Share2,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface ActSectionProps {
  act: Act;
  onUpdate: (updatedAct: Act) => void;
  onDelete: () => void;
  onSelectSong: (songId: string) => void;
  selectedSongId: string | null;
  readonly?: boolean;
  onShare?: (actId: string) => void;  // For sharing this specific act
}

const ACT_TYPE_ICONS: Record<string, React.ReactNode> = {
  band: <Users className="w-4 h-4" />,
  dj: <Disc3 className="w-4 h-4" />,
  solo: <Music className="w-4 h-4" />,
  workshop: <Sparkles className="w-4 h-4" />,
  performance: <Star className="w-4 h-4" />,
  other: <Music className="w-4 h-4" />,
};

const ACT_TYPE_LABELS: Record<string, string> = {
  band: 'Band',
  dj: 'DJ',
  solo: 'Solo',
  workshop: 'Workshop',
  performance: 'Performance',
  other: 'Act',
};

export default function ActSection({
  act,
  onUpdate,
  onDelete,
  onSelectSong,
  selectedSongId,
  readonly = false,
  onShare,
}: ActSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(act.isCollapsed ?? false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(act.name);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleToggleCollapse = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    onUpdate({ ...act, isCollapsed: newCollapsed });
  };

  const handleNameEdit = () => {
    if (editName.trim() && editName !== act.name) {
      onUpdate({ ...act, name: editName.trim() });
    }
    setIsEditing(false);
  };

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

  const addSong = (type: SongType = 'song') => {
    const newSong = createEmptySong(act.songs.length + 1, type);
    onUpdate({ ...act, songs: [...act.songs, newSong] });
    onSelectSong(newSong.id);
    // Expand if collapsed
    if (isCollapsed) {
      setIsCollapsed(false);
      onUpdate({ ...act, songs: [...act.songs, newSong], isCollapsed: false });
    }
  };

  const updateSong = (songId: string, updatedSong: Song) => {
    onUpdate({
      ...act,
      songs: act.songs.map((s) => (s.id === songId ? updatedSong : s)),
    });
  };

  const deleteSong = (songId: string) => {
    const newSongs = act.songs.filter((s) => s.id !== songId);
    const updatedSongs = newSongs.map((song, i) => ({ ...song, position: i + 1 }));
    onUpdate({ ...act, songs: updatedSongs });
  };

  const duplicateSong = (songId: string) => {
    const songToDuplicate = act.songs.find((s) => s.id === songId);
    if (!songToDuplicate) return;

    const songIndex = act.songs.findIndex((s) => s.id === songId);
    const duplicatedSong: Song = {
      ...songToDuplicate,
      id: uuidv4(),
      position: songIndex + 2,
    };

    const newSongs = [
      ...act.songs.slice(0, songIndex + 1),
      duplicatedSong,
      ...act.songs.slice(songIndex + 1),
    ];
    const updatedSongs = newSongs.map((song, i) => ({ ...song, position: i + 1 }));
    onUpdate({ ...act, songs: updatedSongs });
    onSelectSong(duplicatedSong.id);
  };

  const toggleMute = (songId: string) => {
    onUpdate({
      ...act,
      songs: act.songs.map((s) => (s.id === songId ? { ...s, muted: !s.muted } : s)),
    });
  };

  const updateSongDuration = (songId: string, minutes: string, seconds: string) => {
    const duration = `${minutes || '0'}:${seconds || '00'}`;
    onUpdate({
      ...act,
      songs: act.songs.map((s) => (s.id === songId ? { ...s, duration } : s)),
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = act.songs.findIndex((item) => item.id === active.id);
      const newIndex = act.songs.findIndex((item) => item.id === over.id);
      const newSongs = arrayMove(act.songs, oldIndex, newIndex);
      const updatedSongs = newSongs.map((song, i) => ({ ...song, position: i + 1 }));
      onUpdate({ ...act, songs: updatedSongs });
    }
  };

  // Count active songs
  const activeSongCount = act.songs.filter((s) => s.type === 'song' && !s.muted).length;

  // Calculate total duration
  const totalDuration = act.songs.reduce((acc, song) => {
    if (song.muted) return acc;
    if (!song.duration) return acc;
    const parts = song.duration.split(':');
    if (parts.length === 2) {
      return acc + parseInt(parts[0] || '0') * 60 + parseInt(parts[1] || '0');
    }
    return acc;
  }, 0);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden bg-white dark:bg-zinc-800">
      {/* Act Header */}
      <div
        className="flex items-center gap-2 p-3 bg-cyan-50 dark:bg-cyan-900/30 border-b border-zinc-200 dark:border-zinc-700 cursor-pointer hover:bg-cyan-100 dark:hover:bg-cyan-900/50 transition-colors"
        onClick={handleToggleCollapse}
      >
        {/* Collapse Toggle */}
        <button className="text-cyan-600 dark:text-cyan-400">
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </button>

        {/* Act Icon */}
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-cyan-100 dark:bg-cyan-800 text-cyan-600 dark:text-cyan-400">
          {ACT_TYPE_ICONS[act.type] || ACT_TYPE_ICONS.other}
        </div>

        {/* Act Name */}
        <div className="flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
          {isEditing && !readonly ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleNameEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleNameEdit();
                if (e.key === 'Escape') {
                  setEditName(act.name);
                  setIsEditing(false);
                }
              }}
              className="w-full px-2 py-1 text-base font-semibold bg-white dark:bg-zinc-700 border border-cyan-400 rounded focus:outline-none"
              autoFocus
            />
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-cyan-800 dark:text-cyan-200 truncate">
                {act.name}
              </span>
              <span className="text-xs text-cyan-600 dark:text-cyan-400 uppercase tracking-wide">
                {ACT_TYPE_LABELS[act.type] || 'Act'}
              </span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="hidden sm:flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
          <span>{activeSongCount} Songs</span>
          <span>{formatDuration(totalDuration)}</span>
        </div>

        {/* Actions */}
        {!readonly && (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {onShare && (
              <button
                onClick={() => onShare(act.id)}
                className="p-1.5 text-zinc-400 hover:text-indigo-500 transition-colors"
                title="Act teilen"
              >
                <Share2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setIsEditing(true)}
              className="p-1.5 text-zinc-400 hover:text-indigo-500 transition-colors"
              title="Umbenennen"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors"
              title="Act löschen"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Songs List */}
      {!isCollapsed && (
        <div className="p-2">
          {act.songs.length === 0 ? (
            <div className="text-center py-4 text-zinc-400 dark:text-zinc-500 text-sm">
              Noch keine Songs
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={act.songs.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1.5">
                  {(() => {
                    let activePosition = 0;
                    return act.songs.map((song) => {
                      if (!song.muted && song.type === 'song') {
                        activePosition++;
                      }
                      const displayPos = song.muted ? undefined : activePosition;
                      return (
                        <SongListItem
                          key={song.id}
                          song={song}
                          displayPosition={displayPos}
                          isSelected={selectedSongId === song.id}
                          onSelect={() => onSelectSong(song.id)}
                          onDelete={() => deleteSong(song.id)}
                          onDuplicate={() => duplicateSong(song.id)}
                          onToggleMute={() => toggleMute(song.id)}
                          onDurationChange={(min, sec) =>
                            updateSongDuration(song.id, min, sec)
                          }
                        />
                      );
                    });
                  })()}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {/* Add Song Buttons */}
          {!readonly && (
            <div className="flex gap-1.5 mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-700">
              <Button onClick={() => addSong('song')} size="sm" className="px-2">
                <Plus className="w-3 h-3 mr-1" />
                Song
              </Button>
              <Button onClick={() => addSong('pause')} variant="secondary" size="sm" className="px-2">
                <Coffee className="w-3 h-3 mr-1" />
                Pause
              </Button>
              <Button onClick={() => addSong('encore')} variant="secondary" size="sm" className="px-2">
                <Star className="w-3 h-3 mr-1" />
                Zugabe
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
