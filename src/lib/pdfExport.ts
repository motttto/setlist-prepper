import { jsPDF } from 'jspdf';
import { Song } from '@/types';
import { PdfExportMode } from '@/components/PdfExportDialog';

interface ExportOptions {
  title: string;
  eventDate?: string;
  startTime?: string;
  venue?: string;
  songs: Song[];
  mode?: PdfExportMode;
}

// Transition labels for full export
const transitionLabels: Record<string, string> = {
  smooth: 'Fließend',
  hard: 'Abrupt',
  fadeOut: 'Ausfaden',
  fadeIn: 'Einfaden',
  crossfade: 'Crossfade',
  segue: 'Segue',
  applause: 'Applaus-Pause',
  talk: 'Ansage',
  silence: 'Stille',
  medley: 'Medley',
};

// Transition symbols for tracklist
const transitionSymbols: Record<string, string> = {
  smooth: '→',
  hard: '|',
  fadeOut: '↘',
  fadeIn: '↗',
  crossfade: '⟷',
  segue: '»',
  applause: '👏',
  talk: '🎤',
  silence: '…',
  medley: '∞',
};

export function exportSetlistToPdf({
  title,
  eventDate,
  startTime,
  venue,
  songs,
  mode = 'tracklist',
}: ExportOptions): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Helper to add new page if needed
  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
      return true;
    }
    return false;
  };

  // Helper: wrap text and return lines
  const wrapText = (text: string, maxWidth: number, fontSize: number): string[] => {
    doc.setFontSize(fontSize);
    return doc.splitTextToSize(text, maxWidth);
  };

  // Calculate cumulative timestamps
  const calculateTimestamps = () => {
    let cumulativeSeconds = 0;
    const timestamps: string[] = [];

    // Parse start time if available
    let startHours = 0;
    let startMinutes = 0;
    if (startTime) {
      const parts = startTime.split(':');
      startHours = parseInt(parts[0] || '0');
      startMinutes = parseInt(parts[1] || '0');
    }

    songs.forEach((song) => {
      // Calculate absolute time
      const totalMinutes = startHours * 60 + startMinutes + Math.floor(cumulativeSeconds / 60);
      const hours = Math.floor(totalMinutes / 60) % 24;
      const mins = totalMinutes % 60;

      if (startTime) {
        timestamps.push(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`);
      } else {
        // Show relative time if no start time
        const relMins = Math.floor(cumulativeSeconds / 60);
        const relSecs = cumulativeSeconds % 60;
        timestamps.push(`+${relMins}:${relSecs.toString().padStart(2, '0')}`);
      }

      // Add song duration to cumulative
      if (song.duration) {
        const parts = song.duration.split(':');
        if (parts.length === 2) {
          cumulativeSeconds += parseInt(parts[0] || '0') * 60 + parseInt(parts[1] || '0');
        }
      }
    });

    return timestamps;
  };

  const timestamps = calculateTimestamps();

  // Calculate total duration
  const calculateTotalDuration = () => {
    let totalSeconds = 0;
    songs.forEach((song) => {
      if (song.duration) {
        const parts = song.duration.split(':');
        if (parts.length === 2) {
          totalSeconds += parseInt(parts[0] || '0') * 60 + parseInt(parts[1] || '0');
        }
      }
    });
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')} Std`;
    }
    return `${mins} Min`;
  };

  // ========================
  // HEADER (shared for both modes)
  // ========================
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title || 'Setlist', margin, y);
  y += 8;

  // Event info line
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const infoParts: string[] = [];
  if (eventDate) {
    const date = new Date(eventDate);
    infoParts.push(date.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }));
  }
  if (startTime) {
    infoParts.push(`${startTime} Uhr`);
  }
  if (venue) {
    infoParts.push(venue);
  }
  if (infoParts.length > 0) {
    doc.text(infoParts.join(' · '), margin, y);
    y += 5;
  }

  // Stats line
  const songCount = songs.filter(s => (s.type || 'song') === 'song').length;
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  const modeLabel = mode === 'full' ? ' · Vollständiger Export' : '';
  doc.text(`${songCount} Songs · ${calculateTotalDuration()}${modeLabel}`, margin, y);
  doc.setTextColor(0, 0, 0);
  y += 8;

  // Separator line
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  if (mode === 'tracklist') {
    // ========================
    // TRACKLIST MODE (original)
    // ========================
    renderTracklist(doc, songs, timestamps, margin, contentWidth, pageWidth, pageHeight, y, checkPageBreak);
    y = (doc as unknown as { lastY: number }).lastY || y; // won't be used after this
  } else {
    // ========================
    // FULL EXPORT MODE
    // ========================
    renderFullExport(doc, songs, timestamps, margin, contentWidth, pageWidth, pageHeight, y, checkPageBreak, wrapText);
  }

  // Footer with generation timestamp (on last page)
  // Get current y from internal tracking
  const currentY = y;
  const footerY = Math.max(currentY + 5, pageHeight - margin - 5);
  if (footerY > pageHeight - margin) {
    doc.addPage();
  }

  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.setFont('helvetica', 'normal');
  const now = new Date();
  const footerText = `Erstellt am ${now.toLocaleDateString('de-DE')} um ${now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} · Setlist Prepper`;
  // Place footer at bottom of last page
  doc.text(footerText, margin, pageHeight - margin);

  // Save
  const modeSuffix = mode === 'full' ? '_komplett' : '';
  const filename = `${title || 'Setlist'}${modeSuffix}_${eventDate || now.toISOString().split('T')[0]}.pdf`;
  doc.save(filename.replace(/[^a-zA-Z0-9äöüÄÖÜß\-_.]/g, '_'));
}

// ========================
// TRACKLIST RENDERER
// ========================
function renderTracklist(
  doc: jsPDF,
  songs: Song[],
  timestamps: string[],
  margin: number,
  contentWidth: number,
  pageWidth: number,
  pageHeight: number,
  startY: number,
  checkPageBreak: (h: number) => boolean,
) {
  let y = startY;

  // Reassign checkPageBreak to use local y
  const check = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
      return true;
    }
    return false;
  };

  // Column headers
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 100, 100);
  doc.text('Zeit', margin, y);
  doc.text('#', margin + 18, y);
  doc.text('Titel', margin + 26, y);
  doc.text('Dauer', pageWidth - margin - 15, y);
  doc.setTextColor(0, 0, 0);
  y += 5;

  // Songs - use global position counter instead of per-act song.position
  let globalPosition = 0;
  doc.setFont('helvetica', 'normal');
  songs.forEach((song, index) => {
    const songType = song.type || 'song';
    if (!song.muted && songType === 'song') {
      globalPosition++;
    }
    const rowHeight = 7;

    check(rowHeight);

    // Background for pause/encore
    if (songType === 'pause') {
      doc.setFillColor(255, 247, 237);
      doc.rect(margin, y - 4, contentWidth, rowHeight, 'F');
    } else if (songType === 'encore') {
      doc.setFillColor(250, 245, 255);
      doc.rect(margin, y - 4, contentWidth, rowHeight, 'F');
    }

    // Timestamp
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(timestamps[index], margin, y);

    // Position number (global sequential)
    if (songType === 'song') {
      doc.setTextColor(60, 60, 60);
      doc.text(`${globalPosition}`, margin + 18, y);
    } else if (songType === 'pause') {
      doc.setTextColor(180, 130, 50);
      doc.text('—', margin + 18, y);
    } else if (songType === 'encore') {
      doc.setTextColor(130, 80, 180);
      doc.text('★', margin + 18, y);
    }

    // Title
    doc.setTextColor(0, 0, 0);
    if (songType === 'pause') {
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(180, 130, 50);
    } else if (songType === 'encore') {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(130, 80, 180);
    } else {
      doc.setFont('helvetica', 'normal');
    }

    const maxTitleWidth = contentWidth - 60;
    let displayTitle = song.title || (songType === 'pause' ? 'Pause' : songType === 'encore' ? 'Zugabe' : 'Ohne Titel');

    // Truncate title if too long
    while (doc.getTextWidth(displayTitle) > maxTitleWidth && displayTitle.length > 3) {
      displayTitle = displayTitle.slice(0, -4) + '...';
    }
    doc.text(displayTitle, margin + 26, y);

    // Duration
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    if (song.duration) {
      doc.text(song.duration, pageWidth - margin - 15, y);
    }

    // Transition indicator
    if (song.transitionTypes && song.transitionTypes.length > 0) {
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      const symbols = song.transitionTypes.map(t => transitionSymbols[t] || t).join('');
      doc.text(symbols, pageWidth - margin - 5, y);
    }

    y += rowHeight;
    doc.setTextColor(0, 0, 0);
  });

  // Draw footer separator
  y += 5;
  if (y + 15 > pageHeight - margin) {
    doc.addPage();
    y = margin;
  }
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
}

// ========================
// FULL EXPORT RENDERER
// ========================
function renderFullExport(
  doc: jsPDF,
  songs: Song[],
  timestamps: string[],
  margin: number,
  contentWidth: number,
  pageWidth: number,
  pageHeight: number,
  startY: number,
  _checkPageBreak: (h: number) => boolean,
  wrapText: (text: string, maxWidth: number, fontSize: number) => string[],
) {
  let y = startY;

  const check = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
      return true;
    }
    return false;
  };

  // Detail field helper - renders a label + value block
  const renderDetailField = (label: string, value: string, indent: number = 0) => {
    if (!value || !value.trim()) return;

    const fieldX = margin + 4 + indent;
    const maxWidth = contentWidth - 8 - indent;

    // Label
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 100, 100);

    check(8);
    doc.text(label, fieldX, y);
    y += 3.5;

    // Value (wrapped)
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    const lines = wrapText(value, maxWidth, 8);
    for (const line of lines) {
      check(4);
      doc.text(line, fieldX, y);
      y += 3.5;
    }
    y += 1.5;
  };

  // Use global position counter instead of per-act song.position
  let globalPosition = 0;
  songs.forEach((song, index) => {
    const songType = song.type || 'song';
    if (!song.muted && songType === 'song') {
      globalPosition++;
    }

    // Check if this song has any details worth showing
    const hasDetails = songType === 'song' || songType === 'encore';
    const hasAnyContent = song.lyrics || song.visualDescription || song.lighting ||
      song.stageDirections || song.audioCues || song.transitions || song.timingBpm ||
      (song.transitionTypes && song.transitionTypes.length > 0) ||
      (song.mediaLinks && song.mediaLinks.length > 0) ||
      (song.customFields && Object.values(song.customFields).some(v => v && v.trim()));

    // Estimate height for song header
    const headerHeight = hasDetails && hasAnyContent ? 28 : 10;
    check(headerHeight);

    // Song header background
    if (songType === 'pause') {
      doc.setFillColor(255, 247, 237);
      doc.rect(margin, y - 4, contentWidth, 8, 'F');
    } else if (songType === 'encore') {
      doc.setFillColor(250, 245, 255);
      doc.rect(margin, y - 4, contentWidth, 8, 'F');
    } else if (songType === 'song') {
      doc.setFillColor(245, 245, 250);
      doc.rect(margin, y - 4, contentWidth, 8, 'F');
    }

    // Timestamp
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(timestamps[index], margin + 1, y);

    // Position number (global sequential)
    if (songType === 'song') {
      doc.setTextColor(60, 60, 60);
      doc.text(`${globalPosition}`, margin + 18, y);
    } else if (songType === 'pause') {
      doc.setTextColor(180, 130, 50);
      doc.text('—', margin + 18, y);
    } else if (songType === 'encore') {
      doc.setTextColor(130, 80, 180);
      doc.text('★', margin + 18, y);
    }

    // Title
    if (songType === 'pause') {
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(180, 130, 50);
    } else if (songType === 'encore') {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(130, 80, 180);
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 30, 30);
    }

    const displayTitle = song.title || (songType === 'pause' ? 'Pause' : songType === 'encore' ? 'Zugabe' : 'Ohne Titel');
    doc.text(displayTitle, margin + 26, y);

    // Duration on right side
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(9);
    const durationInfo: string[] = [];
    if (song.duration) durationInfo.push(song.duration);
    if (song.timingBpm) durationInfo.push(`${song.timingBpm} BPM`);
    if (durationInfo.length > 0) {
      doc.text(durationInfo.join(' · '), pageWidth - margin - 1, y, { align: 'right' });
    }

    y += 6;

    // Detail fields for songs/encores that have content
    if (hasDetails && hasAnyContent) {
      doc.setTextColor(0, 0, 0);

      // Transitions
      if (song.transitionTypes && song.transitionTypes.length > 0) {
        const labels = song.transitionTypes.map(t => transitionLabels[t] || t).join(', ');
        renderDetailField('Übergang', labels);
      }
      if (song.transitions) {
        renderDetailField('Übergang-Details', song.transitions);
      }

      // Lighting
      if (song.lighting) {
        renderDetailField('Licht', song.lighting);
      }

      // Visual description
      if (song.visualDescription) {
        renderDetailField('Visuell', song.visualDescription);
      }

      // Stage directions
      if (song.stageDirections) {
        renderDetailField('Bühnenanweisungen', song.stageDirections);
      }

      // Audio cues
      if (song.audioCues) {
        renderDetailField('Audio-Cues', song.audioCues);
      }

      // Lyrics
      if (song.lyrics) {
        renderDetailField('Text / Notizen', song.lyrics);
      }

      // Media Links
      if (song.mediaLinks && song.mediaLinks.length > 0) {
        renderDetailField('Medien-Links', song.mediaLinks.join('\n'));
      }

      // Custom fields
      if (song.customFields) {
        for (const [fieldName, value] of Object.entries(song.customFields)) {
          if (value && value.trim()) {
            renderDetailField(fieldName, value);
          }
        }
      }

      // Bottom separator for this song block
      y += 1;
      check(4);
      doc.setDrawColor(220, 220, 220);
      doc.line(margin, y, pageWidth - margin, y);
      y += 4;
    } else {
      // Slim separator for pause/empty entries
      y += 1;
    }

    doc.setTextColor(0, 0, 0);
  });

  // Draw footer separator
  y += 3;
  if (y + 15 > pageHeight - margin) {
    doc.addPage();
    y = margin;
  }
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
}
