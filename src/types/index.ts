// TypeScript Interfaces for Setlist-Prepper (Event-Prepper)

// ===========================================
// NEUE HIERARCHISCHE STRUKTUR: Event > Stage > Act > Song
// ===========================================

// 'act' is kept for backward compatibility with legacy flat structure
export type SongType = 'song' | 'pause' | 'encore' | 'act';

export type ActType = 'band' | 'dj' | 'solo' | 'workshop' | 'performance' | 'other';

export type TransitionType =
  | 'smooth'      // Fließend
  | 'hard'        // Abrupt
  | 'fadeOut'     // Ausfaden
  | 'fadeIn'      // Einfaden
  | 'crossfade'   // Crossfade
  | 'segue'       // Segue (nahtlos)
  | 'applause'    // Applaus-Pause
  | 'talk'        // Ansage/Moderation
  | 'silence'     // Stille
  | 'medley';     // Medley (direkt weiter)

export interface Song {
  id: string;
  position: number;
  type: SongType;
  title: string;
  duration: string; // Format: "3:45" oder leer
  lyrics: string;
  visualDescription: string;
  timingBpm: string;
  transitionTypes: TransitionType[];
  transitions: string;
  lighting: string;
  mediaLinks: string[];
  stageDirections: string;
  audioCues: string;
  customFields: Record<string, string>;
  muted?: boolean; // Wenn true, wird Song übersprungen (grau) aber nicht gelöscht
  actType?: ActType; // Legacy field for backward compatibility with flat structure
}

// Act enthält Songs
export interface Act {
  id: string;
  name: string;
  type: ActType;
  position: number;
  isCollapsed?: boolean;
  description?: string;
  technicalRequirements?: string;
  mediaLinks?: string[];
  songs: Song[];
}

// Stage enthält Acts
export interface Stage {
  id: string;
  name: string;
  color?: string;
  position: number;
  acts: Act[];
}

// Event (früher Setlist) - oberste Ebene
export interface Event {
  id: string;
  title: string;
  eventDate: string | null;
  startTime: string | null; // Format: "20:00"
  venue: string | null;
  stages: Stage[];
  createdAt: string;
  updatedAt: string;
}

// Legacy-Alias für Abwärtskompatibilität
export type Setlist = Event;

// Alte flache Struktur für Migration
export interface LegacySetlist {
  id: string;
  title: string;
  eventDate: string | null;
  startTime: string | null;
  venue: string | null;
  songs: (Song & { actType?: ActType; type: SongType | 'act' })[];
  createdAt: string;
  updatedAt: string;
}

export interface EventMetadata {
  id: string;
  title: string;
  eventDate: string | null;
  startTime: string | null;
  venue: string | null;
  stageCount: number;
  actCount: number;
  songCount: number;
  isShared: boolean;
  createdAt: string;
  updatedAt: string;
}

// Legacy-Alias
export type SetlistMetadata = EventMetadata;

export type CustomFieldType = 'text' | 'textarea' | 'checkbox' | 'dropdown';

export interface CustomField {
  id: string;
  userId: string;
  fieldName: string;
  fieldType: CustomFieldType;
  dropdownOptions?: string[]; // Für dropdown-Felder
  createdAt: string;
}

export interface EncryptedSetlist {
  id: string;
  userId: string;
  title: string;
  eventDate: string | null;
  venue: string;
  encryptedData: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
}

// Form State Types
export interface SetlistFormState {
  title: string;
  eventDate: string;
  venue: string;
  songs: Song[];
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Encryption Types
export interface EncryptionResult {
  ciphertext: string;
  iv: string;
  salt: string;
}

export interface DecryptionInput {
  ciphertext: string;
  iv: string;
  salt: string;
}
