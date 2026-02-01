'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Song } from '@/types';
import { GripVertical, Trash2, Coffee, Star, Music } from 'lucide-react';

interface SongListItemProps {
  song: Song;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDurationChange: (minutes: string, seconds: string) => void;
}

export default function SongListItem({
  song,
  isSelected,
  onSelect,
  onDelete,
  onDurationChange,
}: SongListItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: song.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const songType = song.type || 'song';

  // Parse duration into minutes and seconds
  const parseDuration = () => {
    if (!song.duration) return { minutes: '', seconds: '' };
    const parts = song.duration.split(':');
    if (parts.length === 2) {
      return { minutes: parts[0], seconds: parts[1] };
    }
    return { minutes: song.duration, seconds: '00' };
  };

  const { minutes, seconds } = parseDuration();

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    onDurationChange(val, seconds);
  };

  const handleSecondsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (parseInt(val) > 59) val = '59';
    onDurationChange(minutes, val.padStart(2, '0'));
  };

  // Styling based on type
  const getTypeStyles = () => {
    switch (songType) {
      case 'pause':
        return {
          bg: isSelected ? 'bg-amber-100 dark:bg-amber-900/40' : 'bg-amber-50 dark:bg-amber-900/20',
          border: isSelected ? 'border-amber-400 dark:border-amber-600' : 'border-amber-200 dark:border-amber-800',
          icon: <Coffee className="w-4 h-4 text-amber-500" />,
        };
      case 'encore':
        return {
          bg: isSelected ? 'bg-purple-100 dark:bg-purple-900/40' : 'bg-purple-50 dark:bg-purple-900/20',
          border: isSelected ? 'border-purple-400 dark:border-purple-600' : 'border-purple-200 dark:border-purple-800',
          icon: <Star className="w-4 h-4 text-purple-500" />,
        };
      default:
        return {
          bg: isSelected ? 'bg-indigo-50 dark:bg-indigo-900/30' : 'bg-white dark:bg-zinc-800',
          border: isSelected ? 'border-indigo-400 dark:border-indigo-600' : 'border-zinc-200 dark:border-zinc-700',
          icon: <Music className="w-4 h-4 text-zinc-400" />,
        };
    }
  };

  const typeStyles = getTypeStyles();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${typeStyles.bg} border-2 ${typeStyles.border} rounded-lg p-2 cursor-pointer transition-colors`}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4" />
        </button>

        {/* Position / Icon */}
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-700 text-xs font-medium">
          {songType === 'song' ? song.position : typeStyles.icon}
        </div>

        {/* Title (click to select) */}
        <span className="flex-1 min-w-0 text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
          {song.title || (songType === 'pause' ? 'Pause' : songType === 'encore' ? 'Zugabe' : 'Song-Titel')}
        </span>

        {/* Duration: min / sec */}
        <div className="flex items-center gap-1 text-xs" onClick={(e) => e.stopPropagation()}>
          <input
            type="text"
            value={minutes}
            onChange={handleMinutesChange}
            onFocus={(e) => e.target.select()}
            placeholder="0"
            className="w-8 text-center bg-zinc-100 dark:bg-zinc-700 border-none rounded px-1 py-0.5 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            maxLength={3}
          />
          <span className="text-zinc-400">:</span>
          <input
            type="text"
            value={seconds}
            onChange={handleSecondsChange}
            onFocus={(e) => e.target.select()}
            placeholder="00"
            className="w-8 text-center bg-zinc-100 dark:bg-zinc-700 border-none rounded px-1 py-0.5 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            maxLength={2}
          />
        </div>

        {/* Delete */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1 text-zinc-400 hover:text-red-500"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
