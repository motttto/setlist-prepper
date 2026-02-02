import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getSetlistsByUser,
  createSetlist,
} from '@/lib/supabase';

// GET /api/setlists - Get all setlists for the current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const setlists = await getSetlistsByUser(session.user.id);

    // Return metadata with song count
    const setlistMetadata = setlists.map((s) => {
      let songCount = 0;
      try {
        const data = JSON.parse(s.encrypted_data || '[]');
        if (Array.isArray(data)) {
          // Old format: flat array of songs
          songCount = data.filter((song: { type?: string }) => (song.type || 'song') === 'song').length;
        } else if (data.stages) {
          // New format: stages > acts > songs
          for (const stage of data.stages) {
            for (const act of stage.acts || []) {
              songCount += (act.songs || []).filter((song: { type?: string }) => (song.type || 'song') === 'song').length;
            }
          }
        }
      } catch {
        songCount = 0;
      }

      return {
        id: s.id,
        title: s.title,
        eventDate: s.event_date,
        startTime: s.start_time,
        venue: s.venue,
        songCount,
        isShared: s.is_shared || false,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
      };
    });

    return NextResponse.json({ data: setlistMetadata });
  } catch (error) {
    console.error('Error fetching setlists:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der Setlists' },
      { status: 500 }
    );
  }
}

// POST /api/setlists - Create a new setlist
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

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

    const setlist = await createSetlist(
      session.user.id,
      title,
      eventDate || null,
      startTime || null,
      venue || null,
      dataToStore
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
    console.error('Error creating setlist:', error);
    return NextResponse.json(
      { error: 'Fehler beim Erstellen der Setlist' },
      { status: 500 }
    );
  }
}
