// TypeScript Interfaces for Setlist-Prepper

export type SongType = 'song' | 'pause' | 'encore' | 'act';

export type ActType = 'band' | 'dj' | 'solo' | 'other';

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
  actType?: ActType; // Nur für type='act': Band, DJ, Solo, etc.
}

export interface Setlist {
  id: string;
  title: string;
  eventDate: string | null;
  startTime: string | null; // Format: "20:00"
  venue: string | null;
  songs: Song[];
  createdAt: string;
  updatedAt: string;
}

export interface SetlistMetadata {
  id: string;
  title: string;
  eventDate: string | null;
  startTime: string | null;
  venue: string | null;
  songCount: number;
  isShared: boolean;
  createdAt: string;
  updatedAt: string;
}

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
