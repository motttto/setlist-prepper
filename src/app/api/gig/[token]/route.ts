import { NextRequest, NextResponse } from 'next/server';
import { supabase, getCustomFieldsByUser } from '@/lib/supabase';
import crypto from 'crypto';

interface RouteParams {
  params: Promise<{ token: string }>;
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Helper type for stages structure
interface StageData {
  id: string;
  name: string;
  acts: ActData[];
}

interface ActData {
  id: string;
  name: string;
  type: string;
  songs: SongData[];
}

interface SongData {
  id: string;
  position: number;
  type: string;
  title: string;
  duration?: string;
  [key: string]: unknown;
}

// Flatten hierarchical stages > acts > songs to flat songs array
function flattenStagesToSongs(stages: StageData[]): SongData[] {
  const songs: SongData[] = [];
  let position = 1;

  for (const stage of stages) {
    // Ensure acts is an array
    const acts = stage.acts || [];
    for (const act of acts) {
      // Add act marker as a special song entry (include all Song fields)
      songs.push({
        id: act.id,
        position: position++,
        type: 'act',
        title: act.name,
        actType: act.type,
        duration: '',
        lyrics: '',
        visualDescription: '',
        timingBpm: '',
        transitionTypes: [],
        transitions: '',
        lighting: '',
        mediaLinks: [],
        stageDirections: '',
        audioCues: '',
        customFields: {},
      });

      // Add all songs from this act - ensure songs is an array
      const actSongs = act.songs || [];
      for (const song of actSongs) {
        songs.push({
          ...song,
          position: position++,
        });
      }
    }
  }

  return songs;
}

// Merge a specific act from updated stages into the original stages
// Used for act-specific shares to only update the shared act
function mergeActIntoStages(originalStages: StageData[], updatedStages: StageData[], actId: string): StageData[] {
  // Find the updated act in the updated stages
  let updatedAct: ActData | null = null;
  for (const stage of updatedStages) {
    const acts = stage.acts || [];
    const act = acts.find(a => a.id === actId);
    if (act) {
      updatedAct = act;
      break;
    }
  }

  if (!updatedAct) {
    // Act not found in updates, return original
    return originalStages;
  }

  // Merge the updated act into the original stages
  return originalStages.map(stage => ({
    ...stage,
    acts: (stage.acts || []).map(act => {
      if (act.id === actId) {
        return updatedAct!;
      }
      return act;
    })
  }));
}

// Rebuild stages structure from flat songs array
// This preserves the original stage/act structure while updating song data
function rebuildStagesFromSongs(originalStages: StageData[], flatSongs: SongData[]): StageData[] {
  // Create a map of song updates by ID
  const songUpdates = new Map<string, SongData>();
  const actUpdates = new Map<string, { name: string; type: string }>();

  for (const song of flatSongs) {
    if (song.type === 'act') {
      // This is an act marker
      actUpdates.set(song.id, {
        name: song.title,
        type: (song.actType as string) || 'band'
      });
    } else {
      songUpdates.set(song.id, song);
    }
  }

  // Rebuild stages with updated data
  return originalStages.map(stage => ({
    ...stage,
    acts: (stage.acts || []).map(act => {
      const actUpdate = actUpdates.get(act.id);
      return {
        ...act,
        name: actUpdate?.name ?? act.name,
        type: actUpdate?.type ?? act.type,
        songs: (act.songs || []).map(song => {
          const update = songUpdates.get(song.id);
          if (update) {
            // Remove act-specific fields that shouldn't be on songs
            const { actType, ...songData } = update;
            return songData as SongData;
          }
          return song;
        })
      };
    })
  }));
}

// POST /api/gig/[token] - Authentifizieren und Gig laden
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json({ error: 'Passwort erforderlich' }, { status: 400 });
    }

    // Gig mit Token finden
    const { data: setlist, error } = await supabase
      .from('setlists')
      .select('*')
      .eq('share_token', token)
      .eq('is_shared', true)
      .single();

    if (error || !setlist) {
      return NextResponse.json({ error: 'Gig nicht gefunden' }, { status: 404 });
    }

    // Passwort prüfen
    const passwordHash = hashPassword(password);
    if (passwordHash !== setlist.share_password_hash) {
      return NextResponse.json({ error: 'Falsches Passwort' }, { status: 401 });
    }

    // Check if this is an act-specific share
    const sharedActId = setlist.shared_act_id;
    let sharedActName: string | null = null;

    // Data parsen - support both old (songs array) and new (stages) format
    let songs: unknown[] = [];
    let stages: StageData[] | undefined = undefined;
    try {
      const data = JSON.parse(setlist.encrypted_data || '[]');
      if (Array.isArray(data)) {
        // Old format: flat array of songs
        songs = data;
      } else if (data && typeof data === 'object') {
        if (data.stages && Array.isArray(data.stages)) {
          // New format: stages > acts > songs
          let parsedStages: StageData[] = data.stages;

          // If act-specific share, filter to only that act
          if (sharedActId) {
            parsedStages = parsedStages.map(stage => ({
              ...stage,
              acts: (stage.acts || []).filter(act => {
                if (act.id === sharedActId) {
                  sharedActName = act.name;
                  return true;
                }
                return false;
              })
            })).filter(stage => stage.acts.length > 0);
          }

          stages = parsedStages;
          // Flatten stages/acts/songs to flat array for backwards compatibility
          songs = flattenStagesToSongs(parsedStages);
        } else if (data.songs && Array.isArray(data.songs)) {
          // Possible intermediate format with songs as property
          songs = data.songs;
        }
        // else: object without stages or songs - keep songs as empty array
      }
    } catch (parseError) {
      console.error('Error parsing encrypted_data:', parseError);
      songs = [];
    }

    // Ensure songs is always an array
    if (!Array.isArray(songs)) {
      console.error('Songs is not an array, resetting to empty array');
      songs = [];
    }

    // Custom Fields des Setlist-Owners laden
    let customFields: { id: string; userId: string; fieldName: string; fieldType: string; createdAt: string }[] = [];
    try {
      const dbFields = await getCustomFieldsByUser(setlist.user_id);
      customFields = dbFields.map((f) => ({
        id: f.id,
        userId: f.user_id,
        fieldName: f.field_name,
        fieldType: f.field_type,
        createdAt: f.created_at,
      }));
    } catch (cfError) {
      console.error('Error loading custom fields:', cfError);
      // Custom Fields sind optional, also weitermachen
    }

    return NextResponse.json({
      data: {
        id: setlist.id,
        title: setlist.title,
        eventDate: setlist.event_date,
        startTime: setlist.start_time,
        venue: setlist.venue,
        songs,
        stages,
        customFields,
        updatedAt: setlist.updated_at,
        lastEditedBy: setlist.last_edited_by,
        // Act-share info
        isActShare: !!sharedActId,
        sharedActId,
        sharedActName,
        // Role info: 'band' = can only edit songs, 'orga' = can edit everything
        shareRole: setlist.share_role || 'band',
      },
    });
  } catch (error) {
    console.error('Error accessing shared gig:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden' },
      { status: 500 }
    );
  }
}

// PUT /api/gig/[token] - Geteilten Gig bearbeiten
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;
    const body = await request.json();
    const { password, title, eventDate, startTime, venue, songs, stages, editorName, expectedUpdatedAt } = body;

    if (!password) {
      return NextResponse.json({ error: 'Passwort erforderlich' }, { status: 400 });
    }

    // Gig mit Token finden (including encrypted_data to check format)
    const { data: setlist, error: fetchError } = await supabase
      .from('setlists')
      .select('id, share_password_hash, updated_at, encrypted_data, shared_act_id, share_role')
      .eq('share_token', token)
      .eq('is_shared', true)
      .single();

    if (fetchError || !setlist) {
      return NextResponse.json({ error: 'Gig nicht gefunden' }, { status: 404 });
    }

    // Passwort prüfen
    const passwordHash = hashPassword(password);
    if (passwordHash !== setlist.share_password_hash) {
      return NextResponse.json({ error: 'Falsches Passwort' }, { status: 401 });
    }

    // Optimistic Locking: Prüfe ob jemand anderes bearbeitet hat
    if (expectedUpdatedAt && setlist.updated_at !== expectedUpdatedAt) {
      return NextResponse.json(
        {
          error: 'Konflikt: Jemand anderes hat den Gig bearbeitet. Bitte lade die Seite neu.',
          code: 'CONFLICT',
          serverUpdatedAt: setlist.updated_at
        },
        { status: 409 }
      );
    }

    // Check role - band can only edit songs, orga can edit everything
    const shareRole = setlist.share_role || 'band';

    // Determine if the original data is in new format (stages)
    let isNewFormat = false;
    let originalStages: StageData[] | null = null;
    const sharedActId = setlist.shared_act_id;

    try {
      const existingData = JSON.parse(setlist.encrypted_data || '[]');
      if (!Array.isArray(existingData) && existingData.stages) {
        isNewFormat = true;
        originalStages = existingData.stages;
      }
    } catch {
      // Ignore parse errors
    }

    // Data als JSON speichern - maintain original format
    let dataToStore: string;
    if (stages) {
      // Client sent stages directly (new format)
      if (sharedActId && originalStages) {
        // Act-specific share: merge only the shared act back into original stages
        const mergedStages = mergeActIntoStages(originalStages, stages, sharedActId);
        dataToStore = JSON.stringify({ stages: mergedStages });
      } else {
        dataToStore = JSON.stringify({ stages });
      }
    } else if (isNewFormat && originalStages && songs) {
      // Original was new format, but client sent flat songs array
      // Convert songs back to stages structure
      let updatedStages = rebuildStagesFromSongs(originalStages, songs);

      if (sharedActId) {
        // Act-specific share: merge only the shared act back into original stages
        updatedStages = mergeActIntoStages(originalStages, updatedStages, sharedActId);
      }

      dataToStore = JSON.stringify({ stages: updatedStages });
    } else {
      // Old format: store songs array
      dataToStore = JSON.stringify(songs || []);
    }
    const newUpdatedAt = new Date().toISOString();

    // Build update object - band role can only update songs, orga can update everything
    const updateData: Record<string, unknown> = {
      encrypted_data: dataToStore,
      updated_at: newUpdatedAt,
      last_edited_by: editorName || 'Geteilt',
    };

    // Only orga role can update event details
    if (shareRole === 'orga') {
      updateData.title = title;
      updateData.event_date = eventDate || null;
      updateData.start_time = startTime || null;
      updateData.venue = venue || null;
    }

    // Update
    const { data: updatedSetlist, error: updateError } = await supabase
      .from('setlists')
      .update(updateData)
      .eq('id', setlist.id)
      .select('updated_at, last_edited_by')
      .single();

    if (updateError) {
      console.error('Error updating shared gig:', updateError);
      return NextResponse.json(
        { error: 'Fehler beim Speichern' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      updatedAt: updatedSetlist.updated_at,
      lastEditedBy: updatedSetlist.last_edited_by,
    });
  } catch (error) {
    console.error('Error updating shared gig:', error);
    return NextResponse.json(
      { error: 'Fehler beim Speichern' },
      { status: 500 }
    );
  }
}
