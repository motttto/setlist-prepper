'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { SetlistMetadata, Event, CustomField, ActType } from '@/types';
import Header from '@/components/Header';
import EventsList from '@/components/EventsList';
import EventPanel from '@/components/EventPanel';
import SettingsPanel from '@/components/SettingsPanel';
import NewEventWizard from '@/components/NewEventWizard';
import { ConfirmModal } from '@/components/ui';
import { ListMusic, Music2, Settings } from 'lucide-react';
import { createEventFromWizard, countSongsInEvent } from '@/lib/eventMigration';

export default function DashboardPage() {
  const { status } = useSession();
  const router = useRouter();

  // Events state
  const [events, setEvents] = useState<SetlistMetadata[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isLoadingEvent, setIsLoadingEvent] = useState(false);

  // Custom fields state
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [isLoadingFields, setIsLoadingFields] = useState(true);

  // Edit dialog trigger
  const [editDialogTrigger, setEditDialogTrigger] = useState(0);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);

  // Unsaved changes tracking
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingEventSwitch, setPendingEventSwitch] = useState<string | null>(null);

  // Mobile tab navigation
  const [mobileTab, setMobileTab] = useState<'events' | 'songs' | 'settings'>('songs');

  // New Event Wizard
  const [showNewEventWizard, setShowNewEventWizard] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      loadEvents();
      loadCustomFields();
    }
  }, [status]);

  // Load selected event when ID changes
  useEffect(() => {
    if (selectedEventId) {
      loadEvent(selectedEventId);
    } else {
      setSelectedEvent(null);
    }
  }, [selectedEventId]);

  const loadEvents = async () => {
    try {
      const response = await fetch('/api/setlists');
      const data = await response.json();
      if (data.data) {
        setEvents(data.data);
        // Auto-select first event
        if (data.data.length > 0 && !selectedEventId) {
          setSelectedEventId(data.data[0].id);
        }
      }
    } catch (err) {
      console.error('Error loading events:', err);
    } finally {
      setIsLoadingEvents(false);
    }
  };

  const loadEvent = async (id: string) => {
    setIsLoadingEvent(true);
    try {
      const response = await fetch(`/api/setlists/${id}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedEvent(data.data);
      }
    } catch (err) {
      console.error('Error loading event:', err);
    } finally {
      setIsLoadingEvent(false);
    }
  };

  const loadCustomFields = async () => {
    try {
      const response = await fetch('/api/custom-fields');
      const data = await response.json();
      if (data.data) {
        setCustomFields(data.data);
      }
    } catch (err) {
      console.error('Error loading custom fields:', err);
    } finally {
      setIsLoadingFields(false);
    }
  };

  const handleDeleteEvent = (id: string, title: string) => {
    setDeleteConfirm({ id, title });
  };

  const confirmDeleteEvent = async () => {
    if (!deleteConfirm) return;

    const { id } = deleteConfirm;
    setDeleteConfirm(null);

    try {
      const response = await fetch(`/api/setlists/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const newEvents = events.filter((e) => e.id !== id);
        setEvents(newEvents);

        if (selectedEventId === id) {
          setSelectedEventId(newEvents.length > 0 ? newEvents[0].id : null);
        }
      }
    } catch (err) {
      console.error('Error deleting event:', err);
    }
  };

  const handleNewEvent = () => {
    setShowNewEventWizard(true);
  };

  const handleWizardComplete = async (data: {
    title: string;
    eventDate: string | null;
    startTime: string | null;
    venue: string | null;
    stages: { name: string; acts: { name: string; type: ActType }[] }[];
  }) => {
    try {
      // Create the event structure from wizard data
      const newEvent = createEventFromWizard(data);

      const response = await fetch('/api/setlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newEvent.title,
          eventDate: newEvent.eventDate,
          startTime: newEvent.startTime,
          venue: newEvent.venue,
          stages: newEvent.stages,
        }),
      });

      if (response.ok) {
        const responseData = await response.json();
        if (responseData.data) {
          await loadEvents();
          setSelectedEventId(responseData.data.id);
        }
      }
    } catch (err) {
      console.error('Error creating event:', err);
    }
  };

  const handleSaveEvent = async (event: Event) => {
    const response = await fetch(`/api/setlists/${event.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: event.title,
        eventDate: event.eventDate || null,
        startTime: event.startTime || null,
        venue: event.venue || null,
        stages: event.stages,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Fehler beim Speichern');
    }

    // Update local events list
    setEvents(events.map((e) =>
      e.id === event.id
        ? {
            ...e,
            title: event.title,
            eventDate: event.eventDate,
            startTime: event.startTime,
            venue: event.venue,
            songCount: countSongsInEvent(event),
          }
        : e
    ));
  };

  const handleEditEvent = (id: string) => {
    if (id === selectedEventId) {
      // Already selected, just open dialog
      setEditDialogTrigger((t) => t + 1);
    } else {
      // Select and open dialog
      setSelectedEventId(id);
      // Trigger dialog after event loads
      setTimeout(() => setEditDialogTrigger((t) => t + 1), 100);
    }
  };

  const handleAddCustomField = async (name: string, type: 'text' | 'textarea') => {
    const response = await fetch('/api/custom-fields', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fieldName: name, fieldType: type }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Fehler beim Erstellen');
    }

    const data = await response.json();
    setCustomFields([...customFields, data.data]);
  };

  const handleDeleteCustomField = async (id: string) => {
    const response = await fetch(`/api/custom-fields?id=${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Fehler beim Löschen');
    }

    setCustomFields(customFields.filter((f) => f.id !== id));
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-200 dark:bg-zinc-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-zinc-200 dark:bg-zinc-950">
      <Header />

      {/* Desktop: Three Column Layout */}
      <main className="hidden lg:flex flex-1 overflow-hidden">
        {/* Left Column - Events */}
        <div className="w-72 flex-shrink-0 border-r border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 overflow-hidden">
          <EventsList
            events={events}
            selectedEventId={selectedEventId}
            onSelectEvent={(id) => {
              if (hasUnsavedChanges && id !== selectedEventId) {
                setPendingEventSwitch(id);
              } else {
                setSelectedEventId(id);
              }
            }}
            onDeleteEvent={handleDeleteEvent}
            onNewEvent={handleNewEvent}
            onEditEvent={handleEditEvent}
            isLoading={isLoadingEvents}
          />
        </div>

        {/* Middle Column - Event Panel */}
        <div className="flex-1 min-w-0 p-4 overflow-hidden">
          <EventPanel
            event={selectedEvent}
            customFields={customFields}
            onSave={handleSaveEvent}
            isLoading={isLoadingEvent}
            openEditDialogTrigger={editDialogTrigger}
            onUnsavedChanges={setHasUnsavedChanges}
          />
        </div>

        {/* Right Column - Settings */}
        <div className="w-72 flex-shrink-0 border-l border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 overflow-hidden">
          <SettingsPanel
            customFields={customFields}
            onAddField={handleAddCustomField}
            onDeleteField={handleDeleteCustomField}
            isLoading={isLoadingFields}
          />
        </div>
      </main>

      {/* Mobile: Tab-based Layout */}
      <main className="lg:hidden flex-1 flex flex-col overflow-hidden">
        {/* Mobile Content Area */}
        <div className="flex-1 overflow-hidden">
          {/* Events Tab */}
          {mobileTab === 'events' && (
            <div className="h-full bg-white dark:bg-zinc-900 p-3 overflow-hidden">
              <EventsList
                events={events}
                selectedEventId={selectedEventId}
                onSelectEvent={(id) => {
                  if (hasUnsavedChanges && id !== selectedEventId) {
                    setPendingEventSwitch(id);
                  } else {
                    setSelectedEventId(id);
                    setMobileTab('songs');
                  }
                }}
                onDeleteEvent={handleDeleteEvent}
                onNewEvent={handleNewEvent}
                onEditEvent={handleEditEvent}
                isLoading={isLoadingEvents}
              />
            </div>
          )}

          {/* Songs Tab */}
          {mobileTab === 'songs' && (
            <div className="h-full p-2 sm:p-3 overflow-hidden">
              <EventPanel
                event={selectedEvent}
                customFields={customFields}
                onSave={handleSaveEvent}
                isLoading={isLoadingEvent}
                openEditDialogTrigger={editDialogTrigger}
                onUnsavedChanges={setHasUnsavedChanges}
              />
            </div>
          )}

          {/* Settings Tab */}
          {mobileTab === 'settings' && (
            <div className="h-full bg-white dark:bg-zinc-900 p-3 overflow-hidden">
              <SettingsPanel
                customFields={customFields}
                onAddField={handleAddCustomField}
                onDeleteField={handleDeleteCustomField}
                isLoading={isLoadingFields}
              />
            </div>
          )}
        </div>

        {/* Mobile Tab Bar */}
        <div className="flex-shrink-0 bg-white dark:bg-zinc-900 border-t border-zinc-300 dark:border-zinc-800 px-2 py-1 safe-area-inset-bottom">
          <div className="flex justify-around">
            <button
              onClick={() => setMobileTab('events')}
              className={`flex flex-col items-center py-2 px-4 rounded-lg transition-colors ${
                mobileTab === 'events'
                  ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30'
                  : 'text-zinc-500 dark:text-zinc-400'
              }`}
            >
              <ListMusic className="w-5 h-5" />
              <span className="text-xs mt-0.5">Events</span>
            </button>
            <button
              onClick={() => setMobileTab('songs')}
              className={`flex flex-col items-center py-2 px-4 rounded-lg transition-colors ${
                mobileTab === 'songs'
                  ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30'
                  : 'text-zinc-500 dark:text-zinc-400'
              }`}
            >
              <Music2 className="w-5 h-5" />
              <span className="text-xs mt-0.5">Songs</span>
            </button>
            <button
              onClick={() => setMobileTab('settings')}
              className={`flex flex-col items-center py-2 px-4 rounded-lg transition-colors ${
                mobileTab === 'settings'
                  ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30'
                  : 'text-zinc-500 dark:text-zinc-400'
              }`}
            >
              <Settings className="w-5 h-5" />
              <span className="text-xs mt-0.5">Felder</span>
            </button>
          </div>
        </div>
      </main>

      {/* New Event Wizard */}
      <NewEventWizard
        isOpen={showNewEventWizard}
        onClose={() => setShowNewEventWizard(false)}
        onComplete={handleWizardComplete}
      />

      {/* Delete Event Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={confirmDeleteEvent}
        title="Event löschen"
        message={`Möchtest du "${deleteConfirm?.title || ''}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`}
        confirmText="Ja, löschen"
        cancelText="Abbrechen"
        variant="danger"
      />

      {/* Unsaved Changes Warning Modal */}
      <ConfirmModal
        isOpen={!!pendingEventSwitch}
        onClose={() => setPendingEventSwitch(null)}
        onConfirm={() => {
          setHasUnsavedChanges(false);
          setSelectedEventId(pendingEventSwitch);
          setPendingEventSwitch(null);
        }}
        title="Ungespeicherte Änderungen"
        message="Du hast ungespeicherte Änderungen. Möchtest du wirklich zu einem anderen Event wechseln? Deine Änderungen gehen verloren."
        confirmText="Ja, wechseln"
        cancelText="Zurück"
        variant="warning"
      />
    </div>
  );
}
