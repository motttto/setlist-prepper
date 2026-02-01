import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';

interface RouteParams {
  params: Promise<{ token: string }>;
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
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

    // Songs parsen
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
        venue: setlist.venue,
        songs,
        updatedAt: setlist.updated_at,
        lastEditedBy: setlist.last_edited_by,
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
    const { password, title, eventDate, venue, songs, editorName, expectedUpdatedAt } = body;

    if (!password) {
      return NextResponse.json({ error: 'Passwort erforderlich' }, { status: 400 });
    }

    // Gig mit Token finden
    const { data: setlist, error: fetchError } = await supabase
      .from('setlists')
      .select('id, share_password_hash, updated_at')
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

    // Songs als JSON speichern
    const songsData = JSON.stringify(songs || []);
    const newUpdatedAt = new Date().toISOString();

    // Update
    const { data: updatedSetlist, error: updateError } = await supabase
      .from('setlists')
      .update({
        title,
        event_date: eventDate || null,
        venue: venue || null,
        encrypted_data: songsData,
        updated_at: newUpdatedAt,
        last_edited_by: editorName || 'Geteilt',
      })
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
