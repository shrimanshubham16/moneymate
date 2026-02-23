/**
 * chatClient.ts — Supabase-direct chat client
 *
 * ALL operations go through PostgREST or Realtime WebSocket.
 * ZERO Edge Function invocations — free-tier safe.
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
export interface ChatMessage {
  id: string;
  user_id: string;
  username: string;
  message: string;
  created_at: string;
  avatar_url?: string | null;
  /** Client-only — true while the optimistic insert is in-flight */
  _optimistic?: boolean;
}

export interface PresenceUser {
  username: string;
  joinedAt: number;
}

export interface ChatReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

// -------------------------------------------------------------------
// Rate-limiter (1 msg / sec per client)
// -------------------------------------------------------------------
let lastSentAt = 0;
const RATE_LIMIT_MS = 1000;

// -------------------------------------------------------------------
// Message CRUD (PostgREST — 0 Edge Function calls)
// -------------------------------------------------------------------

/** Fetch the last 24 h of messages (max 200). */
export async function fetchMessages(): Promise<ChatMessage[]> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .gte('created_at', since)
    .order('created_at', { ascending: true })
    .limit(200);

  if (error) {
    console.error('[CHAT] fetchMessages error:', error);
    return [];
  }
  return (data ?? []) as ChatMessage[];
}

/** Insert a new message. Throws on rate-limit or DB error. */
export async function sendMessage(
  userId: string,
  username: string,
  message: string,
  avatarUrl?: string | null,
): Promise<ChatMessage> {
  const now = Date.now();
  if (now - lastSentAt < RATE_LIMIT_MS) {
    throw new Error('Slow down — you can send 1 message per second.');
  }
  lastSentAt = now;

  const trimmed = message.trim().slice(0, 500);
  if (!trimmed) throw new Error('Message cannot be empty.');

  const row: Record<string, unknown> = { user_id: userId, username, message: trimmed };
  if (avatarUrl) row.avatar_url = avatarUrl;

  const { data, error } = await supabase
    .from('chat_messages')
    .insert(row)
    .select()
    .single();

  if (error) {
    console.error('[CHAT] sendMessage error:', error);
    throw new Error(error.message);
  }
  return data as ChatMessage;
}

// -------------------------------------------------------------------
// Realtime — new-message subscription
// -------------------------------------------------------------------
let messageChannel: RealtimeChannel | null = null;

export function subscribeToNewMessages(
  onMessage: (msg: ChatMessage) => void,
): () => void {
  // Clean up any existing subscription
  if (messageChannel) {
    supabase.removeChannel(messageChannel);
  }

  messageChannel = supabase
    .channel('lounge-messages')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages' },
      (payload) => {
        onMessage(payload.new as ChatMessage);
      },
    )
    .subscribe();

  return () => {
    if (messageChannel) {
      supabase.removeChannel(messageChannel);
      messageChannel = null;
    }
  };
}

// -------------------------------------------------------------------
// Reaction CRUD (PostgREST — 0 Edge Function calls)
// -------------------------------------------------------------------

/** Bulk-fetch reactions for a list of message IDs. */
export async function fetchReactions(
  messageIds: string[],
): Promise<Record<string, ChatReaction[]>> {
  if (!messageIds.length) return {};

  const { data, error } = await supabase
    .from('chat_reactions')
    .select('*')
    .in('message_id', messageIds);

  if (error) {
    console.error('[CHAT] fetchReactions error:', error);
    return {};
  }

  const map: Record<string, ChatReaction[]> = {};
  for (const r of (data ?? []) as ChatReaction[]) {
    if (!map[r.message_id]) map[r.message_id] = [];
    map[r.message_id].push(r);
  }
  return map;
}

/** Toggle a reaction: if the user already reacted with this emoji, remove it; else add it. */
export async function toggleReaction(
  messageId: string,
  userId: string,
  emoji: string,
): Promise<{ added: boolean }> {
  // Check if already exists
  const { data: existing } = await supabase
    .from('chat_reactions')
    .select('id')
    .eq('message_id', messageId)
    .eq('user_id', userId)
    .eq('emoji', emoji)
    .maybeSingle();

  if (existing) {
    await supabase.from('chat_reactions').delete().eq('id', existing.id);
    return { added: false };
  } else {
    const { error } = await supabase
      .from('chat_reactions')
      .insert({ message_id: messageId, user_id: userId, emoji });
    if (error) {
      console.error('[CHAT] toggleReaction insert error:', error);
      throw new Error(error.message);
    }
    return { added: true };
  }
}

// -------------------------------------------------------------------
// Realtime — reaction subscription
// -------------------------------------------------------------------
let reactionChannel: RealtimeChannel | null = null;

export function subscribeToReactions(
  onInsert: (reaction: ChatReaction) => void,
  onDelete: (reaction: { id: string; message_id: string; user_id: string; emoji: string }) => void,
): () => void {
  if (reactionChannel) {
    supabase.removeChannel(reactionChannel);
  }

  reactionChannel = supabase
    .channel('lounge-reactions')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_reactions' },
      (payload) => {
        onInsert(payload.new as ChatReaction);
      },
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'chat_reactions' },
      (payload) => {
        onDelete(payload.old as any);
      },
    )
    .subscribe();

  return () => {
    if (reactionChannel) {
      supabase.removeChannel(reactionChannel);
      reactionChannel = null;
    }
  };
}

// -------------------------------------------------------------------
// Realtime Presence — online-user tracking
// -------------------------------------------------------------------
let presenceChannel: RealtimeChannel | null = null;
let presenceSyncCb: ((users: PresenceUser[]) => void) | null = null;

function flattenPresence(): PresenceUser[] {
  if (!presenceChannel) return [];
  const state = presenceChannel.presenceState();
  const users: PresenceUser[] = [];
  const seen = new Set<string>();
  for (const key of Object.keys(state)) {
    for (const p of state[key] as any[]) {
      if (!seen.has(p.username)) {
        seen.add(p.username);
        users.push({ username: p.username, joinedAt: p.joinedAt });
      }
    }
  }
  return users;
}

/** Join the presence channel and start tracking. */
export function joinPresence(
  username: string,
  onSync: (users: PresenceUser[]) => void,
): () => void {
  presenceSyncCb = onSync;

  // If already subscribed, just update callback
  if (presenceChannel) {
    onSync(flattenPresence());
    return () => leavePresence();
  }

  presenceChannel = supabase.channel('lounge-presence');

  presenceChannel
    .on('presence', { event: 'sync' }, () => {
      presenceSyncCb?.(flattenPresence());
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await presenceChannel!.track({ username, joinedAt: Date.now() });
      }
    });

  return () => leavePresence();
}

/** Subscribe to presence count only (for dashboard widget — lightweight). */
export function subscribePresenceCount(
  onCount: (count: number) => void,
): () => void {
  const channel = supabase.channel('lounge-presence-widget');

  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const seen = new Set<string>();
      for (const key of Object.keys(state)) {
        for (const p of state[key] as any[]) {
          seen.add(p.username);
        }
      }
      onCount(seen.size);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/** Leave presence & message channels. Call on unmount. */
export function leavePresence(): void {
  if (presenceChannel) {
    supabase.removeChannel(presenceChannel);
    presenceChannel = null;
    presenceSyncCb = null;
  }
}

export function leaveChat(): void {
  if (messageChannel) {
    supabase.removeChannel(messageChannel);
    messageChannel = null;
  }
  if (reactionChannel) {
    supabase.removeChannel(reactionChannel);
    reactionChannel = null;
  }
  leavePresence();
}

// -------------------------------------------------------------------
// JWT helper — extract userId + username from our custom JWT
// -------------------------------------------------------------------
export function getUserFromToken(token: string): {
  userId: string;
  username: string;
} {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const rawUsername = payload.username || payload.user_name || '';
    return {
      userId: payload.userId || payload.user_id || payload.sub || '',
      username: rawUsername.trim() || 'anon',
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
  return `${Math.floor(hrs / 24)}d`;
}
