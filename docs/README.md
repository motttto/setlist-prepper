# Setlist Prepper - Dokumentation

Eine Webanwendung zur Planung von Konzert-Setlists mit Visual-Beschreibungen, Beleuchtungsnotizen und Bühnenanweisungen. Entwickelt für VJs, Lichtdesigner und Bands.

## Inhaltsverzeichnis

1. [Funktionsumfang](#funktionsumfang)
2. [Architektur](#architektur)
3. [Datenmodell](#datenmodell)
4. [Benutzeroberfläche](#benutzeroberfläche)
5. [API-Endpunkte](#api-endpunkte)
6. [Echtzeit-Kollaboration](#echtzeit-kollaboration)
7. [Deployment](#deployment)

---

## Funktionsumfang

### Kernfunktionen

#### Gig-Verwaltung
- Erstellen, Bearbeiten und Löschen von Gigs
- Metadaten: Titel, Datum, Startzeit, Veranstaltungsort
- Automatische Berechnung von Gesamtdauer und Endzeit

#### Song-Verwaltung
- Songs hinzufügen mit Titel und Dauer (MM:SS Format)
- Pausen und Zugaben als spezielle Eintragstypen
- Drag & Drop zum Umsortieren der Reihenfolge
- Automatische Positionsnummerierung

#### Song-Details (pro Song)
- **Titel** - Name des Songs
- **Dauer** - im Format MM:SS
- **Lyrics** - Liedtext
- **Visual-Beschreibung** - Anweisungen für VJ/Visuals
- **Timing/BPM** - Tempo-Informationen
- **Transitions** - Übergangstypen (Cut, Fade, Crossfade, etc.)
- **Beleuchtung** - Lichtanweisungen
- **Bühnenanweisungen** - Stage Directions
- **Audio-Cues** - Ton-Hinweise
- **Media-Links** - URLs zu Referenzmaterial
- **Benutzerdefinierte Felder** - Eigene Zusatzfelder

#### Benutzerdefinierte Felder
- Erstellen eigener Felder pro Benutzer/Gig
- Feldtypen: Text (einzeilig), Textarea (mehrzeilig), Dropdown
- Felder werden in Song-Details angezeigt

#### Teilen & Kollaboration
- Gigs über passwortgeschützte Links teilen
- Echtzeit-Synchronisation zwischen mehreren Nutzern
- Presence-Anzeige (wer ist online, wer bearbeitet was)
- Konflikt-Erkennung bei gleichzeitiger Bearbeitung

#### PDF-Export
- Export der kompletten Setlist als PDF
- Professionelles Layout für Bühnen-Nutzung
- Enthält alle Song-Details und Notizen

#### Auto-Save
- Automatisches Speichern nach 2 Sekunden Inaktivität
- Visuelles Feedback (Speichert... / Gespeichert / Fehler)
- Warnung bei ungespeicherten Änderungen beim Verlassen

---

## Architektur

### Tech Stack

| Komponente | Technologie |
|------------|-------------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| UI-Komponenten | Eigene Komponenten (Button, Input, Card, Modal) |
| Drag & Drop | @dnd-kit/core, @dnd-kit/sortable |
| Authentifizierung | NextAuth.js mit Credentials Provider |
| Datenbank | Supabase (PostgreSQL) |
| Echtzeit | Supabase Realtime (WebSocket) |
| PDF-Export | jsPDF |
| Hosting | Vercel |

### Projektstruktur

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── auth/          # NextAuth Endpoints
│   │   ├── custom-fields/ # Eigene Felder API
│   │   ├── gig/           # Geteilte Gigs API
│   │   └── setlists/      # Setlist CRUD API
│   ├── dashboard/         # Admin Panel (eingeloggt)
│   ├── gig/[token]/       # Geteilte Gig-Ansicht
│   ├── setlist/           # Legacy Setlist-Editor
│   ├── login/             # Login-Seite
│   ├── register/          # Registrierung
│   ├── datenschutz/       # Datenschutzerklärung
│   ├── impressum/         # Impressum
│   └── page.tsx           # Landing Page
├── components/            # React-Komponenten
│   ├── ui/               # Basis-UI-Komponenten
│   ├── Header.tsx        # App-Header
│   ├── GigsList.tsx      # Gig-Liste (Sidebar)
│   ├── GigSongsPanel.tsx # Song-Editor Hauptbereich
│   ├── SongListItem.tsx  # Einzelner Song in Liste
│   ├── SongDetailsPanel.tsx # Song-Detail-Editor
│   ├── SettingsPanel.tsx # Einstellungen (Custom Fields)
│   ├── ShareDialog.tsx   # Teilen-Dialog
│   ├── PresenceIndicator.tsx # Online-Nutzer-Anzeige
│   └── ...
├── hooks/                # Custom React Hooks
│   └── useRealtimeSetlist.ts # Echtzeit-Sync Hook
├── lib/                  # Utilities
│   ├── supabase.ts      # Supabase Client
│   ├── pdfExport.ts     # PDF-Generierung
│   └── realtimeTypes.ts # Realtime Operation Types
└── types/               # TypeScript Types
    └── index.ts
```

---

## Datenmodell

### Supabase Tabellen

#### `users`
```sql
id: uuid (PK)
email: text (unique)
password_hash: text
name: text (nullable)
created_at: timestamp
```

#### `setlists`
```sql
id: uuid (PK)
user_id: uuid (FK -> users)
title: text
event_date: date (nullable)
start_time: time (nullable)
venue: text (nullable)
encrypted_data: jsonb  -- Enthält songs Array (NICHT verschlüsselt, nur JSON)
share_token: text (nullable, unique)
share_password_hash: text (nullable)
is_shared: boolean
last_edited_by: text (nullable)
created_at: timestamp
updated_at: timestamp
```

#### `custom_fields`
```sql
id: uuid (PK)
user_id: uuid (FK -> users, nullable)
setlist_id: uuid (FK -> setlists, nullable)
field_name: text
field_type: text ('text' | 'textarea' | 'dropdown')
dropdown_options: text[] (nullable)
created_at: timestamp
```

### TypeScript Types

```typescript
interface Song {
  id: string;
  position: number;
  type?: 'song' | 'pause' | 'encore';
  title: string;
  duration: string;  // "MM:SS"
  lyrics: string;
  visualDescription: string;
  timingBpm: string;
  transitionTypes: string[];
  transitions: string;
  lighting: string;
  mediaLinks: string[];
  stageDirections: string;
  audioCues: string;
  customFields: Record<string, string>;
}

interface Setlist {
  id: string;
  title: string;
  eventDate: string | null;
  startTime: string | null;
  venue: string | null;
  songs: Song[];
  createdAt: string;
  updatedAt: string;
}

interface CustomField {
  id: string;
  fieldName: string;
  fieldType: 'text' | 'textarea' | 'dropdown';
  dropdownOptions?: string[];
}
```

---

## Benutzeroberfläche

### Responsive Design

Die App ist vollständig responsive mit zwei Layout-Modi:

#### Desktop (≥1024px)
- **Drei-Spalten-Layout**: Gigs-Liste | Songs & Details | Einstellungen
- Song-Liste und Details nebeneinander
- Alle Informationen auf einen Blick

#### Mobile (<1024px)
- **Tab-Navigation** am unteren Bildschirmrand
- Tabs: Gigs | Songs | Felder
- Song-Details als Vollbild-Modal (Slide-up)
- Kompakte Buttons (nur Icons)
- Gig-Info in separater Zeile

### Farbschema

- **Primary**: Indigo (indigo-600)
- **Background**: Zinc-Graustufen
- **Dark Mode**: Vollständig unterstützt
- **Status-Farben**:
  - Blau: Speichert...
  - Grün: Gespeichert
  - Rot: Fehler
  - Amber: Warnung/Pause
  - Violet: Zugabe

### Komponenten-Hierarchie

```
Dashboard (page.tsx)
├── Header
│   ├── Logo + "Setlist Prepper"
│   ├── "ADMIN PANEL" Badge
│   ├── E-Mail
│   └── Abmelden-Button
├── GigsList (Sidebar)
│   ├── "Meine Gigs" Überschrift
│   ├── Neu-Button
│   └── Gig-Karten
│       ├── Titel + Shared-Icon
│       ├── Datum, Zeit, Ort
│       ├── Song-Count + Letzte Änderung
│       └── Actions (Bearbeiten, Teilen, Löschen)
├── GigSongsPanel (Hauptbereich)
│   ├── Header (Titel, PDF, Save-Status)
│   ├── Gig-Info (Datum, Zeit, Ort, Dauer)
│   ├── Add-Buttons (Song, Pause, Zugabe)
│   ├── Song-Liste (Drag & Drop)
│   └── Song-Details Panel
└── SettingsPanel
    ├── Custom Fields Liste
    └── Neues Feld hinzufügen
```

---

## API-Endpunkte

### Authentifizierung

| Methode | Endpoint | Beschreibung |
|---------|----------|--------------|
| POST | `/api/auth/register` | Neuen Benutzer registrieren |
| POST | `/api/auth/[...nextauth]` | NextAuth.js Login/Logout |

### Setlists (geschützt)

| Methode | Endpoint | Beschreibung |
|---------|----------|--------------|
| GET | `/api/setlists` | Alle Setlists des Benutzers |
| POST | `/api/setlists` | Neue Setlist erstellen |
| GET | `/api/setlists/[id]` | Einzelne Setlist laden |
| PUT | `/api/setlists/[id]` | Setlist aktualisieren |
| DELETE | `/api/setlists/[id]` | Setlist löschen |
| POST | `/api/setlists/[id]/share` | Teilen aktivieren/deaktivieren |

### Geteilte Gigs (passwortgeschützt)

| Methode | Endpoint | Beschreibung |
|---------|----------|--------------|
| POST | `/api/gig/[token]` | Authentifizierung mit Passwort |
| PUT | `/api/gig/[token]` | Gig aktualisieren (mit Konflikt-Erkennung) |
| POST | `/api/gig/[token]/custom-fields` | Custom Field hinzufügen |
| DELETE | `/api/gig/[token]/custom-fields` | Custom Field löschen |

### Benutzerdefinierte Felder

| Methode | Endpoint | Beschreibung |
|---------|----------|--------------|
| GET | `/api/custom-fields` | Alle Custom Fields des Benutzers |
| POST | `/api/custom-fields` | Neues Field erstellen |
| DELETE | `/api/custom-fields?id=...` | Field löschen |

---

## Echtzeit-Kollaboration

### Implementierung

Die Echtzeit-Funktionalität nutzt Supabase Realtime (WebSocket):

```typescript
// Hook: useRealtimeSetlist.ts
const channel = supabase.channel(`setlist:${setlistId}`)
  .on('broadcast', { event: 'operation' }, handleRemoteOperation)
  .on('presence', { event: 'sync' }, handlePresenceSync)
  .subscribe();
```

### Operation Types

```typescript
type SetlistOperation =
  | { type: 'ADD_SONG'; song: Song; position: number }
  | { type: 'DELETE_SONG'; songId: string }
  | { type: 'UPDATE_SONG'; songId: string; field: string; value: unknown }
  | { type: 'REORDER_SONGS'; songIds: string[] }
  | { type: 'UPDATE_METADATA'; field: string; value: string | null };
```

### Presence-Tracking

- Zeigt alle aktiven Benutzer als kommaseparierte Liste
- Grüner Punkt bei Verbindung, gelb bei Verbindungsproblemen
- Automatische Aktualisierung bei Join/Leave

### Konflikt-Handling

- `expectedUpdatedAt` wird bei jedem Save mitgeschickt
- Server prüft, ob Daten seit letztem Load geändert wurden
- Bei Konflikt: Warnung + "Neu laden"-Button

---

## Deployment

### Umgebungsvariablen

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# NextAuth
NEXTAUTH_SECRET=xxx
NEXTAUTH_URL=https://your-domain.com

# Legal (für Impressum/Datenschutz)
LEGAL_NAME=Max Mustermann
LEGAL_STREET=Musterstraße 1
LEGAL_CITY=12345 Musterstadt
LEGAL_EMAIL=kontakt@example.com
```

### Vercel Deployment

1. Repository mit Vercel verbinden
2. Umgebungsvariablen in Vercel Dashboard setzen
3. Build-Befehl: `npm run build`
4. Output Directory: `.next`

### Supabase Setup

1. Neues Projekt erstellen
2. SQL-Schema ausführen (siehe `/docs/schema.sql`)
3. Row Level Security (RLS) konfigurieren
4. Realtime für `setlists` Tabelle aktivieren

---

## Sicherheit

### Authentifizierung
- Passwort-Hashing mit bcrypt (10 rounds)
- Session-basierte Auth via NextAuth.js
- Nur technisch notwendige Cookies

### Datenschutz
- HTTPS-Verschlüsselung für alle Übertragungen
- Geteilte Links mit bcrypt-gehashtem Passwort
- Keine Tracking- oder Marketing-Cookies
- DSGVO-konforme Datenschutzerklärung

### API-Sicherheit
- Session-Validierung auf allen geschützten Endpunkten
- Passwort-Validierung für geteilte Gigs
- Input-Validierung und Sanitization

---

## Lizenz

Proprietär - Alle Rechte vorbehalten.
