'use client';

import { useState, useEffect, useRef } from 'react';
import { Song, CustomField, CustomFieldType, TransitionType, ActType } from '@/types';
import { Input, Textarea, Button } from './ui';
import { Plus, X, Music, Coffee, Star, ExternalLink, ChevronDown, Trash2, Users, Disc3, Check } from 'lucide-react';

interface SongDetailsPanelProps {
  song: Song | null;
  customFields: CustomField[];
  onChange: (song: Song) => void;
  onAddCustomField?: (field: { fieldName: string; fieldType: CustomFieldType; dropdownOptions?: string[] }) => void;
  onDeleteCustomField?: (fieldId: string) => void;
  displayPosition?: number;
}

export default function SongDetailsPanel({
  song,
  customFields,
  onChange,
  onAddCustomField,
  onDeleteCustomField,
  displayPosition,
}: SongDetailsPanelProps) {
  const [newMediaLink, setNewMediaLink] = useState('');
  const [linkSaved, setLinkSaved] = useState(false);
  const [showAddField, setShowAddField] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<CustomFieldType>('text');
  const [newDropdownOptions, setNewDropdownOptions] = useState('');

  // Clear media link input when switching songs
  const prevSongIdRef = useRef<string | undefined>(song?.id);
  useEffect(() => {
    if (prevSongIdRef.current !== song?.id) {
      setNewMediaLink('');
      setLinkSaved(false);
      prevSongIdRef.current = song?.id;
    }
  }, [song?.id]);

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

  const mediaLinks = song.mediaLinks || [];

  const addMediaLink = () => {
    if (newMediaLink.trim()) {
      onChange({
        ...song,
        mediaLinks: [...mediaLinks, newMediaLink.trim()],
      });
      setNewMediaLink('');
      setLinkSaved(true);
      setTimeout(() => setLinkSaved(false), 2000);
    }
  };

  const removeMediaLink = (index: number) => {
    onChange({
      ...song,
      mediaLinks: mediaLinks.filter((_, i) => i !== index),
    });
  };

  // Header styling based on type
  const getHeaderStyles = () => {
    switch (songType) {
      case 'act':
        const actLabel = song.actType === 'dj' ? 'DJ' : song.actType === 'solo' ? 'Solo-Act' : 'Band';
        return {
          bg: 'bg-cyan-50 dark:bg-cyan-900',
          icon: song.actType === 'dj' ? <Disc3 className="w-5 h-5 text-cyan-500" /> : <Users className="w-5 h-5 text-cyan-500" />,
          label: actLabel,
        };
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
          label: `Song #${displayPosition ?? song.position}`,
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
        {/* Act editing */}
        {songType === 'act' ? (
          <>
            <Input
              label="Name"
              value={song.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Band / DJ Name..."
            />

            {/* Act Type Selection */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Act-Typ
              </label>
              <div className="flex flex-wrap gap-2">
                {([
                  { value: 'band', label: 'Band', icon: <Users className="w-4 h-4" /> },
                  { value: 'dj', label: 'DJ', icon: <Disc3 className="w-4 h-4" /> },
                  { value: 'solo', label: 'Solo', icon: <Music className="w-4 h-4" /> },
                  { value: 'other', label: 'Andere', icon: <Star className="w-4 h-4" /> },
                ] as { value: ActType; label: string; icon: React.ReactNode }[]).map((actTypeOption) => {
                  const isSelected = song.actType === actTypeOption.value;
                  return (
                    <button
                      key={actTypeOption.value}
                      type="button"
                      onClick={() => {
                        onChange({ ...song, actType: actTypeOption.value });
                      }}
                      className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${
                        isSelected
                          ? 'bg-cyan-100 dark:bg-cyan-900/40 border-cyan-400 dark:border-cyan-600 text-cyan-700 dark:text-cyan-300'
                          : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:border-cyan-300 dark:hover:border-cyan-500'
                      }`}
                    >
                      {actTypeOption.icon}
                      {actTypeOption.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <Textarea
              label="Beschreibung / Notizen"
              value={song.visualDescription || ''}
              onChange={(e) => handleChange('visualDescription', e.target.value)}
              placeholder="Beschreibung des Acts, Genre, besondere Anforderungen..."
              rows={4}
            />

            <Textarea
              label="Technische Anforderungen"
              value={song.stageDirections || ''}
              onChange={(e) => handleChange('stageDirections', e.target.value)}
              placeholder="Equipment, Backline, Mikrofone..."
              rows={3}
            />

            {/* Media Links for Act */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Links (Website, Social Media, etc.)
              </label>
              <div className="space-y-2">
                {mediaLinks.map((link, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={link}
                      onChange={(e) => {
                        const newLinks = [...mediaLinks];
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
                    onChange={(e) => { setNewMediaLink(e.target.value); setLinkSaved(false); }}
                    placeholder="Neuen Link hinzufügen..."
                    className="flex-1"
                    onKeyDown={(e) => e.key === 'Enter' && addMediaLink()}
                  />
                  {newMediaLink.trim() && (
                    <a
                      href={newMediaLink.trim().startsWith('http') ? newMediaLink.trim() : `https://${newMediaLink.trim()}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-zinc-400 hover:text-indigo-500 transition-colors"
                      title="Link in neuem Tab öffnen"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={addMediaLink}
                    disabled={!newMediaLink.trim()}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {linkSaved && (
                  <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                    <Check className="w-3.5 h-3.5" />
                    <span>Link gespeichert</span>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : songType === 'song' ? (
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
                {mediaLinks.map((link, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={link}
                      onChange={(e) => {
                        const newLinks = [...mediaLinks];
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
                    onChange={(e) => { setNewMediaLink(e.target.value); setLinkSaved(false); }}
                    placeholder="Neuen Link hinzufügen..."
                    className="flex-1"
                    onKeyDown={(e) => e.key === 'Enter' && addMediaLink()}
                  />
                  {newMediaLink.trim() && (
                    <a
                      href={newMediaLink.trim().startsWith('http') ? newMediaLink.trim() : `https://${newMediaLink.trim()}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-zinc-400 hover:text-indigo-500 transition-colors"
                      title="Link in neuem Tab öffnen"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={addMediaLink}
                    disabled={!newMediaLink.trim()}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {linkSaved && (
                  <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                    <Check className="w-3.5 h-3.5" />
                    <span>Link gespeichert</span>
                  </div>
                )}
              </div>
            </div>

            {/* Custom Fields */}
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
              <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                Eigene Felder
              </h4>
              {customFields.length > 0 && (
                <div className="space-y-3 mb-4">
                  {customFields.map((field) => (
                    <div key={field.id} className="relative group">
                      {field.fieldType === 'textarea' ? (
                        <Textarea
                          label={field.fieldName}
                          value={song.customFields[field.fieldName] || ''}
                          onChange={(e) =>
                            handleCustomFieldChange(field.fieldName, e.target.value)
                          }
                        />
                      ) : field.fieldType === 'checkbox' ? (
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={song.customFields[field.fieldName] === 'true'}
                            onChange={(e) =>
                              handleCustomFieldChange(field.fieldName, e.target.checked ? 'true' : 'false')
                            }
                            className="w-5 h-5 rounded border-zinc-300 dark:border-zinc-600 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-sm text-zinc-700 dark:text-zinc-300">{field.fieldName}</span>
                        </label>
                      ) : field.fieldType === 'dropdown' ? (
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            {field.fieldName}
                          </label>
                          <div className="relative">
                            <select
                              value={song.customFields[field.fieldName] || ''}
                              onChange={(e) =>
                                handleCustomFieldChange(field.fieldName, e.target.value)
                              }
                              className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none pr-10"
                            >
                              <option value="">Auswählen...</option>
                              {(field.dropdownOptions || []).map((option, idx) => (
                                <option key={idx} value={option}>{option}</option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                          </div>
                        </div>
                      ) : (
                        <Input
                          label={field.fieldName}
                          value={song.customFields[field.fieldName] || ''}
                          onChange={(e) =>
                            handleCustomFieldChange(field.fieldName, e.target.value)
                          }
                        />
                      )}
                      {onDeleteCustomField && (
                        <button
                          onClick={() => onDeleteCustomField(field.id)}
                          className="absolute -right-2 -top-2 p-1 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Feld löschen"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add new custom field */}
              {onAddCustomField && (
                <div className="mt-3">
                  {!showAddField ? (
                    <button
                      onClick={() => setShowAddField(true)}
                      className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                    >
                      <Plus className="w-4 h-4" />
                      Neues Feld hinzufügen
                    </button>
                  ) : (
                    <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 space-y-3">
                      <Input
                        label="Feldname"
                        value={newFieldName}
                        onChange={(e) => setNewFieldName(e.target.value)}
                        placeholder="z.B. Instrument, Stimmung..."
                      />
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                          Feldtyp
                        </label>
                        <div className="relative">
                          <select
                            value={newFieldType}
                            onChange={(e) => setNewFieldType(e.target.value as CustomFieldType)}
                            className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none pr-10"
                          >
                            <option value="text">Text (einzeilig)</option>
                            <option value="textarea">Text (mehrzeilig)</option>
                            <option value="checkbox">Checkbox</option>
                            <option value="dropdown">Dropdown</option>
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                        </div>
                      </div>
                      {newFieldType === 'dropdown' && (
                        <Input
                          label="Optionen (kommagetrennt)"
                          value={newDropdownOptions}
                          onChange={(e) => setNewDropdownOptions(e.target.value)}
                          placeholder="Option 1, Option 2, Option 3"
                        />
                      )}
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            if (newFieldName.trim()) {
                              const dropdownOptions = newFieldType === 'dropdown'
                                ? newDropdownOptions.split(',').map(o => o.trim()).filter(Boolean)
                                : undefined;
                              onAddCustomField({
                                fieldName: newFieldName.trim(),
                                fieldType: newFieldType,
                                dropdownOptions,
                              });
                              setNewFieldName('');
                              setNewFieldType('text');
                              setNewDropdownOptions('');
                              setShowAddField(false);
                            }
                          }}
                          disabled={!newFieldName.trim()}
                        >
                          Hinzufügen
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setShowAddField(false);
                            setNewFieldName('');
                            setNewFieldType('text');
                            setNewDropdownOptions('');
                          }}
                        >
                          Abbrechen
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
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

            {/* Custom Fields for Pause/Encore too */}
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
              <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                Eigene Felder
              </h4>
              {customFields.length > 0 && (
                <div className="space-y-3 mb-4">
                  {customFields.map((field) => (
                    <div key={field.id} className="relative group">
                      {field.fieldType === 'textarea' ? (
                        <Textarea
                          label={field.fieldName}
                          value={song.customFields[field.fieldName] || ''}
                          onChange={(e) =>
                            handleCustomFieldChange(field.fieldName, e.target.value)
                          }
                        />
                      ) : field.fieldType === 'checkbox' ? (
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={song.customFields[field.fieldName] === 'true'}
                            onChange={(e) =>
                              handleCustomFieldChange(field.fieldName, e.target.checked ? 'true' : 'false')
                            }
                            className="w-5 h-5 rounded border-zinc-300 dark:border-zinc-600 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-sm text-zinc-700 dark:text-zinc-300">{field.fieldName}</span>
                        </label>
                      ) : field.fieldType === 'dropdown' ? (
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            {field.fieldName}
                          </label>
                          <div className="relative">
                            <select
                              value={song.customFields[field.fieldName] || ''}
                              onChange={(e) =>
                                handleCustomFieldChange(field.fieldName, e.target.value)
                              }
                              className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none pr-10"
                            >
                              <option value="">Auswählen...</option>
                              {(field.dropdownOptions || []).map((option, idx) => (
                                <option key={idx} value={option}>{option}</option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                          </div>
                        </div>
                      ) : (
                        <Input
                          label={field.fieldName}
                          value={song.customFields[field.fieldName] || ''}
                          onChange={(e) =>
                            handleCustomFieldChange(field.fieldName, e.target.value)
                          }
                        />
                      )}
                      {onDeleteCustomField && (
                        <button
                          onClick={() => onDeleteCustomField(field.id)}
                          className="absolute -right-2 -top-2 p-1 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Feld löschen"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add new custom field */}
              {onAddCustomField && (
                <div className="mt-3">
                  {!showAddField ? (
                    <button
                      onClick={() => setShowAddField(true)}
                      className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                    >
                      <Plus className="w-4 h-4" />
                      Neues Feld hinzufügen
                    </button>
                  ) : (
                    <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 space-y-3">
                      <Input
                        label="Feldname"
                        value={newFieldName}
                        onChange={(e) => setNewFieldName(e.target.value)}
                        placeholder="z.B. Instrument, Stimmung..."
                      />
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                          Feldtyp
                        </label>
                        <div className="relative">
                          <select
                            value={newFieldType}
                            onChange={(e) => setNewFieldType(e.target.value as CustomFieldType)}
                            className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none pr-10"
                          >
                            <option value="text">Text (einzeilig)</option>
                            <option value="textarea">Text (mehrzeilig)</option>
                            <option value="checkbox">Checkbox</option>
                            <option value="dropdown">Dropdown</option>
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                        </div>
                      </div>
                      {newFieldType === 'dropdown' && (
                        <Input
                          label="Optionen (kommagetrennt)"
                          value={newDropdownOptions}
                          onChange={(e) => setNewDropdownOptions(e.target.value)}
                          placeholder="Option 1, Option 2, Option 3"
                        />
                      )}
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            if (newFieldName.trim()) {
                              const dropdownOptions = newFieldType === 'dropdown'
                                ? newDropdownOptions.split(',').map(o => o.trim()).filter(Boolean)
                                : undefined;
                              onAddCustomField({
                                fieldName: newFieldName.trim(),
                                fieldType: newFieldType,
                                dropdownOptions,
                              });
                              setNewFieldName('');
                              setNewFieldType('text');
                              setNewDropdownOptions('');
                              setShowAddField(false);
                            }
                          }}
                          disabled={!newFieldName.trim()}
                        >
                          Hinzufügen
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setShowAddField(false);
                            setNewFieldName('');
                            setNewFieldType('text');
                            setNewDropdownOptions('');
                          }}
                        >
                          Abbrechen
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
