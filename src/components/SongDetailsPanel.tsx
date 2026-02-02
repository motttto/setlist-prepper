'use client';

import { useState } from 'react';
import { Song, CustomField, TransitionType } from '@/types';
import { Input, Textarea, Button } from './ui';
import { Plus, X, Music, Coffee, Star, ExternalLink } from 'lucide-react';

interface SongDetailsPanelProps {
  song: Song | null;
  customFields: CustomField[];
  onChange: (song: Song) => void;
}

export default function SongDetailsPanel({
  song,
  customFields,
  onChange,
}: SongDetailsPanelProps) {
  const [newMediaLink, setNewMediaLink] = useState('');

  if (!song) {
    return (
      <div className="h-full flex items-center justify-center text-zinc-400 dark:text-zinc-500">
        <div className="text-center">
          <Music className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Wähle einen Song aus der Liste</p>
        </div>
      </div>
    );
  }

  const songType = song.type || 'song';

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

  // Header styling based on type
  const getHeaderStyles = () => {
    switch (songType) {
      case 'pause':
        return {
          bg: 'bg-amber-50 dark:bg-amber-900',
          icon: <Coffee className="w-5 h-5 text-amber-500" />,
          label: 'Pause',
        };
      case 'encore':
        return {
          bg: 'bg-purple-50 dark:bg-purple-900',
          icon: <Star className="w-5 h-5 text-purple-500" />,
          label: 'Zugabe',
        };
      default:
        return {
          bg: 'bg-indigo-50 dark:bg-indigo-900',
          icon: <Music className="w-5 h-5 text-indigo-500" />,
          label: `Song #${song.position}`,
        };
    }
  };

  const headerStyles = getHeaderStyles();

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className={`${headerStyles.bg} p-4 border-b border-zinc-200 dark:border-zinc-700 sticky top-0`}>
        <div className="flex items-center gap-3">
          {headerStyles.icon}
          <div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              {headerStyles.label}
            </span>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
              {song.title || 'Ohne Titel'}
            </h3>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Only show details for songs, not pause/encore */}
        {songType === 'song' ? (
          <>
            {/* Title */}
            <Input
              label="Titel"
              value={song.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Song-Titel eingeben..."
            />

            {/* Lyrics */}
            <Textarea
              label="Lyrics"
              value={song.lyrics || ''}
              onChange={(e) => handleChange('lyrics', e.target.value)}
              placeholder="Songtext eingeben..."
              rows={6}
            />

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

            {/* Visual Description */}
            <Textarea
              label="Visual-Beschreibung"
              value={song.visualDescription}
              onChange={(e) => handleChange('visualDescription', e.target.value)}
              placeholder="Beschreibe die Visuals für diesen Song..."
            />

            {/* Transitions */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Übergang zum nächsten Song
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {([
                  { value: 'smooth', label: 'Fließend' },
                  { value: 'hard', label: 'Abrupt' },
                  { value: 'fadeOut', label: 'Ausfaden' },
                  { value: 'fadeIn', label: 'Einfaden' },
                  { value: 'crossfade', label: 'Crossfade' },
                  { value: 'segue', label: 'Segue' },
                  { value: 'applause', label: 'Applaus' },
                  { value: 'talk', label: 'Ansage' },
                  { value: 'silence', label: 'Stille' },
                  { value: 'medley', label: 'Medley' },
                ] as { value: TransitionType; label: string }[]).map((transition) => {
                  const isSelected = (song.transitionTypes || []).includes(transition.value);
                  return (
                    <button
                      key={transition.value}
                      type="button"
                      onClick={() => {
                        const current = song.transitionTypes || [];
                        const updated = isSelected
                          ? current.filter((t) => t !== transition.value)
                          : [...current, transition.value];
                        onChange({ ...song, transitionTypes: updated });
                      }}
                      className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                        isSelected
                          ? 'bg-indigo-100 dark:bg-indigo-900/40 border-indigo-400 dark:border-indigo-600 text-indigo-700 dark:text-indigo-300'
                          : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:border-indigo-300 dark:hover:border-indigo-500'
                      }`}
                    >
                      {transition.label}
                    </button>
                  );
                })}
              </div>
              <Textarea
                value={song.transitions}
                onChange={(e) => handleChange('transitions', e.target.value)}
                placeholder="Details zum Übergang..."
                rows={2}
              />
            </div>

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
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-zinc-400 hover:text-indigo-500 transition-colors"
                      title="Link öffnen"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
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
                <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                  Eigene Felder
                </h4>
                <div className="space-y-3">
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
          </>
        ) : (
          /* Pause / Encore - Titel und Notizen */
          <>
            <Input
              label="Titel"
              value={song.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder={songType === 'pause' ? 'Pause' : 'Zugabe'}
            />
            <Textarea
              label="Notizen"
              value={song.stageDirections}
              onChange={(e) => handleChange('stageDirections', e.target.value)}
              placeholder={songType === 'pause' ? 'Notizen zur Pause...' : 'Notizen zur Zugabe...'}
              rows={4}
            />
          </>
        )}
      </div>
    </div>
  );
}
