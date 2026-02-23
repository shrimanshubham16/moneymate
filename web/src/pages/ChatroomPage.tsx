import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { IoArrowBack, IoSend, IoClose } from 'react-icons/io5';
import { HiChatBubbleLeftRight } from 'react-icons/hi2';
import { VscBug } from 'react-icons/vsc';
import { HiLightBulb } from 'react-icons/hi';
import {
  ChatMessage,
  ChatReaction,
  PresenceUser,
  fetchMessages,
  sendMessage,
  subscribeToNewMessages,
  fetchReactions,
  toggleReaction,
  subscribeToReactions,
  joinPresence,
  leaveChat,
  getUserFromToken,
  avatarGradient,
  relativeTime,
} from '../lib/chatClient';
import './ChatroomPage.css';

interface ChatroomPageProps {
  token: string;
}

// -------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------
const MAX_CHARS = 500;
const EMOJI_PALETTE = ['👍', '❤️', '🔥', '😂', '👀', '🎯'];

// -------------------------------------------------------------------
// Tag parser
// -------------------------------------------------------------------
type TagType = 'bug' | 'feature' | null;

function parseTag(message: string): { tag: TagType; cleanText: string } {
  const match = message.match(/:(BUG|FEATURE):/i);
  if (!match) return { tag: null, cleanText: message };
  const raw = match[1].toUpperCase();
  const tag: TagType = raw === 'BUG' ? 'bug' : 'feature';
  const cleanText = message.replace(/:(BUG|FEATURE):\s*/i, '').trim();
  return { tag, cleanText };
}

/** Detect active tag in draft text */
function detectDraftTag(draft: string): TagType {
  if (/^:BUG:/i.test(draft)) return 'bug';
  if (/^:FEATURE:/i.test(draft)) return 'feature';
  return null;
}

/** Strip tag prefix from draft to show clean text in textarea */
function stripTagPrefix(draft: string): string {
  return draft.replace(/^:(BUG|FEATURE):\s*/i, '');
}

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

function needsTimeSep(prev: ChatMessage | null, curr: ChatMessage): boolean {
  if (!prev) return true;
  return (
    new Date(curr.created_at).getTime() -
      new Date(prev.created_at).getTime() >
    5 * 60 * 1000
  );
}

function isGrouped(prev: ChatMessage | null, curr: ChatMessage, hasTimeSep: boolean): boolean {
  if (!prev || hasTimeSep) return false;
  if (prev.user_id !== curr.user_id) return false;
  const gap =
    new Date(curr.created_at).getTime() -
    new Date(prev.created_at).getTime();
  return gap < 2 * 60 * 1000;
}

function getBaseUrl(): string {
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl) return envUrl;
  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  if (supabaseUrl) return `${supabaseUrl.replace('/rest/v1', '').replace(/\/$/, '')}/functions/v1/api`;
  return 'https://eklennfapovprkebdsml.supabase.co/functions/v1/api';
}

function aggregateReactions(
  reactions: ChatReaction[],
): { emoji: string; count: number; userIds: string[] }[] {
  const map = new Map<string, string[]>();
  for (const r of reactions) {
    const arr = map.get(r.emoji) || [];
    arr.push(r.user_id);
    map.set(r.emoji, arr);
  }
  return Array.from(map.entries()).map(([emoji, userIds]) => ({
    emoji,
    count: userIds.length,
    userIds,
  }));
}

// -------------------------------------------------------------------
// Component
// -------------------------------------------------------------------
export function ChatroomPage({ token }: ChatroomPageProps) {
  const navigate = useNavigate();
  const { userId, username } = getUserFromToken(token);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewPill, setShowNewPill] = useState(false);
  const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null);

  const [reactions, setReactions] = useState<Record<string, ChatReaction[]>>({});
  const [emojiBarMsgId, setEmojiBarMsgId] = useState<string | null>(null);

  // Active tag state (managed separately from raw draft)
  const [activeTag, setActiveTag] = useState<TagType>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const isNearBottom = useRef(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Derived: the text that will actually be sent (tag prefix + draft)
  const fullMessage = useMemo(() => {
    if (!activeTag) return draft;
    const prefix = activeTag === 'bug' ? ':BUG: ' : ':Feature: ';
    return prefix + draft;
  }, [activeTag, draft]);

  // ---- Scroll helpers ----
  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
    });
    setShowNewPill(false);
  }, []);

  const handleScroll = useCallback(() => {
    const el = messagesRef.current;
    if (!el) return;
    const gap = el.scrollHeight - el.scrollTop - el.clientHeight;
    isNearBottom.current = gap < 80;
    if (isNearBottom.current) setShowNewPill(false);
  }, []);

  // ---- Fetch own avatar ----
  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch(`${getBaseUrl()}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (resp.ok) {
          const data = await resp.json();
          setMyAvatarUrl(data.data?.avatar_url || null);
        }
      } catch {
        // silently fail
      }
    })();
  }, [token]);

  // ---- Bootstrap ----
  useEffect(() => {
    let unsubs: Array<() => void> = [];

    (async () => {
      const history = await fetchMessages();
      setMessages(history);
      setLoading(false);
      requestAnimationFrame(() => scrollToBottom(false));

      if (history.length > 0) {
        const ids = history.map((m) => m.id);
        const reactionsMap = await fetchReactions(ids);
        setReactions(reactionsMap);
      }

      const unsubMsg = subscribeToNewMessages((msg) => {
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === msg.id);
          if (exists) {
            return prev.map((m) =>
              m.id === msg.id ? { ...msg, _optimistic: false } : m,
            );
          }
          const cleaned = prev.filter(
            (m) =>
              !(
                m._optimistic &&
                m.user_id === msg.user_id &&
                m.message === msg.message
              ),
          );
          return [...cleaned, msg];
        });

        if (isNearBottom.current) {
          requestAnimationFrame(() => scrollToBottom(true));
        } else {
          setShowNewPill(true);
        }
      });
      unsubs.push(unsubMsg);

      const unsubReactions = subscribeToReactions(
        (reaction) => {
          setReactions((prev) => {
            const list = prev[reaction.message_id] || [];
            if (list.some((r) => r.id === reaction.id)) return prev;
            return { ...prev, [reaction.message_id]: [...list, reaction] };
          });
        },
        (deleted) => {
          setReactions((prev) => {
            const msgId = deleted.message_id;
            if (!msgId || !prev[msgId]) return prev;
            return {
              ...prev,
              [msgId]: prev[msgId].filter((r) => r.id !== deleted.id),
            };
          });
        },
      );
      unsubs.push(unsubReactions);

      const unsubPresence = joinPresence(username, setOnlineUsers);
      unsubs.push(unsubPresence);
    })();

    return () => {
      unsubs.forEach((fn) => fn());
      leaveChat();
    };
  }, [username, scrollToBottom]);

  // ---- Close emoji bar on outside click ----
  useEffect(() => {
    if (!emojiBarMsgId) return;
    const handler = () => setEmojiBarMsgId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [emojiBarMsgId]);

  // ---- Send ----
  const handleSend = async () => {
    const text = fullMessage.trim();
    if (!text || sending) return;

    setDraft('');
    setActiveTag(null);
    setSending(true);
    setError(null);

    const optimistic: ChatMessage = {
      id: `opt-${Date.now()}`,
      user_id: userId,
      username,
      message: text,
      created_at: new Date().toISOString(),
      avatar_url: myAvatarUrl,
      _optimistic: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    requestAnimationFrame(() => scrollToBottom(true));

    try {
      await sendMessage(userId, username, text, myAvatarUrl);
    } catch (err: any) {
      setError(err.message || 'Failed to send');
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setDraft(stripTagPrefix(text));
      setActiveTag(detectDraftTag(text));
      setTimeout(() => setError(null), 3000);
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  // ---- Reaction toggle ----
  const handleReaction = async (messageId: string, emoji: string) => {
    const existing = (reactions[messageId] || []).find(
      (r) => r.user_id === userId && r.emoji === emoji,
    );

    if (existing) {
      setReactions((prev) => ({
        ...prev,
        [messageId]: (prev[messageId] || []).filter((r) => r.id !== existing.id),
      }));
    } else {
      const optimistic: ChatReaction = {
        id: `opt-react-${Date.now()}`,
        message_id: messageId,
        user_id: userId,
        emoji,
        created_at: new Date().toISOString(),
      };
      setReactions((prev) => ({
        ...prev,
        [messageId]: [...(prev[messageId] || []), optimistic],
      }));
    }

    setEmojiBarMsgId(null);

    try {
      await toggleReaction(messageId, userId, emoji);
    } catch {
      // Realtime will reconcile
    }
  };

  // ---- Tag management (visual chip instead of raw prefix) ----
  const setTag = (tag: TagType) => {
    if (activeTag === tag) {
      setActiveTag(null);
    } else {
      setActiveTag(tag);
    }
    textareaRef.current?.focus();
  };

  const removeTag = () => {
    setActiveTag(null);
    textareaRef.current?.focus();
  };

  // Auto-resize textarea
  const handleDraftChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    let val = e.target.value;
    // If user manually types :BUG: or :Feature: detect and extract
    const detected = detectDraftTag(val);
    if (detected) {
      setActiveTag(detected);
      val = stripTagPrefix(val);
    }
    if (val.length <= MAX_CHARS) setDraft(val);
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight}px`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const effectiveLength = fullMessage.length;
  const charClass =
    effectiveLength > MAX_CHARS - 20
      ? effectiveLength >= MAX_CHARS
        ? 'over'
        : 'warn'
      : '';

  // ---- Render ----
  return (
    <div className="chatroom-page">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-left">
          <button className="chat-back-btn" onClick={() => navigate(-1)}>
            <IoArrowBack />
          </button>
          <span className="chat-title">The Lounge</span>
        </div>
        <div className="chat-online">
          <span className="chat-online-dot" />
          <span>{onlineUsers.length} vibing</span>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="chat-disclaimer">
        Messages cleared daily · Tap a bubble to react · Be cool, be kind ✌️
      </div>

      {/* Messages */}
      {loading ? (
        <div className="chat-loading">
          <div className="chat-loading-dots">
            <span /><span /><span />
          </div>
        </div>
      ) : messages.length === 0 ? (
        <div className="chat-empty">
          <div className="chat-empty-icon">
            <HiChatBubbleLeftRight />
          </div>
          <h3>It's quiet in here…</h3>
          <p>Be the first to say hey! Share a tip, ask a question, or just vibe.</p>
        </div>
      ) : (
        <div
          className="chat-messages"
          ref={messagesRef}
          onScroll={handleScroll}
        >
          {messages.map((msg, i) => {
            const prev = i > 0 ? messages[i - 1] : null;
            const isOwn = msg.user_id === userId;
            const showTimeSep = needsTimeSep(prev, msg);
            const grouped = isGrouped(prev, msg, showTimeSep);
            const [g1, g2] = avatarGradient(msg.username || 'A');
            const { tag, cleanText } = parseTag(msg.message);
            const msgReactions = reactions[msg.id] || [];
            const aggregated = aggregateReactions(msgReactions);
            const avatarSrc = isOwn ? (myAvatarUrl || msg.avatar_url) : msg.avatar_url;
            const showHeader = !grouped;

            return (
              <div key={msg.id}>
                {showTimeSep && (
                  <div className="chat-time-sep">
                    {relativeTime(msg.created_at)}
                  </div>
                )}
                <motion.div
                  className={`chat-msg-row ${isOwn ? 'own' : 'other'} ${grouped ? 'grouped' : ''}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {/* Avatar */}
                  {!grouped ? (
                    <div className="chat-avatar-wrap">
                      {avatarSrc ? (
                        <img
                          className="chat-avatar-img"
                          src={avatarSrc}
                          alt={msg.username}
                        />
                      ) : (
                        <div
                          className="chat-avatar"
                          style={{ background: `linear-gradient(135deg, ${g1}, ${g2})` }}
                        >
                          {(msg.username || 'A').charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="chat-avatar-spacer" />
                  )}

                  {/* Bubble + meta */}
                  <div className="chat-bubble-wrap">
                    {showHeader && (
                      <div className="chat-bubble-meta">
                        <span className="chat-bubble-username" style={{ color: g1 }}>
                          {isOwn ? 'You' : (msg.username || 'Anonymous')}
                        </span>
                        {!showTimeSep && (
                          <span className="chat-bubble-time">
                            {relativeTime(msg.created_at)}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Bubble */}
                    <div
                      className={`chat-bubble ${msg._optimistic ? 'sending' : ''}`}
                      onClick={(e) => {
                        if (msg._optimistic) return;
                        e.stopPropagation();
                        setEmojiBarMsgId((prev) => (prev === msg.id ? null : msg.id));
                      }}
                    >
                      {/* Tag badge — block-level above text */}
                      {tag && (
                        <span className={`chat-tag-badge ${tag}`}>
                          {tag === 'bug' ? '🐛 BUG' : '💡 Feature'}
                        </span>
                      )}
                      {/* Message text on its own line when tag present */}
                      <span className="chat-bubble-text">{cleanText}</span>

                      {/* Emoji bar — floating picker */}
                      <AnimatePresence>
                        {emojiBarMsgId === msg.id && !msg._optimistic && (
                          <motion.div
                            className={`chat-reaction-bar ${isOwn ? 'left' : 'right'}`}
                            initial={{ opacity: 0, scale: 0.8, y: 4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, y: 4 }}
                            transition={{ duration: 0.15 }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {EMOJI_PALETTE.map((em) => (
                              <button
                                key={em}
                                className={`reaction-emoji-btn ${
                                  msgReactions.some(
                                    (r) => r.user_id === userId && r.emoji === em,
                                  )
                                    ? 'active'
                                    : ''
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReaction(msg.id, em);
                                }}
                              >
                                {em}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Reaction pills */}
                    {aggregated.length > 0 && (
                      <div className="chat-reaction-pills">
                        {aggregated.map(({ emoji, count, userIds }) => (
                          <button
                            key={emoji}
                            className={`chat-reaction-pill ${
                              userIds.includes(userId) ? 'mine' : ''
                            }`}
                            onClick={() => handleReaction(msg.id, emoji)}
                            title={`${count} reaction${count > 1 ? 's' : ''}`}
                          >
                            <span className="pill-emoji">{emoji}</span>
                            <span className="pill-count">{count}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      )}

      {/* New-messages pill */}
      <AnimatePresence>
        {showNewPill && (
          <motion.button
            className="chat-new-pill"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={() => scrollToBottom(true)}
          >
            ↓ New messages
          </motion.button>
        )}
      </AnimatePresence>

      {/* Error toast */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="chat-error-toast"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input bar */}
      <div className="chat-input-bar">
        {/* Quick-tag buttons — only show when no tag is active */}
        {!activeTag && (
          <div className="chat-tag-buttons">
            <button
              className="chat-tag-btn bug"
              onClick={() => setTag('bug')}
              title="Report a bug"
            >
              <VscBug />
            </button>
            <button
              className="chat-tag-btn feature"
              onClick={() => setTag('feature')}
              title="Suggest a feature"
            >
              <HiLightBulb />
            </button>
          </div>
        )}

        {/* Active tag chip — replaces the raw `:BUG:` / `:Feature:` prefix */}
        {activeTag && (
          <div className={`chat-active-tag-chip ${activeTag}`}>
            {activeTag === 'bug' ? '🐛 BUG' : '💡 Feature'}
            <button className="tag-chip-remove" onClick={removeTag}>
              <IoClose />
            </button>
          </div>
        )}

        <div className="chat-input-wrap">
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder={activeTag
              ? (activeTag === 'bug' ? 'Describe the bug…' : 'Describe your idea…')
              : 'Type your message…'
            }
            value={draft}
            onChange={handleDraftChange}
            onKeyDown={handleKeyDown}
            maxLength={MAX_CHARS}
          />
          {effectiveLength > 0 && (
            <span className={`chat-char-count ${charClass}`}>
              {effectiveLength}/{MAX_CHARS}
            </span>
          )}
        </div>
        <button
          className="chat-send-btn"
          onClick={handleSend}
          disabled={!fullMessage.trim() || sending}
          title="Send"
        >
          <IoSend />
        </button>
      </div>
    </div>
  );
}
