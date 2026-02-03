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
    const { password, actId } = body;  // actId is optional - null means full event

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
        shared_act_id: actId || null,  // null = full event, actId = specific act
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

    // Share-URL generieren - nutze die Request-URL für die Base-URL
    const requestUrl = new URL(request.url);
    const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;
    const shareUrl = `${baseUrl}/gig/${shareToken}`;

    return NextResponse.json({
      data: {
        shareUrl,
        shareToken,
        isShared: true,
        sharedActId: actId || null,
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
        shared_act_id: null,
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
      .select('share_token, is_shared, shared_act_id, encrypted_data')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Gig nicht gefunden' }, { status: 404 });
    }

    // Share-URL generieren - nutze die Request-URL für die Base-URL
    const requestUrl = new URL(request.url);
    const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;
    const shareUrl = data.share_token ? `${baseUrl}/gig/${data.share_token}` : null;

    // Get act name if sharing specific act
    let sharedActName: string | null = null;
    if (data.shared_act_id && data.encrypted_data) {
      try {
        const eventData = typeof data.encrypted_data === 'string'
          ? JSON.parse(data.encrypted_data)
          : data.encrypted_data;
        if (eventData.stages) {
          for (const stage of eventData.stages) {
            const act = stage.acts?.find((a: { id: string }) => a.id === data.shared_act_id);
            if (act) {
              sharedActName = act.name;
              break;
            }
          }
        }
      } catch {
        // Ignore parse errors
      }
    }

    return NextResponse.json({
      data: {
        isShared: data.is_shared || false,
        shareUrl,
        sharedActId: data.shared_act_id || null,
        sharedActName,
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
