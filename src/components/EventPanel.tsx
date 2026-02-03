'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Event, Stage, Act, Song, CustomField, ActType, SongType } from '@/types';
import StageTabs from './StageTabs';
import ActSection from './ActSection';
import SongDetailsPanel from './SongDetailsPanel';
import ShareDialog from './ShareDialog';
import { Button } from './ui';
import GigEditDialog from './GigEditDialog';
import {
  Plus,
  Music2,
  Calendar,
  MapPin,
  Play,
  Loader2,
  Cloud,
  CloudOff,
  FileDown,
  X,
  Users,
  Disc3,
  Music,
  Sparkles,
  Star,
} from 'lucide-react';
import { exportSetlistToPdf } from '@/lib/pdfExport';
import { migrateToEventStructure, calculateEventDuration, countSongsInEvent } from '@/lib/eventMigration';

interface EventPanelProps {
  event: Event | null;
  customFields: CustomField[];
  onSave: (event: Event) => Promise<void>;
  isLoading: boolean;
  openEditDialogTrigger?: number;
  onUnsavedChanges?: (hasChanges: boolean) => void;
}

const ACT_TYPE_OPTIONS: { value: ActType; label: string; icon: React.ReactNode }[] = [
  { value: 'band', label: 'Band', icon: <Users className="w-4 h-4" /> },
  { value: 'dj', label: 'DJ', icon: <Disc3 className="w-4 h-4" /> },
  { value: 'solo', label: 'Solo', icon: <Music className="w-4 h-4" /> },
  { value: 'workshop', label: 'Workshop', icon: <Sparkles className="w-4 h-4" /> },
  { value: 'performance', label: 'Performance', icon: <Star className="w-4 h-4" /> },
  { value: 'other', label: 'Andere', icon: <Music className="w-4 h-4" /> },
];

export default function EventPanel({
  event: rawEvent,
  customFields,
  onSave,
  isLoading,
  openEditDialogTrigger,
  onUnsavedChanges,
}: EventPanelProps) {
  // Migrate old data structure if needed
  const event = rawEvent ? migrateToEventStructure(rawEvent) : null;

  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [venue, setVenue] = useState('');
  const [stages, setStages] = useState<Stage[]>([]);
  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [showMobileDetails, setShowMobileDetails] = useState(false);
  const [showAddActMenu, setShowAddActMenu] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [sharePreselectedActId, setSharePreselectedActId] = useState<string | undefined>(undefined);
  const initialLoadRef = useRef(true);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const AUTO_SAVE_DELAY = 2000;

  // Memoize edit dialog data to prevent infinite re-renders
  const editDialogData = useMemo(() => ({ title, eventDate, startTime, venue }), [title, eventDate, startTime, venue]);

  // Sync state when event changes
  useEffect(() => {
    initialLoadRef.current = true;
    if (event) {
      setTitle(event.title || '');
      setEventDate(event.eventDate || '');
      setStartTime(event.startTime || '');
      setVenue(event.venue || '');
      setStages(event.stages || []);
      // Set active stage to first one
      if (event.stages?.length > 0 && !activeStageId) {
        setActiveStageId(event.stages[0].id);
      }
      // Select first song of first act
      const firstSong = event.stages?.[0]?.acts?.[0]?.songs?.[0];
      if (firstSong) {
        setSelectedSongId(firstSong.id);
      }
    } else {
      setTitle('');
      setEventDate('');
      setStartTime('');
      setVenue('');
      setStages([]);
      setActiveStageId(null);
      setSelectedSongId(null);
    }
    setHasUnsavedChanges(false);
    setTimeout(() => {
      initialLoadRef.current = false;
    }, 100);
  }, [event?.id]);

  // Auto-save function
  const performAutoSave = useCallback(async () => {
    if (!event || !title.trim()) return;

    setIsSaving(true);
    setSaveStatus('saving');
    setError('');

    try {
      const updatedEvent: Event = {
        id: event.id,
        title,
        eventDate: eventDate || null,
        startTime: startTime || null,
        venue: venue || null,
        stages,
        createdAt: event.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await onSave(updatedEvent);
      setHasUnsavedChanges(false);
      onUnsavedChanges?.(false);
      setSaveStatus('saved');
      setLastSavedAt(new Date());
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern');
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  }, [event, title, eventDate, startTime, venue, stages, onSave, onUnsavedChanges]);

  // Track changes and trigger auto-save
  useEffect(() => {
    if (initialLoadRef.current || !event) return;

    setHasUnsavedChanges(true);
    onUnsavedChanges?.(true);

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      performAutoSave();
    }, AUTO_SAVE_DELAY);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [title, eventDate, startTime, venue, stages]);

  // Browser beforeunload warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && saveStatus !== 'saving') {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, saveStatus]);

  // Open edit dialog when triggered from outside - track last processed trigger
  const lastProcessedTriggerRef = useRef(0);
  useEffect(() => {
    if (openEditDialogTrigger && openEditDialogTrigger > lastProcessedTriggerRef.current && event) {
      lastProcessedTriggerRef.current = openEditDialogTrigger;
      setIsEditDialogOpen(true);
    }
  }, [openEditDialogTrigger, event]);

  // Manual save
  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      setError('Bitte gib einen Titel ein');
      return;
    }

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    await performAutoSave();
  }, [title, performAutoSave]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  // Get active stage
  const activeStage = stages.find((s) => s.id === activeStageId) || stages[0] || null;

  // Stage management functions
  const handleAddStage = () => {
    const newStage: Stage = {
      id: uuidv4(),
      name: `Stage ${stages.length + 1}`,
      position: stages.length + 1,
      acts: [],
    };
    setStages([...stages, newStage]);
    setActiveStageId(newStage.id);
  };

  const handleUpdateStage = (stageId: string, updates: Partial<Stage>) => {
    setStages(stages.map((s) => (s.id === stageId ? { ...s, ...updates } : s)));
  };

  const handleDeleteStage = (stageId: string) => {
    if (stages.length <= 1) return;
    const newStages = stages.filter((s) => s.id !== stageId);
    setStages(newStages);
    if (activeStageId === stageId) {
      setActiveStageId(newStages[0]?.id || null);
    }
  };

  // Act management functions
  const handleAddAct = (type: ActType = 'band') => {
    if (!activeStage) return;

    const newAct: Act = {
      id: uuidv4(),
      name: type === 'dj' ? 'Neuer DJ' : type === 'solo' ? 'Neuer Solo-Act' : type === 'workshop' ? 'Neuer Workshop' : type === 'performance' ? 'Neue Performance' : 'Neue Band',
      type,
      position: activeStage.acts.length + 1,
      isCollapsed: false,
      songs: [],
    };

    setStages(
      stages.map((s) =>
        s.id === activeStage.id ? { ...s, acts: [...s.acts, newAct] } : s
      )
    );
    setShowAddActMenu(false);
  };

  const handleUpdateAct = (actId: string, updatedAct: Act) => {
    if (!activeStage) return;

    setStages(
      stages.map((s) =>
        s.id === activeStage.id
          ? { ...s, acts: s.acts.map((a) => (a.id === actId ? updatedAct : a)) }
          : s
      )
    );
  };

  const handleDeleteAct = (actId: string) => {
    if (!activeStage) return;

    setStages(
      stages.map((s) =>
        s.id === activeStage.id
          ? { ...s, acts: s.acts.filter((a) => a.id !== actId) }
          : s
      )
    );
  };

  // Find selected song across all stages/acts and calculate its display position
  const findSelectedSongWithPosition = (): { song: Song | null; displayPosition: number | undefined } => {
    for (const stage of stages) {
      for (const act of stage.acts) {
        let activePos = 0;
        for (const song of act.songs) {
          if (!song.muted && song.type === 'song') {
            activePos++;
          }
          if (song.id === selectedSongId) {
            const displayPos = (!song.muted && song.type === 'song') ? activePos : undefined;
            return { song, displayPosition: displayPos };
          }
        }
      }
    }
    return { song: null, displayPosition: undefined };
  };

  const { song: selectedSong, displayPosition: selectedSongDisplayPosition } = findSelectedSongWithPosition();

  // Update song in the correct act
  const handleUpdateSong = (updatedSong: Song) => {
    setStages(
      stages.map((stage) => ({
        ...stage,
        acts: stage.acts.map((act) => ({
          ...act,
          songs: act.songs.map((s) => (s.id === updatedSong.id ? updatedSong : s)),
        })),
      }))
    );
  };

  // Calculate totals
  const totalDuration = calculateEventDuration({ ...event!, stages });
  const totalSongs = countSongsInEvent({ ...event!, stages });

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const calculateEndTime = () => {
    if (!startTime) return '';
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + Math.ceil(totalDuration / 60);
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMins = totalMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
  };

  const handleEditDialogSave = (data: { title: string; eventDate: string; startTime: string; venue: string }) => {
    setTitle(data.title);
    setEventDate(data.eventDate);
    setStartTime(data.startTime);
    setVenue(data.venue);
  };

  // Flatten songs for PDF export
  const getAllSongs = (): Song[] => {
    const songs: Song[] = [];
    for (const stage of stages) {
      for (const act of stage.acts) {
        songs.push(...act.songs);
      }
    }
    return songs;
  };

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

  if (!event) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Music2 className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Kein Event ausgewählt
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Wähle links ein Event aus oder erstelle ein neues
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 mb-2 sm:mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100">
              {title || 'Unbenanntes Event'}
            </h2>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => exportSetlistToPdf({ title, eventDate, startTime, venue, songs: getAllSongs() })}
              className="px-2 sm:px-3"
            >
              <FileDown className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">PDF</span>
            </Button>
            {/* Save Status */}
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span className="hidden sm:inline">Speichert...</span>
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                <Cloud className="w-3 h-3" />
                <span className="hidden sm:inline">Gespeichert</span>
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2 py-0.5 rounded-full">
                <CloudOff className="w-3 h-3" />
                <span className="hidden sm:inline">Fehler</span>
              </span>
            )}
            {saveStatus === 'idle' && lastSavedAt && (
              <span className="hidden sm:inline text-xs text-zinc-400 dark:text-zinc-500">
                Zuletzt gespeichert {lastSavedAt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          {/* Desktop Event Info */}
          <div className="hidden lg:flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
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
            {totalSongs > 0 && (
              <>
                <span className="flex items-center gap-1">
                  <Music2 className="w-3.5 h-3.5" />
                  {totalSongs} Songs
                </span>
                <span className="flex items-center gap-1">
                  Dauer {formatDuration(totalDuration)}
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
        {/* Mobile Event Info */}
        <div className="lg:hidden mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700 text-xs text-zinc-500 dark:text-zinc-400 flex flex-wrap items-center gap-x-3 gap-y-1">
          {eventDate && <span>{formatDate(eventDate)}</span>}
          {venue && <span>{venue}</span>}
          {startTime && <span>{startTime} - {calculateEndTime()}</span>}
          <span>{totalSongs} Songs</span>
          <span>Dauer: {formatDuration(totalDuration)}</span>
        </div>
      </div>

      {/* Edit Dialog */}
      <GigEditDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        onSave={handleEditDialogSave}
        initialData={editDialogData}
      />

      {error && (
        <div className="flex-shrink-0 mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">×</button>
        </div>
      )}

      {/* Stage Tabs */}
      <div className="flex-shrink-0 mb-2 sm:mb-4">
        <StageTabs
          stages={stages}
          activeStageId={activeStageId}
          onSelectStage={setActiveStageId}
          onAddStage={handleAddStage}
          onUpdateStage={handleUpdateStage}
          onDeleteStage={handleDeleteStage}
        />
      </div>

      {/* Content Area */}
      <div className="flex-1 flex gap-2 sm:gap-4 min-h-0 overflow-hidden">
        {/* Acts List */}
        <div className="flex-1 lg:flex-none lg:w-1/2 overflow-y-auto min-h-0">
          {activeStage ? (
            <div className="space-y-3">
              {activeStage.acts.length === 0 ? (
                <div className="text-center py-6 sm:py-8">
                  <p className="text-zinc-500 dark:text-zinc-400 mb-3 sm:mb-4 text-sm">
                    Noch keine Acts auf dieser Stage
                  </p>
                </div>
              ) : (
                activeStage.acts.map((act) => (
                  <ActSection
                    key={act.id}
                    act={act}
                    onUpdate={(updatedAct) => handleUpdateAct(act.id, updatedAct)}
                    onDelete={() => handleDeleteAct(act.id)}
                    onSelectSong={(songId) => {
                      setSelectedSongId(songId);
                      if (window.innerWidth < 1024) {
                        setShowMobileDetails(true);
                      }
                    }}
                    selectedSongId={selectedSongId}
                    onShare={(actId) => {
                      setSharePreselectedActId(actId);
                      setShowShareDialog(true);
                    }}
                  />
                ))
              )}

              {/* Add Act Button */}
              <div className="relative">
                <Button
                  onClick={() => setShowAddActMenu(!showAddActMenu)}
                  variant="secondary"
                  size="sm"
                  className="w-full border-dashed"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Act hinzufügen
                </Button>

                {/* Add Act Menu */}
                {showAddActMenu && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg z-10 p-2">
                    <div className="grid grid-cols-2 gap-1">
                      {ACT_TYPE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => handleAddAct(opt.value)}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-md transition-colors"
                        >
                          {opt.icon}
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                Keine Stage vorhanden
              </p>
            </div>
          )}
        </div>

        {/* Song Details - Desktop */}
        <div className="hidden lg:block lg:w-1/2 overflow-y-auto min-h-0 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-300 dark:border-zinc-700">
          <SongDetailsPanel
            song={selectedSong}
            customFields={customFields}
            onChange={handleUpdateSong}
            displayPosition={selectedSongDisplayPosition}
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
            <div className="flex-1 overflow-y-auto">
              <SongDetailsPanel
                song={selectedSong}
                customFields={customFields}
                onChange={handleUpdateSong}
                displayPosition={selectedSongDisplayPosition}
              />
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close add act menu */}
      {showAddActMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowAddActMenu(false)}
        />
      )}

      {/* Share Dialog */}
      {event && (
        <ShareDialog
          setlistId={event.id}
          setlistTitle={title}
          isOpen={showShareDialog}
          onClose={() => {
            setShowShareDialog(false);
            setSharePreselectedActId(undefined);
          }}
          stages={stages}
          preselectedActId={sharePreselectedActId}
        />
      )}
    </div>
  );
}
