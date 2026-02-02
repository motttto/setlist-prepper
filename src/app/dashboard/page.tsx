'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { SetlistMetadata, Setlist, CustomField } from '@/types';
import Header from '@/components/Header';
import GigsList from '@/components/GigsList';
import GigSongsPanel from '@/components/GigSongsPanel';
import SettingsPanel from '@/components/SettingsPanel';
import { ConfirmModal } from '@/components/ui';

export default function DashboardPage() {
  const { status } = useSession();
  const router = useRouter();

  // Gigs state
  const [gigs, setGigs] = useState<SetlistMetadata[]>([]);
  const [selectedGigId, setSelectedGigId] = useState<string | null>(null);
  const [selectedSetlist, setSelectedSetlist] = useState<Setlist | null>(null);
  const [isLoadingGigs, setIsLoadingGigs] = useState(true);
  const [isLoadingSetlist, setIsLoadingSetlist] = useState(false);

  // Custom fields state
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [isLoadingFields, setIsLoadingFields] = useState(true);

  // Edit dialog trigger
  const [editDialogTrigger, setEditDialogTrigger] = useState(0);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);

  // Unsaved changes tracking
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingGigSwitch, setPendingGigSwitch] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      loadGigs();
      loadCustomFields();
    }
  }, [status]);

  // Load selected setlist when gig changes
  useEffect(() => {
    if (selectedGigId) {
      loadSetlist(selectedGigId);
    } else {
      setSelectedSetlist(null);
    }
  }, [selectedGigId]);

  const loadGigs = async () => {
    try {
      const response = await fetch('/api/setlists');
      const data = await response.json();
      if (data.data) {
        setGigs(data.data);
        // Auto-select first gig
        if (data.data.length > 0 && !selectedGigId) {
          setSelectedGigId(data.data[0].id);
        }
      }
    } catch (err) {
      console.error('Error loading gigs:', err);
    } finally {
      setIsLoadingGigs(false);
    }
  };

  const loadSetlist = async (id: string) => {
    setIsLoadingSetlist(true);
    try {
      const response = await fetch(`/api/setlists/${id}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedSetlist(data.data);
      }
    } catch (err) {
      console.error('Error loading setlist:', err);
    } finally {
      setIsLoadingSetlist(false);
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

  const handleDeleteGig = (id: string, title: string) => {
    setDeleteConfirm({ id, title });
  };

  const confirmDeleteGig = async () => {
    if (!deleteConfirm) return;

    const { id } = deleteConfirm;
    setDeleteConfirm(null);

    try {
      const response = await fetch(`/api/setlists/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const newGigs = gigs.filter((g) => g.id !== id);
        setGigs(newGigs);

        if (selectedGigId === id) {
          setSelectedGigId(newGigs.length > 0 ? newGigs[0].id : null);
        }
      }
    } catch (err) {
      console.error('Error deleting gig:', err);
    }
  };

  const handleNewGig = async () => {
    try {
      const response = await fetch('/api/setlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Neuer Gig',
          eventDate: null,
          venue: null,
          songs: [],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data) {
          await loadGigs();
          setSelectedGigId(data.data.id);
        }
      }
    } catch (err) {
      console.error('Error creating gig:', err);
    }
  };

  const handleSaveSetlist = async (setlist: Setlist) => {
    const response = await fetch(`/api/setlists/${setlist.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: setlist.title,
        eventDate: setlist.eventDate || null,
        startTime: setlist.startTime || null,
        venue: setlist.venue || null,
        songs: setlist.songs,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Fehler beim Speichern');
    }

    // Update local gigs list
    setGigs(gigs.map((g) =>
      g.id === setlist.id
        ? {
            ...g,
            title: setlist.title,
            eventDate: setlist.eventDate,
            startTime: setlist.startTime,
            venue: setlist.venue,
            songCount: setlist.songs.filter(s => (s.type || 'song') === 'song').length,
          }
        : g
    ));
  };

  const handleEditGig = (id: string) => {
    if (id === selectedGigId) {
      // Already selected, just open dialog
      setEditDialogTrigger((t) => t + 1);
    } else {
      // Select and open dialog
      setSelectedGigId(id);
      // Trigger dialog after setlist loads
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

      {/* Three Column Layout */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Column - Gigs */}
        <div className="w-72 flex-shrink-0 border-r border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 overflow-hidden">
          <GigsList
            gigs={gigs}
            selectedGigId={selectedGigId}
            onSelectGig={(id) => {
              if (hasUnsavedChanges && id !== selectedGigId) {
                setPendingGigSwitch(id);
              } else {
                setSelectedGigId(id);
              }
            }}
            onDeleteGig={handleDeleteGig}
            onNewGig={handleNewGig}
            onEditGig={handleEditGig}
            isLoading={isLoadingGigs}
          />
        </div>

        {/* Middle Column - Songs & Details */}
        <div className="flex-1 min-w-0 p-4 overflow-hidden">
          <GigSongsPanel
            setlist={selectedSetlist}
            customFields={customFields}
            onSave={handleSaveSetlist}
            isLoading={isLoadingSetlist}
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

      {/* Delete Gig Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={confirmDeleteGig}
        title="Gig löschen"
        message={`Möchtest du "${deleteConfirm?.title || ''}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`}
        confirmText="Ja, löschen"
        cancelText="Abbrechen"
        variant="danger"
      />

      {/* Unsaved Changes Warning Modal */}
      <ConfirmModal
        isOpen={!!pendingGigSwitch}
        onClose={() => setPendingGigSwitch(null)}
        onConfirm={() => {
          setHasUnsavedChanges(false);
          setSelectedGigId(pendingGigSwitch);
          setPendingGigSwitch(null);
        }}
        title="Ungespeicherte Änderungen"
        message="Du hast ungespeicherte Änderungen. Möchtest du wirklich zu einem anderen Gig wechseln? Deine Änderungen gehen verloren."
        confirmText="Ja, wechseln"
        cancelText="Zurück"
        variant="warning"
      />
    </div>
  );
}
