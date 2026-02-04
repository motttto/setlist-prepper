// Realtime Types for Collaborative Editing

import { Song } from '@/types';

// Presence - Wer ist gerade online/bearbeitet
export interface PresenceUser {
  id: string;
  name: string;
  color: string;
  currentSongId: string | null;
  currentField: string | null;
  lastActivity: number;
}

// Operation Types für granulare Sync
export type OperationType =
  | 'ADD_SONG'
  | 'DELETE_SONG'
  | 'UPDATE_SONG'
  | 'REORDER_SONGS'
  | 'UPDATE_METADATA'
  | 'SYNC_SAVED';

// Base Operation Interface
export interface BaseOperation {
  type: OperationType;
  userId: string;
  userName: string;
  timestamp: number;
}

// Spezifische Operations
export interface AddSongOperation extends BaseOperation {
  type: 'ADD_SONG';
  song: Song;
  position: number;
}

export interface DeleteSongOperation extends BaseOperation {
  type: 'DELETE_SONG';
  songId: string;
}

export interface UpdateSongOperation extends BaseOperation {
  type: 'UPDATE_SONG';
  songId: string;
  field: keyof Song | `customFields.${string}`;
  value: unknown;
}

export interface ReorderSongsOperation extends BaseOperation {
  type: 'REORDER_SONGS';
  songIds: string[]; // Neue Reihenfolge der IDs
}

export interface UpdateMetadataOperation extends BaseOperation {
  type: 'UPDATE_METADATA';
  field: 'title' | 'eventDate' | 'startTime' | 'venue';
  value: string | null;
}

export interface SyncSavedOperation extends BaseOperation {
  type: 'SYNC_SAVED';
  updatedAt: string;
}

export type SetlistOperation =
  | AddSongOperation
  | DeleteSongOperation
  | UpdateSongOperation
  | ReorderSongsOperation
  | UpdateMetadataOperation
  | SyncSavedOperation;

// Channel Events
export interface OperationEvent {
  type: 'broadcast';
  event: 'operation';
  payload: SetlistOperation;
}

export interface PresenceState {
  [key: string]: PresenceUser[];
}

// Auto-assigned colors for presence avatars
export const PRESENCE_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
];

// Get consistent color based on user ID
export function getPresenceColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash = hash & hash;
  }
  return PRESENCE_COLORS[Math.abs(hash) % PRESENCE_COLORS.length];
}

// Input types for broadcastOperation (without user/timestamp fields)
export type AddSongInput = Omit<AddSongOperation, 'userId' | 'userName' | 'timestamp'>;
export type DeleteSongInput = Omit<DeleteSongOperation, 'userId' | 'userName' | 'timestamp'>;
export type UpdateSongInput = Omit<UpdateSongOperation, 'userId' | 'userName' | 'timestamp'>;
export type ReorderSongsInput = Omit<ReorderSongsOperation, 'userId' | 'userName' | 'timestamp'>;
export type UpdateMetadataInput = Omit<UpdateMetadataOperation, 'userId' | 'userName' | 'timestamp'>;
export type SyncSavedInput = Omit<SyncSavedOperation, 'userId' | 'userName' | 'timestamp'>;

export type OperationInput =
  | AddSongInput
  | DeleteSongInput
  | UpdateSongInput
  | ReorderSongsInput
  | UpdateMetadataInput
  | SyncSavedInput;

// Realtime Hook Return Type
export interface UseRealtimeSetlistReturn {
  presenceUsers: PresenceUser[];
  isConnected: boolean;
  broadcastOperation: (operation: OperationInput) => void;
  updatePresence: (songId: string | null, field: string | null) => void;
}
