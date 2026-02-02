# Roadmap - Mögliche Verbesserungen

Ideen und Vorschläge für zukünftige Entwicklung.

---

## Kurzfristig (Nice-to-have)

### UX-Verbesserungen
- [x] **Keyboard Shortcuts** - Cmd+S zum Speichern, Cmd+N für neuen Song ✓
- [ ] **Song-Suche/Filter** - Bei langen Setlists nach Songs suchen
- [x] **Duplicate Song** - Bestehenden Song als Vorlage kopieren ✓
- [x] **Song Muten** - Songs temporär ausblenden ohne zu löschen ✓
- [ ] **Bulk-Operationen** - Mehrere Songs gleichzeitig löschen/verschieben
- [ ] **Undo/Redo** - Änderungen rückgängig machen

### Editor-Erweiterungen
- [ ] **Markdown-Support** - In Textfeldern (Lyrics, Beschreibungen)
- [ ] **Rich Text Editor** - Für Visual-Beschreibungen
- [ ] **Timecode-Marker** - Für präzise Timing-Angaben im Song
- [ ] **Farb-Tags** - Songs visuell kategorisieren

### Import/Export
- [ ] **CSV-Import** - Setlists aus Tabellen importieren
- [ ] **JSON-Export/Import** - Backup & Restore
- [ ] **PDF-Vorlagen** - Verschiedene Layouts wählen
- [ ] **Print-optimierte Ansicht** - Direkt aus Browser drucken

---

## Mittelfristig (Features)

### Setlist-Management
- [ ] **Templates** - Setlist-Vorlagen erstellen und wiederverwenden
- [ ] **Setlist kopieren** - Bestehende Setlist als Basis für neue
- [ ] **Archiv-Funktion** - Alte Gigs archivieren statt löschen
- [ ] **Tags/Kategorien** - Gigs organisieren (Tour, Festival, etc.)

### Kollaboration
- [ ] **Kommentare pro Song** - Team-Diskussion
- [ ] **Änderungs-Historie** - Wer hat was wann geändert
- [ ] **Berechtigungen** - Nur-Lesen vs. Bearbeiten
- [ ] **Team-Accounts** - Mehrere Nutzer unter einem Account

### Audio/Video-Integration
- [ ] **Spotify/Apple Music** - Song-Vorschau einbetten
- [ ] **YouTube-Preview** - Referenz-Videos anzeigen
- [ ] **Click-Track-Integration** - BPM aus Audio analysieren
- [ ] **Waveform-Anzeige** - Für präzises Timing

---

## Langfristig (Vision)

### Professionelle Features
- [ ] **Timecode-Synchronisation** - Mit Lichtpulten (MIDI, OSC)
- [ ] **Stage-Plot-Integration** - Bühnenaufbau visualisieren
- [ ] **Crew-Zuweisung** - Wer macht was bei welchem Song
- [ ] **Checklisten pro Song** - Vorbereitungsaufgaben

### Mobile App
- [ ] **Native iOS/Android App** - Offline-Fähigkeit
- [ ] **Apple Watch** - Minimale Setlist-Anzeige
- [ ] **Stage Monitor Mode** - Großschrift für Bühne

### Analytics
- [ ] **Setlist-Statistiken** - Meistgespielte Songs
- [ ] **Show-Längen-Tracking** - Tatsächliche vs. geplante Dauer
- [ ] **Audience-Feedback** - Reaktionen pro Song tracken

### Integrationen
- [ ] **Setlist.fm-Sync** - Setlists veröffentlichen
- [ ] **Bandsintown** - Gig-Daten importieren
- [ ] **Google Calendar** - Termine synchronisieren
- [ ] **Notion/Airtable** - Daten-Export

---

## Technische Verbesserungen

### Performance
- [ ] **Virtualisierte Listen** - Für sehr lange Setlists
- [ ] **Optimistic Updates** - Schnellere gefühlte Reaktion
- [ ] **Service Worker** - Offline-Cache
- [ ] **Image Optimization** - Wenn Bilder hinzukommen

### Code-Qualität
- [ ] **E2E-Tests** - Playwright oder Cypress
- [ ] **Unit-Tests** - Jest für Utilities
- [ ] **Storybook** - UI-Komponenten-Dokumentation
- [ ] **Error Tracking** - Sentry Integration

### Infrastruktur
- [ ] **Rate Limiting** - API-Schutz
- [ ] **CDN für Assets** - Schnellere Ladezeiten
- [ ] **Database Backups** - Automatisierte Sicherung
- [ ] **Monitoring** - Uptime & Performance

---

## Phase 2: Festival/Lineup-Management (Vision)

### Konzept: Evolution zu "Lineup-Prepper"

Das aktuelle Setlist-Prepper wird zu einem Modul innerhalb einer größeren Struktur für Festival- und Event-Management. Die Hierarchie:

```
Event/Festival
  └── Stages/Areas (Bogen, Flora, Kokon, Kirche, ...)
        └── Acts (Bands, DJs, Workshops, Performances)
              └── Setlists (das, was wir jetzt haben)
```

### Projekt-Namensideen
- **Lineup-Prepper** - Fokus auf Line-up-Planung
- **Stage-Prepper** - Fokus auf Bühnen/Stages
- **Event-Prepper** - Allgemeiner Event-Fokus
- **Show-Prepper** - Fokus auf Produktion
- **Cue-Prepper** - Technischer Fokus
- **Gig-Hub** - Zentrales Management

### Kernfeatures

#### Timetable-Ansicht
- **Visueller Kalender/Grid** - Stages als Spalten, Zeit als Zeilen
- **Drag & Drop** - Acts zwischen Slots verschieben
- **Konflikt-Erkennung** - Überlappungen anzeigen
- **Farbcodierung** - Nach Act-Typ oder Genre
- **Zoom-Levels** - Tag/Stunde/15-Min-Raster

#### Act-Typen
- **Band** - Klassische Setlist mit Songs
- **DJ** - Set mit Tracks/Transitions
- **Workshop** - Beschreibung, Materialien, Teilnehmerlimit
- **Performance** - Visual Acts, Theater, Tanz
- **Installation** - Standort, Technische Anforderungen
- **Walking Act** - Route, Zeitfenster

#### Stage-Management
- **Stage-Profile** - Technische Spezifikationen pro Bühne
- **Kapazität** - Publikumslimit
- **Changeover-Zeiten** - Umbauzeit zwischen Acts
- **Technische Slots** - Soundcheck-Zeiten

#### Beispiel-Anwendung (Detect Festival)
```
Detect Festival 2024
├── Bogen (Main Stage)
│   ├── 17:00 - Band A → Setlist mit 12 Songs
│   ├── 19:00 - Band B → Setlist mit 15 Songs
│   └── 21:00 - Headliner → Setlist mit 20 Songs
├── Flora (Electronic)
│   ├── 16:00 - DJ Set 1 → Tracklist
│   └── 20:00 - DJ Set 2 → Tracklist
├── Kokon (Workshops)
│   ├── 14:00 - Yoga Workshop
│   └── 16:00 - Percussion Workshop
├── Kids' Bay
│   └── 11:00 - Kindertheater
└── Walking Acts
    └── 15:00-18:00 - Stelzenläufer
```

### Architektur-Idee

#### Datenmodell-Erweiterung
```typescript
interface Festival {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  stages: Stage[];
}

interface Stage {
  id: string;
  festivalId: string;
  name: string;
  color: string;
  technicalSpecs: TechnicalSpec;
  capacity: number;
  changeoverMinutes: number;
}

interface Act {
  id: string;
  stageId: string;
  type: 'band' | 'dj' | 'workshop' | 'performance' | 'installation' | 'walking';
  name: string;
  startTime: string;
  endTime: string;
  setlistId?: string; // Verknüpfung zur bestehenden Setlist
  description?: string;
  requirements?: string;
}
```

#### Integration mit aktuellem System
- Bestehende Setlist-Funktionalität bleibt **1:1 erhalten**
- Acts können optional eine Setlist verknüpfen
- Setlist-Prepper wird zum "Detail-Editor" für Acts
- Festival-View ist die neue "Übersichts-Ebene"

### Migrations-Strategie
1. **Phase 1** (jetzt): Setlist-Prepper stabil halten
2. **Phase 2.1**: Festival-Datenmodell hinzufügen
3. **Phase 2.2**: Timetable-UI entwickeln
4. **Phase 2.3**: Stage-Management
5. **Phase 2.4**: Act-Typen erweitern
6. **Phase 2.5**: Setlist-Verknüpfung

### Zielgruppen-Erweiterung
- **Bands/Künstler** → Setlist-Prepper (wie jetzt)
- **Festival-Organisatoren** → Lineup-Planung
- **Produktions-Teams** → Technische Koordination
- **Bühnen-Manager** → Stage-Übersicht
- **Workshop-Leiter** → Session-Planung

---

## Nicht geplant (Out of Scope)

- Social Features (Likes, Follows, etc.)
- Öffentliche Setlist-Bibliothek
- Musikverkauf/-streaming
- Live-Streaming-Integration
- Ticketing-System

---

## Feedback

Weitere Ideen? Erstelle ein Issue im Repository oder kontaktiere den Entwickler.
