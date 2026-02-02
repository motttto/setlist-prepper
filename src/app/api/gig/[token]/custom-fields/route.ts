import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';

interface RouteParams {
  params: Promise<{ token: string }>;
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// POST /api/gig/[token]/custom-fields - Custom Field für den Setlist-Owner erstellen
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;
    const body = await request.json();
    const { password, fieldName, fieldType, dropdownOptions } = body;

    if (!password) {
      return NextResponse.json({ error: 'Passwort erforderlich' }, { status: 400 });
    }

    if (!fieldName || !fieldType) {
      return NextResponse.json({ error: 'Feldname und Feldtyp erforderlich' }, { status: 400 });
    }

    if (!['text', 'textarea', 'checkbox', 'dropdown'].includes(fieldType)) {
      return NextResponse.json({ error: 'Ungültiger Feldtyp' }, { status: 400 });
    }

    // Gig mit Token finden
    const { data: setlist, error } = await supabase
      .from('setlists')
      .select('id, user_id, share_password_hash')
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

    // Prüfen ob Feld mit diesem Namen bereits existiert
    const { data: existingField } = await supabase
      .from('custom_fields')
      .select('id')
      .eq('user_id', setlist.user_id)
      .eq('field_name', fieldName.trim())
      .single();

    if (existingField) {
      return NextResponse.json({ error: 'Ein Feld mit diesem Namen existiert bereits' }, { status: 400 });
    }

    // Custom Field für den Setlist-Owner erstellen
    const { data: newField, error: createError } = await supabase
      .from('custom_fields')
      .insert({
        user_id: setlist.user_id,
        field_name: fieldName.trim(),
        field_type: fieldType,
        dropdown_options: dropdownOptions || null,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating custom field:', createError);
      return NextResponse.json({ error: 'Fehler beim Erstellen' }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        id: newField.id,
        userId: newField.user_id,
        fieldName: newField.field_name,
        fieldType: newField.field_type,
        dropdownOptions: newField.dropdown_options,
        createdAt: newField.created_at,
      },
    });
  } catch (error) {
    console.error('Error creating custom field:', error);
    return NextResponse.json({ error: 'Fehler beim Erstellen' }, { status: 500 });
  }
}

// DELETE /api/gig/[token]/custom-fields - Custom Field löschen
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;
    const { searchParams } = new URL(request.url);
    const fieldId = searchParams.get('id');
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json({ error: 'Passwort erforderlich' }, { status: 400 });
    }

    if (!fieldId) {
      return NextResponse.json({ error: 'Feld-ID erforderlich' }, { status: 400 });
    }

    // Gig mit Token finden
    const { data: setlist, error } = await supabase
      .from('setlists')
      .select('id, user_id, share_password_hash')
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

    // Custom Field löschen
    const { error: deleteError } = await supabase
      .from('custom_fields')
      .delete()
      .eq('id', fieldId)
      .eq('user_id', setlist.user_id);

    if (deleteError) {
      console.error('Error deleting custom field:', deleteError);
      return NextResponse.json({ error: 'Fehler beim Löschen' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting custom field:', error);
    return NextResponse.json({ error: 'Fehler beim Löschen' }, { status: 500 });
  }
}
