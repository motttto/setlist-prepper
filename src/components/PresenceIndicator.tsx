'use client';

import { PresenceUser } from '@/lib/realtimeTypes';
import { Wifi, WifiOff } from 'lucide-react';

interface PresenceIndicatorProps {
  users: PresenceUser[];
  currentUserId: string;
  isConnected: boolean;
}

export function PresenceIndicator({
  users,
  currentUserId,
  isConnected,
  currentUserName,
}: PresenceIndicatorProps & { currentUserName?: string }) {
  const otherUsers = users.filter((u) => u.id !== currentUserId);

  // Build user list: current user first, then others
  const allUserNames: string[] = [];
  if (currentUserName) {
    allUserNames.push(currentUserName);
  }
  otherUsers.forEach((u) => allUserNames.push(u.name));

  return (
    <div className="flex items-center gap-2">
      {/* Connection Status */}
      {isConnected ? (
        <>
          <Wifi className="w-4 h-4 text-green-500" />
          <span className="text-xs text-green-600 dark:text-green-400">Live</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4 text-zinc-400" />
          <span className="text-xs text-zinc-500">Offline</span>
        </>
      )}

      {/* User List */}
      {allUserNames.length > 0 && (
        <>
          <span className="text-xs text-zinc-400">·</span>
          <span className="text-xs text-zinc-600 dark:text-zinc-400">
            Aktiv: {allUserNames.join(', ')}
          </span>
        </>
      )}
    </div>
  );
}

// Kompakte Version für den Header
interface PresenceAvatarsProps {
  users: PresenceUser[];
  currentUserId: string;
  maxDisplay?: number;
}

export function PresenceAvatars({
  users,
  currentUserId,
  maxDisplay = 4,
}: PresenceAvatarsProps) {
  const otherUsers = users.filter((u) => u.id !== currentUserId);

  if (otherUsers.length === 0) return null;

  return (
    <div className="flex items-center">
      <div className="flex -space-x-1.5">
        {otherUsers.slice(0, maxDisplay).map((user) => (
          <div
            key={user.id}
            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium text-white border-2 border-white dark:border-zinc-800"
            style={{ backgroundColor: user.color }}
            title={user.name}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
        ))}
      </div>
      {otherUsers.length > maxDisplay && (
        <span className="ml-1 text-xs text-zinc-500">
          +{otherUsers.length - maxDisplay}
        </span>
      )}
    </div>
  );
}

// Field-Level Indicator (wer bearbeitet dieses Feld)
interface FieldPresenceProps {
  users: PresenceUser[];
  currentUserId: string;
  songId: string;
  fieldName?: string;
}

export function FieldPresence({
  users,
  currentUserId,
  songId,
  fieldName,
}: FieldPresenceProps) {
  const editingUsers = users.filter(
    (u) =>
      u.id !== currentUserId &&
      u.currentSongId === songId &&
      (!fieldName || u.currentField === fieldName)
  );

  if (editingUsers.length === 0) return null;

  return (
    <div className="flex items-center gap-1">
      {editingUsers.map((user) => (
        <div
          key={user.id}
          className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400"
        >
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: user.color }}
          />
          <span>{user.name} tippt...</span>
        </div>
      ))}
    </div>
  );
}
