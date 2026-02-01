'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Setlist } from '@/types';
import SetlistForm from '@/components/SetlistForm';
import { Card } from '@/components/ui';

export default function EditSetlistPage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const [setlist, setSetlist] = useState<Setlist | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const setlistId = params.id as string;

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      loadSetlist();
    }
  }, [status]);

  const loadSetlist = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/setlists/${setlistId}`);

      if (!response.ok) {
        if (response.status === 404) {
          setError('Setlist nicht gefunden');
          return;
        }
        throw new Error('Fehler beim Laden');
      }

      const data = await response.json();
      const { id, title, eventDate, startTime, venue, songs, createdAt, updatedAt } = data.data;

      setSetlist({
        id,
        title,
        eventDate,
        startTime,
        venue,
        songs,
        createdAt,
        updatedAt,
      });
    } catch (err) {
      console.error('Error loading setlist:', err);
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4" />
          <p className="text-zinc-500 dark:text-zinc-400">Setlist wird geladen...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 p-4">
        <Card className="max-w-md w-full text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            Fehler
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 mb-6">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Zurück zum Dashboard
          </button>
        </Card>
      </div>
    );
  }

  if (!setlist) {
    return null;
  }

  return <SetlistForm initialSetlist={setlist} setlistId={setlistId} />;
}
