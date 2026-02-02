import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Server-side Supabase client (for API routes only)
// WARNING: This file should ONLY be imported in server-side code (API routes, server components)

let serverClient: SupabaseClient | null = null;

function getServerClient(): SupabaseClient {
  if (serverClient) return serverClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase server environment variables');
  }

  serverClient = createClient(supabaseUrl, supabaseServiceKey);
  return serverClient;
}

// Use a Proxy to lazily initialize the client
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_, prop: keyof SupabaseClient) {
    const client = getServerClient();
    const value = client[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});

// Database Types
export interface DbSetlist {
  id: string;
  user_id: string;
  title: string;
  event_date: string | null;
  start_time: string | null;
  venue: string | null;
  encrypted_data: string;
  is_shared: boolean | null;
  share_token: string | null;
  share_password_hash?: string | null;
  last_edited_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbCustomField {
  id: string;
  user_id: string;
  field_name: string;
  field_type: string;
  created_at: string;
}

// Database helper functions
export async function getSetlistsByUser(userId: string): Promise<DbSetlist[]> {
  const { data, error } = await supabase
    .from('setlists')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getSetlistById(
  id: string,
  userId: string
): Promise<DbSetlist | null> {
  const { data, error } = await supabase
    .from('setlists')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data;
}

export async function createSetlist(
  userId: string,
  title: string,
  eventDate: string | null,
  startTime: string | null,
  venue: string | null,
  encryptedData: string
): Promise<DbSetlist> {
  const { data, error } = await supabase
    .from('setlists')
    .insert({
      user_id: userId,
      title,
      event_date: eventDate,
      start_time: startTime,
      venue,
      encrypted_data: encryptedData,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateSetlist(
  id: string,
  userId: string,
  title: string,
  eventDate: string | null,
  startTime: string | null,
  venue: string | null,
  encryptedData: string,
  lastEditedBy?: string,
  expectedUpdatedAt?: string
): Promise<DbSetlist> {
  // Wenn expectedUpdatedAt gegeben, prüfe auf Konflikt (Optimistic Locking)
  if (expectedUpdatedAt) {
    const { data: current } = await supabase
      .from('setlists')
      .select('updated_at')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (current && current.updated_at !== expectedUpdatedAt) {
      const error = new Error('CONFLICT: Setlist wurde von jemand anderem bearbeitet') as Error & { code: string };
      error.code = 'CONFLICT';
      throw error;
    }
  }

  const { data, error } = await supabase
    .from('setlists')
    .update({
      title,
      event_date: eventDate,
      start_time: startTime,
      venue,
      encrypted_data: encryptedData,
      updated_at: new Date().toISOString(),
      last_edited_by: lastEditedBy || null,
    })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteSetlist(
  id: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('setlists')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw error;
}

// Custom Fields
export async function getCustomFieldsByUser(
  userId: string
): Promise<DbCustomField[]> {
  const { data, error } = await supabase
    .from('custom_fields')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createCustomField(
  userId: string,
  fieldName: string,
  fieldType: string = 'text'
): Promise<DbCustomField> {
  const { data, error } = await supabase
    .from('custom_fields')
    .insert({
      user_id: userId,
      field_name: fieldName,
      field_type: fieldType,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCustomField(
  id: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('custom_fields')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw error;
}
