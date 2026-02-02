import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getCustomFieldsByUser,
  createCustomField,
  deleteCustomField,
} from '@/lib/supabase';

// GET /api/custom-fields - Get all custom fields for the current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const fields = await getCustomFieldsByUser(session.user.id);

    return NextResponse.json({
      data: fields.map((f) => ({
        id: f.id,
        fieldName: f.field_name,
        fieldType: f.field_type,
        dropdownOptions: f.dropdown_options,
        createdAt: f.created_at,
      })),
    });
  } catch (error) {
    console.error('Error fetching custom fields:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der benutzerdefinierten Felder' },
      { status: 500 }
    );
  }
}

// POST /api/custom-fields - Create a new custom field
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const body = await request.json();
    const { fieldName, fieldType = 'text', dropdownOptions } = body;

    if (!fieldName) {
      return NextResponse.json(
        { error: 'Feldname ist erforderlich' },
        { status: 400 }
      );
    }

    const field = await createCustomField(session.user.id, fieldName, fieldType, dropdownOptions);

    return NextResponse.json({
      data: {
        id: field.id,
        fieldName: field.field_name,
        fieldType: field.field_type,
        dropdownOptions: field.dropdown_options,
        createdAt: field.created_at,
      },
    });
  } catch (error) {
    console.error('Error creating custom field:', error);
    return NextResponse.json(
      { error: 'Fehler beim Erstellen des benutzerdefinierten Feldes' },
      { status: 500 }
    );
  }
}

// DELETE /api/custom-fields - Delete a custom field
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID ist erforderlich' }, { status: 400 });
    }

    await deleteCustomField(id, session.user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting custom field:', error);
    return NextResponse.json(
      { error: 'Fehler beim Löschen des benutzerdefinierten Feldes' },
      { status: 500 }
    );
  }
}
