import { jsPDF } from 'jspdf';
import { Song } from '@/types';

interface ExportOptions {
  title: string;
  eventDate?: string;
  startTime?: string;
  venue?: string;
  songs: Song[];
}

export function exportSetlistToPdf({
  title,
  eventDate,
  startTime,
  venue,
  songs,
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

  // Header
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
  doc.text(`${songCount} Songs · ${calculateTotalDuration()}`, margin, y);
  doc.setTextColor(0, 0, 0);
  y += 8;

  // Separator line
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

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

  // Songs
  doc.setFont('helvetica', 'normal');
  songs.forEach((song, index) => {
    const songType = song.type || 'song';
    const rowHeight = 7;

    checkPageBreak(rowHeight);

    // Background for pause/encore
    if (songType === 'pause') {
      doc.setFillColor(255, 247, 237); // amber-50
      doc.rect(margin, y - 4, contentWidth, rowHeight, 'F');
    } else if (songType === 'encore') {
      doc.setFillColor(250, 245, 255); // purple-50
      doc.rect(margin, y - 4, contentWidth, rowHeight, 'F');
    }

    // Timestamp
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(timestamps[index], margin, y);

    // Position number
    if (songType === 'song') {
      doc.setTextColor(60, 60, 60);
      doc.text(`${song.position}`, margin + 18, y);
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
      const transitionMap: Record<string, string> = {
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
      const transitionSymbols = song.transitionTypes.map(t => transitionMap[t] || t).join('');
      doc.text(transitionSymbols, pageWidth - margin - 5, y);
    }

    y += rowHeight;
    doc.setTextColor(0, 0, 0);
  });

  // Footer with generation timestamp
  y += 5;
  checkPageBreak(15);
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  const now = new Date();
  doc.text(
    `Erstellt am ${now.toLocaleDateString('de-DE')} um ${now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} · Setlist Prepper`,
    margin,
    y
  );

  // Save
  const filename = `${title || 'Setlist'}_${eventDate || now.toISOString().split('T')[0]}.pdf`;
  doc.save(filename.replace(/[^a-zA-Z0-9äöüÄÖÜß\-_.]/g, '_'));
}
