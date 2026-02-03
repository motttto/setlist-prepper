import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getSetlistById,
  updateSetlist,
  deleteSetlist,
} from '@/lib/supabase';
import { migrateToEventStructure } from '@/lib/eventMigration';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/setlists/[id] - Get a specific setlist with songs
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { id } = await params;
    const setlist = await getSetlistById(id, session.user.id);

    if (!setlist) {
      return NextResponse.json(
        { error: 'Setlist nicht gefunden' },
        { status: 404 }
      );
    }

    // Parse data from JSON and migrate to new format
    let songs: unknown[] = [];
    let stages = undefined;
    try {
      const data = JSON.parse(setlist.encrypted_data || '[]');
      if (Array.isArray(data)) {
        // Old format: flat array of songs - will be migrated client-side
        songs = data;
      } else if (data.stages) {
        // New format: stages > acts > songs
        stages = data.stages;
      }
    } catch {
      songs = [];
    }

    // Build base event data for migration
    const baseEventData = {
      id: setlist.id,
      title: setlist.title,
      eventDate: setlist.event_date,
      startTime: setlist.start_time,
      venue: setlist.venue,
      createdAt: setlist.created_at,
      updatedAt: setlist.updated_at,
      ...(stages ? { stages } : { songs }),
    };

    // Always migrate to ensure consistent format
    const migratedEvent = migrateToEventStructure(baseEventData as Parameters<typeof migrateToEventStructure>[0]);

    return NextResponse.json({
      data: {
        id: migratedEvent.id,
        title: migratedEvent.title,
        eventDate: migratedEvent.eventDate,
        startTime: migratedEvent.startTime,
        venue: migratedEvent.venue,
        stages: migratedEvent.stages,
        createdAt: migratedEvent.createdAt,
        updatedAt: migratedEvent.updatedAt,
        lastEditedBy: setlist.last_edited_by,
      },
    });
  } catch (error) {
    console.error('Error fetching setlist:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der Setlist' },
      { status: 500 }
    );
  }
}

// PUT /api/setlists/[id] - Update a setlist
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title, eventDate, startTime, venue, songs, stages } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Titel ist erforderlich' },
        { status: 400 }
      );
    }

    // Store data as JSON string - support both old (songs array) and new (stages) format
    let dataToStore: string;
    if (stages) {
      // New format: store stages array
      dataToStore = JSON.stringify({ stages });
    } else {
      // Old format: store songs array
      dataToStore = JSON.stringify(songs || []);
    }

    // Benutzer-Name für Edit-Tracking
    const editorName = session.user.name || session.user.email || 'Unbekannt';

    const setlist = await updateSetlist(
      id,
      session.user.id,
      title,
      eventDate || null,
      startTime || null,
      venue || null,
      dataToStore,
      editorName
    );

    return NextResponse.json({
      data: {
        id: setlist.id,
        title: setlist.title,
        eventDate: setlist.event_date,
        startTime: setlist.start_time,
        venue: setlist.venue,
        createdAt: setlist.created_at,
        updatedAt: setlist.updated_at,
      },
    });
  } catch (error) {
    console.error('Error updating setlist:', error);
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren der Setlist' },
      { status: 500 }
    );
  }
}

// DELETE /api/setlists/[id] - Delete a setlist
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { id } = await params;
    await deleteSetlist(id, session.user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting setlist:', error);
    return NextResponse.json(
      { error: 'Fehler beim Löschen der Setlist' },
      { status: 500 }
    );
  }
}
