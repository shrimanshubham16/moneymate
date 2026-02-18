import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { IoArrowBack, IoSend } from 'react-icons/io5';
import { HiChatBubbleLeftRight } from 'react-icons/hi2';
import {
  ChatMessage,
  PresenceUser,
  fetchMessages,
  sendMessage,
  subscribeToNewMessages,
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
// Helpers
// -------------------------------------------------------------------
const MAX_CHARS = 500;

/** Show a time separator between two messages when gap > 5 min */
function needsTimeSep(prev: ChatMessage | null, curr: ChatMessage): boolean {
  if (!prev) return true;
  return (
    new Date(curr.created_at).getTime() -
      new Date(prev.created_at).getTime() >
    5 * 60 * 1000
  );
}

/** Group consecutive messages from same user within 2 min */
function isGrouped(prev: ChatMessage | null, curr: ChatMessage, hasTimeSep: boolean): boolean {
  if (!prev || hasTimeSep) return false;
  if (prev.user_id !== curr.user_id) return false;
  const gap =
    new Date(curr.created_at).getTime() -
    new Date(prev.created_at).getTime();
  return gap < 2 * 60 * 1000;
}

/** API base URL for fetching user profile (avatar) */
function getBaseUrl(): string {
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl) return envUrl;
  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  if (supabaseUrl) return `${supabaseUrl.replace('/rest/v1', '').replace(/\/$/, '')}/functions/v1/api`;
  return 'https://eklennfapovprkebdsml.supabase.co/functions/v1/api';
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

  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const isNearBottom = useRef(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
        // silently fail — gradient avatar will be used
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

      const unsubPresence = joinPresence(username, setOnlineUsers);
      unsubs.push(unsubPresence);
    })();

    return () => {
      unsubs.forEach((fn) => fn());
      leaveChat();
    };
  }, [username, scrollToBottom]);

  // ---- Send ----
  const handleSend = async () => {
    const text = draft.trim();
    if (!text || sending) return;

    setDraft('');
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
      setDraft(text);
      setTimeout(() => setError(null), 3000);
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  // Auto-resize textarea
  const handleDraftChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
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

  const charClass =
    draft.length > MAX_CHARS - 20
      ? draft.length >= MAX_CHARS
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
        Messages cleared daily. Be cool, be kind ✌️
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
            const [g1, g2] = avatarGradient(msg.username);

            // Determine avatar to show
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
                  {/* Avatar — show image if available, otherwise gradient initial */}
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
                          {msg.username.charAt(0).toUpperCase()}
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
                          {isOwn ? 'You' : msg.username}
                        </span>
                        {/* Only show time in meta when NO time separator is visible above */}
                        {!showTimeSep && (
                          <span className="chat-bubble-time">
                            {relativeTime(msg.created_at)}
                          </span>
                        )}
                      </div>
                    )}
                    <div className={`chat-bubble ${msg._optimistic ? 'sending' : ''}`}>
                      {msg.message}
                    </div>
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
        <div className="chat-input-wrap">
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder="Type your message…"
            value={draft}
            onChange={handleDraftChange}
            onKeyDown={handleKeyDown}
            maxLength={MAX_CHARS}
          />
          {draft.length > 0 && (
            <span className={`chat-char-count ${charClass}`}>
              {draft.length}/{MAX_CHARS}
            </span>
          )}
        </div>
        <button
          className="chat-send-btn"
          onClick={handleSend}
          disabled={!draft.trim() || sending}
          title="Send"
        >
          <IoSend />
        </button>
      </div>
    </div>
  );
}
