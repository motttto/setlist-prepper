# Setlist-Prepper - Projekt Recap & Dokumentation

## Übersicht

**Setlist-Prepper** ist eine professionelle Web-Applikation für die Planung von Konzert-Setlists mit detaillierten visuellen Beschreibungen, Licht-Notizen und Bühnenanweisungen.

**Zielgruppe:** VJs, Lichtdesigner, Bands und Event-Organisatoren

| Info | Wert |
|------|------|
| Version | 0.1.0 |
| Status | Aktive Entwicklung |
| Letztes Update | Februar 2026 |

---

## Tech-Stack

| Layer | Technologie | Version |
|-------|-------------|---------|
| Frontend Framework | Next.js (App Router) | 16.1.6 |
| UI Library | React | 19.2.3 |
| Sprache | TypeScript | 5.x |
| Styling | Tailwind CSS | 4.x |
| Icons | lucide-react | 0.563.0 |
| Drag & Drop | @dnd-kit | 6.3.1 / 10.0.0 |
| Authentifizierung | NextAuth.js | 4.24.13 |
| Datenbank | Supabase (PostgreSQL) | - |
| Echtzeit | Supabase Realtime (WebSocket) | - |
| PDF Export | jsPDF | 4.1.0 |

---

## Architektur

### Hierarchische Datenstruktur

```
Event
  └── Stages (Bühnen)
        └── Acts (Künstler/Bands)
              └── Songs
```

### Unterstützte Event-Typen

| Typ | Beschreibung |
|-----|--------------|
| Single Band/Artist | 1 Stage, 1 Act |
| Multi-Band Events | 1 Stage, mehrere Acts |
| Festivals | Mehrere Stages, mehrere Acts pro Stage |

---

## Hauptfunktionen

### Song-Management
- Erstellen, Bearbeiten, Löschen von Songs
- Drag & Drop Sortierung
- Song-Typen: `song`, `pause`, `encore`
- Duplizieren von Songs als Templates
- Muting: Songs temporär ausblenden (ohne Löschung)
- Automatische Positionsnummerierung

### Song-Details (pro Song)
- **Titel & Dauer** (MM:SS Format)
- **Lyrics** (Volltext)
- **Visual Description** (für VJs)
- **Timing/BPM** (Tempo)
- **Transitions** (10 Typen: smooth, hard, fadeOut, fadeIn, crossfade, segue, applause, talk, silence, medley)
- **Lighting** (Lichtanweisungen)
- **Stage Directions** (Bühnenanweisungen)
- **Audio Cues** (Sound-Design)
- **Media Links** (mehrere URLs)
- **Custom Fields** (benutzerdefinierte Felder)

### Event-Management
- Event-Metadaten: Titel, Datum, Startzeit, Venue
- Auto-berechnete Gesamtdauer
- Automatische Endzeit-Berechnung
- NewEventWizard für Event-Erstellung

### Custom Fields
- Benutzerdefinierte Felder (pro User)
- Feldtypen: text, textarea, dropdown
- Verfügbar in allen Events des Users

### Collaboration
- Passwortgeschütztes Teilen via Token
- Echtzeit-Synchronisation (WebSocket)
- Presence-Indikatoren (wer bearbeitet gerade)
- Konflikt-Erkennung bei gleichzeitiger Bearbeitung
- Auto-Save alle 2 Sekunden

### PDF Export
- Professionelle PDF-Generierung
- Event-Metadaten (Datum, Zeit, Venue)
- Kumulative Timestamps
- Farbcodierung (Pausen: amber, Encores: purple)
- Transition-Symbole

### Weitere Features
- **Keyboard Shortcuts:** Cmd/Ctrl+S (speichern), Cmd/Ctrl+N (neuer Song)
- **Dark Mode:** Vollständige Tailwind CSS Dark Mode Unterstützung
- **Responsive Design:** Desktop (3-Spalten) und Mobile (Tab-basiert)
- **Authentifizierung:** Email/Passwort, Google OAuth, GitHub OAuth

---

## Projekt-Struktur

```
src/
├── app/                              # Next.js App Router
│   ├── api/                          # API Routes
│   │   ├── auth/                     # Authentifizierung
│   │   ├── setlists/                 # Event CRUD
│   │   ├── custom-fields/            # Custom Fields
│   │   └── gig/[token]/              # Shared Gig Endpoints
│   ├── dashboard/page.tsx            # Haupt-Dashboard
│   ├── login/page.tsx                # Login
│   ├── register/page.tsx             # Registrierung
│   ├── gig/[token]/page.tsx          # Shared Gig View
│   ├── datenschutz/page.tsx          # Datenschutz
│   └── impressum/page.tsx            # Impressum
│
├── components/                        # React Components (~21 Stück)
│   ├── ui/                           # Basis UI Components
│   ├── EventsList.tsx                # Sidebar: Event-Liste
│   ├── EventPanel.tsx                # Haupt-Editor
│   ├── ActSection.tsx                # Act mit Songs
│   ├── StageTabs.tsx                 # Stage-Navigation
│   ├── SongListItem.tsx              # Song-Zeile
│   ├── SongDetailsPanel.tsx          # Song-Details Editor
│   ├── SettingsPanel.tsx             # Custom Fields Management
│   ├── ShareDialog.tsx               # Teilen-Dialog
│   ├── NewEventWizard.tsx            # Event-Erstellungs-Wizard
│   └── PresenceIndicator.tsx         # Online-Users Anzeige
│
├── hooks/
│   └── useRealtimeSetlist.ts         # Echtzeit-Sync Hook
│
├── lib/
│   ├── auth.ts                       # NextAuth Konfiguration
│   ├── supabase.ts                   # Supabase Client & Queries
│   ├── eventMigration.ts             # Migrations (flat → hierarchisch)
│   └── pdfExport.ts                  # PDF Generierung
│
└── types/
    └── index.ts                      # TypeScript Interfaces
```

---

## Datenmodelle

### Event
```typescript
interface Event {
  id: string;
  title: string;
  eventDate: string | null;
  startTime: string | null;
  venue: string | null;
  stages: Stage[];
  createdAt: string;
  updatedAt: string;
}
```

### Stage
```typescript
interface Stage {
  id: string;
  name: string;
  color?: string;
  position: number;
  acts: Act[];
}
```

### Act
```typescript
interface Act {
  id: string;
  name: string;
  type: 'band' | 'dj' | 'solo' | 'workshop' | 'performance' | 'other';
  position: number;
  isCollapsed?: boolean;
  songs: Song[];
}
```

### Song
```typescript
interface Song {
  id: string;
  position: number;
  type: 'song' | 'pause' | 'encore';
  title: string;
  duration: string;
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
  muted?: boolean;
}
```

---

## Datenbank-Schema (Supabase PostgreSQL)

### Tabellen

**users**
- `id` (UUID, PK)
- `email` (TEXT, unique)
- `password_hash` (TEXT)
- `name` (TEXT, nullable)
- `created_at` (TIMESTAMP)

**setlists**
- `id` (UUID, PK)
- `user_id` (UUID, FK → users)
- `title` (TEXT)
- `event_date` (DATE)
- `start_time` (TIME)
- `venue` (TEXT)
- `encrypted_data` (JSONB) - Enthält gesamte Event-Struktur
- `share_token` (TEXT, unique, nullable)
- `share_password_hash` (TEXT, nullable)
- `is_shared` (BOOLEAN)
- `last_edited_by` (TEXT)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**custom_fields**
- `id` (UUID, PK)
- `user_id` (UUID, FK → users)
- `field_name` (TEXT)
- `field_type` (TEXT)
- `dropdown_options` (TEXT[])
- `created_at` (TIMESTAMP)

---

## API Endpoints

### Authentifizierung
- `POST /api/auth/register` - Registrierung
- `POST /api/auth/[...nextauth]` - NextAuth Handler

### Events (Authentifiziert)
- `GET /api/setlists` - Alle Events abrufen
- `POST /api/setlists` - Neues Event erstellen
- `GET /api/setlists/[id]` - Einzelnes Event
- `PUT /api/setlists/[id]` - Event aktualisieren
- `DELETE /api/setlists/[id]` - Event löschen
- `POST /api/setlists/[id]/share` - Sharing aktivieren/deaktivieren

### Shared Gigs (Passwortgeschützt)
- `POST /api/gig/[token]` - Mit Passwort authentifizieren
- `PUT /api/gig/[token]` - Shared Gig aktualisieren

### Custom Fields
- `GET /api/custom-fields` - Alle Custom Fields
- `POST /api/custom-fields` - Neues Field erstellen
- `DELETE /api/custom-fields?id=...` - Field löschen

---

## Git History (Letzte Commits)

| Commit | Beschreibung |
|--------|--------------|
| `b32c8f0` | feat: Add event type selection to wizard |
| `fa0b50f` | feat: Improve NewEventWizard with step-by-step selection |
| `19c3d78` | feat: Refactor to hierarchical Event > Stage > Act > Song |
| `693d293` | Add Act support for multi-band/DJ events |
| `72063bd` | Document Festival/Lineup-Management concept |
| `04598d0` | Add keyboard shortcuts, duplicate & mute song |
| `8335911` | Add comprehensive documentation |
| `e6e7b82` | Make admin panel mobile-responsive |

---

## Roadmap

### Erledigt
- [x] Keyboard Shortcuts
- [x] Duplicate Songs
- [x] Mute Songs
- [x] Mobile Responsiveness
- [x] PDF Export
- [x] Real-time Collaboration
- [x] Event Type Wizard
- [x] Hierarchische Struktur (Event > Stage > Act > Song)

### Kurzfristig (Nice-to-have)
- [ ] Song-Suche/Filter
- [ ] Bulk Operations
- [ ] Undo/Redo
- [ ] Markdown Support
- [ ] CSV Import/Export
- [ ] PDF Templates

### Mittelfristig (Features)
- [ ] Setlist Templates
- [ ] Archiv-Funktion
- [ ] Tags/Kategorien
- [ ] Kommentare & Change History
- [ ] Permissions (read-only vs edit)
- [ ] Team Accounts
- [ ] Spotify/YouTube Integration

### Langfristig (Vision)
- [ ] Native Mobile Apps (iOS/Android)
- [ ] Festival Timetable-View
- [ ] MIDI/OSC Integration
- [ ] Stage Plot Integration
- [ ] Crew Assignment System
- [ ] Analytics

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# NextAuth.js
NEXTAUTH_SECRET=xxx
NEXTAUTH_URL=https://your-domain.com

# OAuth (optional)
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx

# Legal Pages
LEGAL_NAME=Name
LEGAL_STREET=Street Address
LEGAL_CITY=Postal Code City
LEGAL_EMAIL=contact@example.com
```

---

## Development

### Scripts
```bash
npm run dev      # Development Server (localhost:3000)
npm run build    # Production Build
npm start        # Production Server
npm run lint     # ESLint
```

### Deployment
- **Platform:** Vercel (empfohlen)
- **Build Command:** `npm run build`
- **Output:** `.next`

---

## Responsive Design

### Desktop (≥1024px)
- Drei-Spalten Layout: Events | Editor | Settings
- Alle Informationen auf einem Bildschirm

### Mobile (<1024px)
- Tab-basierte Navigation
- Bottom Tab Bar
- Song Details als Modal
- Kompakte Buttons (nur Icons)

---

## Sicherheit

- NextAuth.js mit JWT Sessions
- Supabase Row Level Security (RLS)
- Passwort-Hashing (bcrypt)
- Share Tokens als UUIDs
- HTTPS only

---

## Migration

Die Codebase enthält Backward-Compatibility für ältere flat-structure Setlists:
- `migrateToEventStructure()` konvertiert Legacy-Format
- Automatisches Upgrade zu hierarchischer Struktur
- Default: 1 Stage mit 1 Act

---

*Zuletzt aktualisiert: Februar 2026*
