/**
 * activitySocial.ts — Pins & Comments for Activities
 *
 * ALL operations go through PostgREST or Realtime WebSocket.
 * ZERO Edge Function invocations — free-tier safe.
 *
 * Same pattern as chatClient.ts.
 */

import { createClient, RealtimeChannel } from '@supabase/supabase-js';

// -------------------------------------------------------------------
// Supabase client (shared across the module)
// -------------------------------------------------------------------
const SUPABASE_URL =
  (import.meta as any).env?.VITE_SUPABASE_URL ||
  'https://eklennfapovprkebdsml.supabase.co';

const SUPABASE_ANON_KEY =
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: { params: { eventsPerSecond: 10 } },
});

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------
export interface ActivityPin {
  id: string;
  user_id: string;
  activity_id: string;
  created_at: string;
}

export interface ActivityComment {
  id: string;
  activity_id: string;
  user_id: string;
  username: string;
  comment: string;
  created_at: string;
  /** Client-only — true while the optimistic insert is in-flight */
  _optimistic?: boolean;
}

// -------------------------------------------------------------------
// Rate-limiter (1 comment / sec per client)
// -------------------------------------------------------------------
let lastCommentAt = 0;
const COMMENT_RATE_LIMIT_MS = 1000;

// -------------------------------------------------------------------
// PIN operations (PostgREST — 0 Edge Function calls)
// -------------------------------------------------------------------

/** Fetch all pins for a user. */
export async function fetchPins(userId: string): Promise<ActivityPin[]> {
  const { data, error } = await supabase
    .from('activity_pins')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[PINS] fetchPins error:', error);
    return [];
  }
  return (data ?? []) as ActivityPin[];
}

/** Pin an activity. Idempotent — ignores if already pinned. */
export async function pinActivity(
  userId: string,
  activityId: string,
): Promise<ActivityPin | null> {
  const { data, error } = await supabase
    .from('activity_pins')
    .upsert(
      { user_id: userId, activity_id: activityId },
      { onConflict: 'user_id,activity_id', ignoreDuplicates: true },
    )
    .select()
    .single();

  if (error) {
    // 409 or duplicate key is expected if already pinned
    if (error.code === '23505') return null;
    console.error('[PINS] pinActivity error:', error);
    throw new Error(error.message);
  }
  return data as ActivityPin;
}

/** Unpin an activity. */
export async function unpinActivity(
  userId: string,
  activityId: string,
): Promise<void> {
  const { error } = await supabase
    .from('activity_pins')
    .delete()
    .eq('user_id', userId)
    .eq('activity_id', activityId);

  if (error) {
    console.error('[PINS] unpinActivity error:', error);
    throw new Error(error.message);
  }
}

/** Unpin all activities for a user. */
export async function unpinAll(userId: string): Promise<void> {
  const { error } = await supabase
    .from('activity_pins')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('[PINS] unpinAll error:', error);
    throw new Error(error.message);
  }
}

// Max pins per user (enforced client-side)
export const MAX_PINS = 20;

// -------------------------------------------------------------------
// COMMENT operations (PostgREST — 0 Edge Function calls)
// -------------------------------------------------------------------

/** Fetch comments for a batch of activity IDs. Returns a Map. */
export async function fetchComments(
  activityIds: string[],
): Promise<Map<string, ActivityComment[]>> {
  if (activityIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('activity_comments')
    .select('*')
    .in('activity_id', activityIds)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[COMMENTS] fetchComments error:', error);
    return new Map();
  }

  const map = new Map<string, ActivityComment[]>();
  for (const c of (data ?? []) as ActivityComment[]) {
    const arr = map.get(c.activity_id) || [];
    arr.push(c);
    map.set(c.activity_id, arr);
  }
  return map;
}

/** Get comment counts for a batch of activity IDs. */
export async function getCommentCounts(
  activityIds: string[],
): Promise<Map<string, number>> {
  if (activityIds.length === 0) return new Map();

  // Use a select with count grouping — PostgREST doesn't support GROUP BY,
  // so we fetch all IDs and count client-side (efficient for < 1000 activities)
  const { data, error } = await supabase
    .from('activity_comments')
    .select('activity_id')
    .in('activity_id', activityIds);

  if (error) {
    console.error('[COMMENTS] getCommentCounts error:', error);
    return new Map();
  }

  const map = new Map<string, number>();
  for (const row of (data ?? []) as { activity_id: string }[]) {
    map.set(row.activity_id, (map.get(row.activity_id) || 0) + 1);
  }
  return map;
}

/** Add a comment to an activity. */
export async function addComment(
  activityId: string,
  userId: string,
  username: string,
  comment: string,
): Promise<ActivityComment> {
  const now = Date.now();
  if (now - lastCommentAt < COMMENT_RATE_LIMIT_MS) {
    throw new Error('Slow down — you can comment once per second.');
  }
  lastCommentAt = now;

  const trimmed = comment.trim().slice(0, 300);
  if (!trimmed) throw new Error('Comment cannot be empty.');

  const { data, error } = await supabase
    .from('activity_comments')
    .insert({ activity_id: activityId, user_id: userId, username, comment: trimmed })
    .select()
    .single();

  if (error) {
    console.error('[COMMENTS] addComment error:', error);
    throw new Error(error.message);
  }
  return data as ActivityComment;
}

/** Delete a comment by ID. */
export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase
    .from('activity_comments')
    .delete()
    .eq('id', commentId);

  if (error) {
    console.error('[COMMENTS] deleteComment error:', error);
    throw new Error(error.message);
  }
}

// -------------------------------------------------------------------
// Realtime — comment subscription
// -------------------------------------------------------------------
let commentChannel: RealtimeChannel | null = null;

/**
 * Subscribe to new comments on the activity_comments table.
 * Returns an unsubscribe function.
 */
export function subscribeToComments(
  onNewComment: (comment: ActivityComment) => void,
): () => void {
  // Clean up existing
  if (commentChannel) {
    supabase.removeChannel(commentChannel);
  }

  commentChannel = supabase
    .channel('activity-comments-realtime')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'activity_comments' },
      (payload) => {
        onNewComment(payload.new as ActivityComment);
      },
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'activity_comments' },
      (payload) => {
        // For deletes, we handle via a separate callback or re-fetch
        // We'll emit the old record so the UI can remove it
        onNewComment({ ...(payload.old as ActivityComment), _optimistic: false } as any);
      },
    )
    .subscribe();

  return () => {
    if (commentChannel) {
      supabase.removeChannel(commentChannel);
      commentChannel = null;
    }
  };
}

/** Cleanup all channels on unmount */
export function cleanup(): void {
  if (commentChannel) {
    supabase.removeChannel(commentChannel);
    commentChannel = null;
  }
}

// -------------------------------------------------------------------
// JWT helper — same as chatClient
// -------------------------------------------------------------------
export function getUserFromToken(token: string): {
  userId: string;
  username: string;
} {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      userId: payload.userId || payload.user_id || payload.sub || '',
      username: payload.username || payload.user_name || 'anon',
    };
  } catch {
    return { userId: '', username: 'anon' };
  }
}

// -------------------------------------------------------------------
// Avatar colour helpers (deterministic from username)
// -------------------------------------------------------------------
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
}

const GRADIENTS = [
  ['#FF6B6B', '#FF8E53'],
  ['#A78BFA', '#818CF8'],
  ['#34D399', '#06B6D4'],
  ['#F472B6', '#E879F9'],
  ['#FBBF24', '#F59E0B'],
  ['#60A5FA', '#3B82F6'],
  ['#FB923C', '#F97316'],
  ['#2DD4BF', '#14B8A6'],
  ['#C084FC', '#A855F7'],
  ['#38BDF8', '#0EA5E9'],
];

export function avatarGradient(username: string): [string, string] {
  const idx = Math.abs(hashCode(username)) % GRADIENTS.length;
  return GRADIENTS[idx] as [string, string];
}

// -------------------------------------------------------------------
// Relative-time formatter
// -------------------------------------------------------------------
export function relativeTime(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 30) return 'just now';
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}
