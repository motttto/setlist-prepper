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
}: PresenceIndicatorProps) {
  const otherUsers = users.filter((u) => u.id !== currentUserId);

  return (
    <div className="flex items-center gap-3">
      {/* Connection Status */}
      <div className="flex items-center gap-1.5">
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
      </div>

      {/* Other Users */}
      {otherUsers.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Bearbeiten:
          </span>
          <div className="flex -space-x-2">
            {otherUsers.slice(0, 5).map((user) => (
              <div
                key={user.id}
                className="relative group"
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium text-white border-2 border-white dark:border-zinc-900 shadow-sm cursor-default"
                  style={{ backgroundColor: user.color }}
                  title={user.name}
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-900 dark:bg-zinc-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                  {user.name}
                  {user.currentSongId && (
                    <span className="text-zinc-400"> • bearbeitet Song</span>
                  )}
                </div>
                {/* Active Editing Indicator */}
                {user.currentSongId && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border border-white dark:border-zinc-900" />
                )}
              </div>
            ))}
          </div>
          {otherUsers.length > 5 && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              +{otherUsers.length - 5}
            </span>
          )}
        </div>
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
