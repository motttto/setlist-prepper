'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import {
  PresenceUser,
  SetlistOperation,
  OperationInput,
  UseRealtimeSetlistReturn,
  getPresenceColor,
} from '@/lib/realtimeTypes';

interface UseRealtimeSetlistOptions {
  setlistId: string;
  editorId: string;
  editorName: string;
  onRemoteOperation: (operation: SetlistOperation) => void;
  enabled?: boolean;
}

export function useRealtimeSetlist({
  setlistId,
  editorId,
  editorName,
  onRemoteOperation,
  enabled = true,
}: UseRealtimeSetlistOptions): UseRealtimeSetlistReturn {
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabaseRef = useRef<SupabaseClient | null>(null);

  // Aktuelle Presence-Daten für diesen User
  const currentPresenceRef = useRef<Partial<PresenceUser>>({
    currentSongId: null,
    currentField: null,
  });

  useEffect(() => {
    if (!enabled || !setlistId) return;

    // Lazy init Supabase client only when enabled
    try {
      if (!supabaseRef.current) {
        supabaseRef.current = createSupabaseBrowserClient();
      }
    } catch (err) {
      console.error('[Realtime] Failed to create Supabase client:', err);
      return;
    }

    const supabase = supabaseRef.current;
    const channelName = `setlist:${setlistId}`;

    // Channel erstellen
    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: editorId,
        },
      },
    });

    // Presence Sync Handler
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<PresenceUser>();
      const users: PresenceUser[] = [];

      Object.values(state).forEach((presences) => {
        presences.forEach((presence) => {
          users.push(presence);
        });
      });

      setPresenceUsers(users);
    });

    // Presence Join Handler
    channel.on('presence', { event: 'join' }, ({ newPresences }) => {
      console.log('[Realtime] User joined:', newPresences);
    });

    // Presence Leave Handler
    channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
      console.log('[Realtime] User left:', leftPresences);
    });

    // Operation Broadcast Handler
    channel.on('broadcast', { event: 'operation' }, ({ payload }) => {
      const operation = payload as SetlistOperation;
      // Ignoriere eigene Operations
      if (operation.userId !== editorId) {
        console.log('[Realtime] Remote operation:', operation);
        onRemoteOperation(operation);
      }
    });

    // Subscribe und Track Presence
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setIsConnected(true);

        // Eigene Presence tracken
        await channel.track({
          id: editorId,
          name: editorName,
          color: getPresenceColor(editorId),
          currentSongId: null,
          currentField: null,
          lastActivity: Date.now(),
        });

        console.log('[Realtime] Connected to channel:', channelName);
      } else if (status === 'CHANNEL_ERROR') {
        console.error('[Realtime] Channel error');
        setIsConnected(false);
      } else if (status === 'TIMED_OUT') {
        console.warn('[Realtime] Connection timed out');
        setIsConnected(false);
      }
    });

    channelRef.current = channel;

    // Cleanup
    return () => {
      console.log('[Realtime] Unsubscribing from channel:', channelName);
      channel.unsubscribe();
      setIsConnected(false);
    };
  }, [setlistId, editorId, editorName, enabled, onRemoteOperation]);

  // Operation broadcasten
  const broadcastOperation = useCallback(
    (operation: OperationInput) => {
      if (!channelRef.current || !isConnected) {
        console.warn('[Realtime] Cannot broadcast - not connected');
        return;
      }

      const fullOperation = {
        ...operation,
        userId: editorId,
        userName: editorName,
        timestamp: Date.now(),
      } as SetlistOperation;

      channelRef.current.send({
        type: 'broadcast',
        event: 'operation',
        payload: fullOperation,
      });

      console.log('[Realtime] Broadcast operation:', fullOperation);
    },
    [isConnected, editorId, editorName]
  );

  // Presence updaten (welcher Song/Feld wird bearbeitet)
  const updatePresence = useCallback(
    async (songId: string | null, field: string | null) => {
      if (!channelRef.current || !isConnected) return;

      // Nur updaten wenn sich etwas geändert hat
      if (
        currentPresenceRef.current.currentSongId === songId &&
        currentPresenceRef.current.currentField === field
      ) {
        return;
      }

      currentPresenceRef.current = { currentSongId: songId, currentField: field };

      await channelRef.current.track({
        id: editorId,
        name: editorName,
        color: getPresenceColor(editorId),
        currentSongId: songId,
        currentField: field,
        lastActivity: Date.now(),
      });
    },
    [isConnected, editorId, editorName]
  );

  return {
    presenceUsers,
    isConnected,
    broadcastOperation,
    updatePresence,
  };
}
