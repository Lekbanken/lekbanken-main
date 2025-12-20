'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getSessionChatMessages,
  sendSessionChatMessage,
  type ChatMessage,
} from '@/features/play/api/chat-api';

export type SessionChatRole = 'host' | 'participant';

export interface UseSessionChatOptions {
  sessionId: string;
  role: SessionChatRole;
  participantToken?: string;
  isOpen: boolean;
  enabled?: boolean;
  pollIntervalOpenMs?: number;
  pollIntervalClosedMs?: number;
  maxMessages?: number;
}

export interface UseSessionChatResult {
  messages: ChatMessage[];
  unreadCount: number;
  error: string | null;
  sending: boolean;
  send: (payload: { message: string; visibility: 'public' | 'host'; anonymous?: boolean }) => Promise<void>;
  markAllRead: () => void;
}

function makeLastReadKey(sessionId: string, role: SessionChatRole, participantToken?: string) {
  // Keep stable across reloads and (best-effort) per participant.
  const tokenPart = participantToken ? participantToken.slice(0, 12) : 'host';
  return `lekbanken_chat_lastread_${sessionId}_${role}_${tokenPart}`;
}

export function useSessionChat({
  sessionId,
  role,
  participantToken,
  isOpen,
  enabled = true,
  pollIntervalOpenMs = 2000,
  pollIntervalClosedMs = 5000,
  maxMessages = 200,
}: UseSessionChatOptions): UseSessionChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const lastReadKey = useMemo(() => makeLastReadKey(sessionId, role, participantToken), [sessionId, role, participantToken]);
  const lastReadAtRef = useRef<string | null>(null);

  const latestTimestamp = useMemo(() => {
    if (messages.length === 0) return undefined;
    return messages[messages.length - 1]?.createdAt;
  }, [messages]);

  // Init lastReadAt from sessionStorage
  useEffect(() => {
    if (!enabled) return;
    try {
      const v = window.sessionStorage.getItem(lastReadKey);
      lastReadAtRef.current = v && typeof v === 'string' ? v : null;
    } catch {
      lastReadAtRef.current = null;
    }
  }, [enabled, lastReadKey]);

  const persistLastReadAt = useCallback((iso: string) => {
    lastReadAtRef.current = iso;
    try {
      window.sessionStorage.setItem(lastReadKey, iso);
    } catch {
      // ignore
    }
  }, [lastReadKey]);

  const markAllRead = useCallback(() => {
    const last = latestTimestamp;
    if (!last) {
      setUnreadCount(0);
      return;
    }
    persistLastReadAt(last);
    setUnreadCount(0);
  }, [latestTimestamp, persistLastReadAt]);

  const mergeMessages = useCallback((incoming: ChatMessage[]) => {
    if (incoming.length === 0) return;
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const next = [...prev];
      for (const m of incoming) {
        if (!seen.has(m.id)) next.push(m);
      }
      return next.slice(-maxMessages);
    });
  }, [maxMessages]);

  const fetchInitial = useCallback(async () => {
    if (!enabled) return;
    if (!sessionId) return;
    if (role === 'participant' && !participantToken) return;

    try {
      const initial = await getSessionChatMessages(sessionId, {
        participantToken: role === 'participant' ? participantToken : undefined,
      });
      setMessages(initial.slice(-maxMessages));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte ladda chatten');
    }
  }, [enabled, sessionId, role, participantToken, maxMessages]);

  useEffect(() => {
    void fetchInitial();
  }, [fetchInitial]);

  // Poll for new messages
  useEffect(() => {
    if (!enabled) return;
    if (!sessionId) return;
    if (role === 'participant' && !participantToken) return;

    const intervalMs = isOpen ? pollIntervalOpenMs : pollIntervalClosedMs;

    const handle = window.setInterval(async () => {
      try {
        const incoming = await getSessionChatMessages(sessionId, {
          participantToken: role === 'participant' ? participantToken : undefined,
          since: latestTimestamp,
        });

        if (incoming.length > 0) {
          mergeMessages(incoming);
        }
      } catch {
        // best-effort polling
      }
    }, intervalMs);

    return () => window.clearInterval(handle);
  }, [enabled, sessionId, role, participantToken, isOpen, pollIntervalOpenMs, pollIntervalClosedMs, latestTimestamp, mergeMessages]);

  // Update unread count
  useEffect(() => {
    if (!enabled) return;

    if (isOpen) {
      setUnreadCount(0);
      const last = latestTimestamp;
      if (last) persistLastReadAt(last);
      return;
    }

    const lastReadAt = lastReadAtRef.current;
    if (!lastReadAt) {
      setUnreadCount(messages.length);
      return;
    }

    const lastReadMs = new Date(lastReadAt).getTime();
    const unread = messages.filter((m) => new Date(m.createdAt).getTime() > lastReadMs).length;
    setUnreadCount(unread);
  }, [enabled, isOpen, messages, latestTimestamp, persistLastReadAt]);

  const send = useCallback(async (payload: { message: string; visibility: 'public' | 'host'; anonymous?: boolean }) => {
    if (!enabled) return;
    if (role === 'participant' && !participantToken) return;

    const trimmed = payload.message.trim();
    if (!trimmed) return;

    setSending(true);
    setError(null);
    try {
      await sendSessionChatMessage(
        sessionId,
        {
          message: trimmed,
          visibility: role === 'host' ? 'public' : payload.visibility,
          anonymous: role === 'participant' && payload.visibility === 'host' ? Boolean(payload.anonymous) : false,
        },
        { participantToken: role === 'participant' ? participantToken : undefined }
      );

      // Pull immediately
      const incoming = await getSessionChatMessages(sessionId, {
        participantToken: role === 'participant' ? participantToken : undefined,
        since: latestTimestamp,
      });
      mergeMessages(incoming);

      // If drawer is open, keep read marker current
      if (isOpen) {
        const newest = incoming.length > 0 ? incoming[incoming.length - 1]?.createdAt : latestTimestamp;
        if (newest) persistLastReadAt(newest);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte skicka meddelandet');
    } finally {
      setSending(false);
    }
  }, [enabled, role, participantToken, sessionId, latestTimestamp, mergeMessages, isOpen, persistLastReadAt]);

  return {
    messages,
    unreadCount,
    error,
    sending,
    send,
    markAllRead,
  };
}
