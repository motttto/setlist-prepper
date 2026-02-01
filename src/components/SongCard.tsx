'use client';

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Song, CustomField } from '@/types';
import { Input, Textarea, Button } from './ui';
import {
  GripVertical,
  ChevronDown,
  ChevronUp,
  Trash2,
  Plus,
  X,
  Music,
  Clock,
  Coffee,
  Star,
} from 'lucide-react';

interface SongCardProps {
  song: Song;
  customFields: CustomField[];
  onChange: (song: Song) => void;
  onDelete: () => void;
}

export default function SongCard({
  song,
  customFields,
  onChange,
  onDelete,
}: SongCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newMediaLink, setNewMediaLink] = useState('');

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

  const handleChange = (field: keyof Song, value: string | string[]) => {
    onChange({ ...song, [field]: value });
  };

  const handleCustomFieldChange = (fieldName: string, value: string) => {
    onChange({
      ...song,
      customFields: { ...song.customFields, [fieldName]: value },
    });
  };

  const addMediaLink = () => {
    if (newMediaLink.trim()) {
      onChange({
        ...song,
        mediaLinks: [...song.mediaLinks, newMediaLink.trim()],
      });
      setNewMediaLink('');
    }
  };

  const removeMediaLink = (index: number) => {
    onChange({
      ...song,
      mediaLinks: song.mediaLinks.filter((_, i) => i !== index),
    });
  };

  // Behandle fehlenden type als 'song' (für alte Daten)
  const songType = song.type || 'song';

  // Bestimme Styling basierend auf Typ
  const getTypeStyles = () => {
    switch (songType) {
      case 'pause':
        return {
          bg: 'bg-amber-50 dark:bg-amber-900/20',
          border: 'border-amber-200 dark:border-amber-800',
          badge: 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400',
          icon: <Coffee className="w-4 h-4" />,
        };
      case 'encore':
        return {
          bg: 'bg-purple-50 dark:bg-purple-900/20',
          border: 'border-purple-200 dark:border-purple-800',
          badge: 'bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400',
          icon: <Star className="w-4 h-4" />,
        };
      default:
        return {
          bg: 'bg-white dark:bg-zinc-800',
          border: 'border-zinc-200 dark:border-zinc-700',
          badge: 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400',
          icon: null,
        };
    }
  };

  const typeStyles = getTypeStyles();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${typeStyles.bg} border ${typeStyles.border} rounded-xl overflow-hidden`}
    >
      {/* Header */}
      <div className={`flex items-center gap-3 p-4 ${songType === 'song' ? 'bg-zinc-50 dark:bg-zinc-800/50' : ''}`}>
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
        >
          <GripVertical className="w-5 h-5" />
        </button>

        <div className={`flex items-center justify-center w-8 h-8 ${typeStyles.badge} rounded-full font-semibold text-sm`}>
          {typeStyles.icon || song.position}
        </div>

        <div className="flex-1">
          <Input
            value={song.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder={songType === 'pause' ? 'Pause' : songType === 'encore' ? 'Zugabe' : 'Song-Titel'}
            className="font-semibold bg-transparent border-transparent hover:border-zinc-300 dark:hover:border-zinc-600 focus:border-indigo-500"
          />
        </div>

        {/* Duration Input */}
        <div className="flex items-center gap-1 w-24">
          <Clock className="w-4 h-4 text-zinc-400" />
          <Input
            value={song.duration || ''}
            onChange={(e) => handleChange('duration', e.target.value)}
            placeholder="0:00"
            className="text-center text-sm bg-transparent border-transparent hover:border-zinc-300 dark:hover:border-zinc-600 focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {songType === 'song' && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              {isExpanded ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </button>
          )}
          <button
            onClick={onDelete}
            className="p-2 text-zinc-400 hover:text-red-500"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Expandable Content - only for songs */}
      {isExpanded && songType === 'song' && (
        <div className="p-4 space-y-4 border-t border-zinc-200 dark:border-zinc-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Timing/BPM */}
            <Input
              label="Timing / BPM"
              value={song.timingBpm}
              onChange={(e) => handleChange('timingBpm', e.target.value)}
              placeholder="z.B. 120 BPM, 4/4"
            />

            {/* Lighting */}
            <Input
              label="Beleuchtung / Farbschema"
              value={song.lighting}
              onChange={(e) => handleChange('lighting', e.target.value)}
              placeholder="z.B. Blau, gedimmt"
            />
          </div>

          {/* Visual Description */}
          <Textarea
            label="Visual-Beschreibung"
            value={song.visualDescription}
            onChange={(e) => handleChange('visualDescription', e.target.value)}
            placeholder="Beschreibe die Visuals für diesen Song..."
          />

          {/* Transitions */}
          <Textarea
            label="Übergänge"
            value={song.transitions}
            onChange={(e) => handleChange('transitions', e.target.value)}
            placeholder="Wie wird in/aus diesem Song übergegangen?"
          />

          {/* Stage Directions */}
          <Textarea
            label="Bühnenanweisungen"
            value={song.stageDirections}
            onChange={(e) => handleChange('stageDirections', e.target.value)}
            placeholder="Positionen, Bewegungen, Performer-Notizen..."
          />

          {/* Audio Cues */}
          <Textarea
            label="Audio-Cues"
            value={song.audioCues}
            onChange={(e) => handleChange('audioCues', e.target.value)}
            placeholder="Sound-Effekte, Samples, Playback-Notizen..."
          />

          {/* Media Links */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Medien-Links
            </label>
            <div className="space-y-2">
              {song.mediaLinks.map((link, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={link}
                    onChange={(e) => {
                      const newLinks = [...song.mediaLinks];
                      newLinks[index] = e.target.value;
                      handleChange('mediaLinks', newLinks);
                    }}
                    className="flex-1"
                  />
                  <button
                    onClick={() => removeMediaLink(index)}
                    className="p-2 text-zinc-400 hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <Input
                  value={newMediaLink}
                  onChange={(e) => setNewMediaLink(e.target.value)}
                  placeholder="Neuen Link hinzufügen..."
                  className="flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && addMediaLink()}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={addMediaLink}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Custom Fields */}
          {customFields.length > 0 && (
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
              <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3 flex items-center gap-2">
                <Music className="w-4 h-4" />
                Benutzerdefinierte Felder
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customFields.map((field) => (
                  <div key={field.id}>
                    {field.fieldType === 'textarea' ? (
                      <Textarea
                        label={field.fieldName}
                        value={song.customFields[field.fieldName] || ''}
                        onChange={(e) =>
                          handleCustomFieldChange(field.fieldName, e.target.value)
                        }
                      />
                    ) : (
                      <Input
                        label={field.fieldName}
                        value={song.customFields[field.fieldName] || ''}
                        onChange={(e) =>
                          handleCustomFieldChange(field.fieldName, e.target.value)
                        }
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
