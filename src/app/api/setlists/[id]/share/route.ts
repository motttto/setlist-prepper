import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Generiere einen sicheren Share-Token
function generateShareToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Hash das Passwort
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// POST /api/setlists/[id]/share - Teilen aktivieren
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { password } = body;

    if (!password || password.length < 4) {
      return NextResponse.json(
        { error: 'Passwort muss mindestens 4 Zeichen haben' },
        { status: 400 }
      );
    }

    // Prüfen ob der Gig dem User gehört
    const { data: existingSetlist, error: fetchError } = await supabase
      .from('setlists')
      .select('id, share_token')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .single();

    if (fetchError || !existingSetlist) {
      return NextResponse.json({ error: 'Gig nicht gefunden' }, { status: 404 });
    }

    // Token generieren (oder bestehenden behalten)
    const shareToken = existingSetlist.share_token || generateShareToken();
    const passwordHash = hashPassword(password);

    // Update mit Share-Daten
    const { error: updateError } = await supabase
      .from('setlists')
      .update({
        share_token: shareToken,
        share_password_hash: passwordHash,
        is_shared: true,
      })
      .eq('id', id)
      .eq('user_id', session.user.id);

    if (updateError) {
      console.error('Error enabling share:', updateError);
      return NextResponse.json(
        { error: 'Fehler beim Aktivieren des Teilens' },
        { status: 500 }
      );
    }

    // Share-URL generieren
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const shareUrl = `${baseUrl}/gig/${shareToken}`;

    return NextResponse.json({
      data: {
        shareUrl,
        shareToken,
        isShared: true,
      },
    });
  } catch (error) {
    console.error('Error in share endpoint:', error);
    return NextResponse.json(
      { error: 'Fehler beim Teilen' },
      { status: 500 }
    );
  }
}

// DELETE /api/setlists/[id]/share - Teilen deaktivieren
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { id } = await params;

    const { error } = await supabase
      .from('setlists')
      .update({
        share_token: null,
        share_password_hash: null,
        is_shared: false,
      })
      .eq('id', id)
      .eq('user_id', session.user.id);

    if (error) {
      console.error('Error disabling share:', error);
      return NextResponse.json(
        { error: 'Fehler beim Deaktivieren des Teilens' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in share endpoint:', error);
    return NextResponse.json(
      { error: 'Fehler beim Deaktivieren' },
      { status: 500 }
    );
  }
}

// GET /api/setlists/[id]/share - Share-Status abrufen
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { id } = await params;

    const { data, error } = await supabase
      .from('setlists')
      .select('share_token, is_shared')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Gig nicht gefunden' }, { status: 404 });
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const shareUrl = data.share_token ? `${baseUrl}/gig/${data.share_token}` : null;

    return NextResponse.json({
      data: {
        isShared: data.is_shared || false,
        shareUrl,
      },
    });
  } catch (error) {
    console.error('Error getting share status:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden' },
      { status: 500 }
    );
  }
}
