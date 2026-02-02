# Changelog

Alle wesentlichen Änderungen am Projekt werden hier dokumentiert.

## [Unreleased]

### Hinzugefügt
- Mobile-responsive Admin Panel mit Tab-Navigation
- Vollbild-Modal für Song-Details auf Mobile
- PDF-Export Button im Admin Panel Header
- "ADMIN PANEL" Label zur besseren Unterscheidung
- Impressum und Datenschutz Seiten (mit Umgebungsvariablen)
- Meta-Tags für SEO (OpenGraph, Twitter Cards, Keywords)
- Kompakte mobile Buttons (nur Icons)
- Gig-Info Zeile auf Mobile
- **Keyboard Shortcuts**: Cmd/Ctrl+S zum Speichern, Cmd/Ctrl+N für neuen Song
- **Song Duplizieren**: Songs können jetzt dupliziert werden (Copy-Button)
- **Songs Stummschalten**: Songs können gemuted werden - bleiben in der Liste, werden aber übersprungen und nicht in die Gesamtdauer gezählt (durchgestrichene Darstellung)

### Geändert
- Landing Page Features aktualisiert (6 Features)
- "Verschlüsselt" zu "Passwortgeschützt" geändert (korrekte Beschreibung)
- Datenschutzerklärung an tatsächliche Sicherheitsmaßnahmen angepasst
- Shared Gig Page: 3-Spalten-Layout angepasst
- Contrast-Verbesserungen für bessere Lesbarkeit

### Behoben
- Duration-Input Fix für SongListItem
- Presence-Indikator zeigt jetzt Userliste als Text

---

## [1.0.0] - Initial Release

### Kernfunktionen
- Benutzer-Registrierung und Login
- Gig-Verwaltung (CRUD)
- Song-Editor mit allen Detailfeldern
- Drag & Drop Sortierung
- Pausen und Zugaben
- Benutzerdefinierte Felder
- Auto-Save mit visuellem Feedback
- PDF-Export

### Kollaboration
- Passwortgeschütztes Teilen von Gigs
- Echtzeit-Synchronisation via Supabase Realtime
- Presence-Anzeige (Online-Nutzer)
- Konflikt-Erkennung

### Design
- Responsive Design (Desktop & Mobile)
- Dark Mode Unterstützung
- Moderne UI mit Tailwind CSS
