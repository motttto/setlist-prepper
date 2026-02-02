import { v4 as uuidv4 } from 'uuid';
import { Event, Stage, Act, Song, LegacySetlist, ActType } from '@/types';

/**
 * Migriert alte flache Setlist-Struktur zu neuer Event > Stage > Act > Song Hierarchie
 */
export function migrateToEventStructure(data: LegacySetlist | Event): Event {
  // Prüfe ob bereits neue Struktur (hat stages Array)
  if ('stages' in data && Array.isArray(data.stages) && data.stages.length > 0) {
    return data as Event;
  }

  // Alte Struktur: songs Array direkt im Setlist
  const legacyData = data as LegacySetlist;

  if (!legacyData.songs || legacyData.songs.length === 0) {
    // Leeres Event mit einer Default-Stage und einem Default-Act
    return {
      id: legacyData.id,
      title: legacyData.title,
      eventDate: legacyData.eventDate,
      startTime: legacyData.startTime,
      venue: legacyData.venue,
      stages: [{
        id: uuidv4(),
        name: 'Main',
        position: 1,
        acts: [{
          id: uuidv4(),
          name: 'Programm',
          type: 'band',
          position: 1,
          songs: []
        }]
      }],
      createdAt: legacyData.createdAt,
      updatedAt: legacyData.updatedAt,
    };
  }

  // Gruppiere Songs nach Act-Markern
  const acts: Act[] = [];
  let currentAct: Act | null = null;
  let actPosition = 0;

  for (const item of legacyData.songs) {
    if (item.type === 'act') {
      // Neuer Act gefunden
      actPosition++;
      currentAct = {
        id: uuidv4(),
        name: item.title || `Act ${actPosition}`,
        type: (item.actType as ActType) || 'band',
        position: actPosition,
        description: item.visualDescription || '',
        technicalRequirements: item.stageDirections || '',
        mediaLinks: item.mediaLinks || [],
        songs: []
      };
      acts.push(currentAct);
    } else {
      // Song/Pause/Encore
      if (!currentAct) {
        // Kein Act vorhanden, erstelle Default-Act
        actPosition++;
        currentAct = {
          id: uuidv4(),
          name: 'Programm',
          type: 'band',
          position: actPosition,
          songs: []
        };
        acts.push(currentAct);
      }

      // Füge Song zum aktuellen Act hinzu
      const song: Song = {
        id: item.id,
        position: currentAct.songs.length + 1,
        type: item.type, // Already filtered out 'act' type above
        title: item.title,
        duration: item.duration,
        lyrics: item.lyrics,
        visualDescription: item.visualDescription,
        timingBpm: item.timingBpm,
        transitionTypes: item.transitionTypes,
        transitions: item.transitions,
        lighting: item.lighting,
        mediaLinks: item.mediaLinks,
        stageDirections: item.stageDirections,
        audioCues: item.audioCues,
        customFields: item.customFields,
        muted: item.muted,
      };
      currentAct.songs.push(song);
    }
  }

  // Falls keine Acts erstellt wurden (keine Songs), erstelle Default
  if (acts.length === 0) {
    acts.push({
      id: uuidv4(),
      name: 'Programm',
      type: 'band',
      position: 1,
      songs: []
    });
  }

  return {
    id: legacyData.id,
    title: legacyData.title,
    eventDate: legacyData.eventDate,
    startTime: legacyData.startTime,
    venue: legacyData.venue,
    stages: [{
      id: uuidv4(),
      name: 'Main',
      position: 1,
      acts: acts
    }],
    createdAt: legacyData.createdAt,
    updatedAt: legacyData.updatedAt,
  };
}

/**
 * Zählt alle Songs in einem Event (über alle Stages und Acts)
 */
export function countSongsInEvent(event: Event): number {
  let count = 0;
  for (const stage of event.stages) {
    for (const act of stage.acts) {
      count += act.songs.filter(s => s.type === 'song' && !s.muted).length;
    }
  }
  return count;
}

/**
 * Zählt alle Acts in einem Event
 */
export function countActsInEvent(event: Event): number {
  let count = 0;
  for (const stage of event.stages) {
    count += stage.acts.length;
  }
  return count;
}

/**
 * Berechnet Gesamtdauer eines Events in Sekunden
 */
export function calculateEventDuration(event: Event): number {
  let totalSeconds = 0;
  for (const stage of event.stages) {
    for (const act of stage.acts) {
      for (const song of act.songs) {
        if (song.muted) continue;
        if (song.duration) {
          const parts = song.duration.split(':');
          if (parts.length === 2) {
            totalSeconds += parseInt(parts[0] || '0') * 60 + parseInt(parts[1] || '0');
          }
        }
      }
    }
  }
  return totalSeconds;
}

/**
 * Erstellt ein leeres Event mit Stages und Acts basierend auf Wizard-Daten
 */
export function createEventFromWizard(data: {
  title: string;
  eventDate: string | null;
  startTime: string | null;
  venue: string | null;
  stages: { name: string; acts: { name: string; type: ActType }[] }[];
}): Event {
  const stages: Stage[] = data.stages.map((stageData, stageIndex) => ({
    id: uuidv4(),
    name: stageData.name,
    position: stageIndex + 1,
    acts: stageData.acts.map((actData, actIndex) => ({
      id: uuidv4(),
      name: actData.name,
      type: actData.type,
      position: actIndex + 1,
      songs: []
    }))
  }));

  return {
    id: uuidv4(),
    title: data.title,
    eventDate: data.eventDate,
    startTime: data.startTime,
    venue: data.venue,
    stages,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
