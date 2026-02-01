import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getSetlistById,
  updateSetlist,
  deleteSetlist,
} from '@/lib/supabase';

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

    // Parse songs from JSON
    let songs = [];
    try {
      songs = JSON.parse(setlist.encrypted_data || '[]');
    } catch {
      songs = [];
    }

    return NextResponse.json({
      data: {
        id: setlist.id,
        title: setlist.title,
        eventDate: setlist.event_date,
        startTime: setlist.start_time,
        venue: setlist.venue,
        songs,
        createdAt: setlist.created_at,
        updatedAt: setlist.updated_at,
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
    const { title, eventDate, startTime, venue, songs } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Titel ist erforderlich' },
        { status: 400 }
      );
    }

    // Store songs as JSON string
    const songsData = JSON.stringify(songs || []);

    // Benutzer-Name für Edit-Tracking
    const editorName = session.user.name || session.user.email || 'Unbekannt';

    const setlist = await updateSetlist(
      id,
      session.user.id,
      title,
      eventDate || null,
      startTime || null,
      venue || null,
      songsData,
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
