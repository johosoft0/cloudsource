// ============================================================
// CloudSource — db.js
// Supabase client: auth, queries, storage, realtime
// ============================================================

import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Auth ──────────────────────────────────────────────────

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getUser() {
  const session = await getSession();
  return session?.user || null;
}

export function onAuthChange(callback) {
  supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user || null);
  });
}

export async function signInWithEmail(email) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin + window.location.pathname,
    },
  });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// ── Profiles ─────────────────────────────────────────────

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

export async function updateProfile(userId, updates) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Reports ──────────────────────────────────────────────

export async function getNearbyReports(lat, lng, radiusMiles = 5, since = null) {
  const sinceTime = since || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase.rpc('get_nearby_reports', {
    user_lat: lat,
    user_lng: lng,
    radius_miles: radiusMiles,
    since: sinceTime,
  });
  if (error) throw error;
  return data || [];
}

export async function submitReport({ userId, lat, lng, condition, intensity, note, photoPath }) {
  const { data, error } = await supabase
    .from('reports')
    .insert({
      user_id: userId,
      lat,
      lng,
      condition,
      intensity,
      note: note || null,
      photo_path: photoPath || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteReport(reportId) {
  const { error } = await supabase
    .from('reports')
    .delete()
    .eq('id', reportId);
  if (error) throw error;
}

// ── Votes ────────────────────────────────────────────────

export async function submitVote(reportId, userId, voteType) {
  await supabase
    .from('votes')
    .delete()
    .eq('report_id', reportId)
    .eq('user_id', userId);

  const { data, error } = await supabase
    .from('votes')
    .insert({
      report_id: reportId,
      user_id: userId,
      vote: voteType,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getUserVote(reportId, userId) {
  const { data } = await supabase
    .from('votes')
    .select('vote')
    .eq('report_id', reportId)
    .eq('user_id', userId)
    .maybeSingle();
  return data?.vote || null;
}

// ── Photo Storage ────────────────────────────────────────

export async function uploadPhoto(userId, blob) {
  const filename = `${userId}/${Date.now()}.jpg`;
  const { data, error } = await supabase.storage
    .from('photos')
    .upload(filename, blob, {
      contentType: 'image/jpeg',
      upsert: false,
    });
  if (error) throw error;
  return data.path;
}

export function getPhotoUrl(path) {
  if (!path) return null;
  const { data } = supabase.storage
    .from('photos')
    .getPublicUrl(path);
  return data.publicUrl;
}

// ── Realtime ─────────────────────────────────────────────

let realtimeChannel = null;

export function subscribeToReports(onInsert) {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
  }

  realtimeChannel = supabase
    .channel('live-reports')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'reports' },
      (payload) => {
        onInsert(payload.new);
      }
    )
    .subscribe();

  return realtimeChannel;
}

export function unsubscribeFromReports() {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
}

export { supabase };
