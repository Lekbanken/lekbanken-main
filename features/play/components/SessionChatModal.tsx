'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/features/play/api/chat-api';
import type { SessionChatRole } from '@/features/play/hooks/useSessionChat';
import {
  ChatBubbleLeftRightIcon,
  UserIcon,
  EyeSlashIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline';

export interface SessionChatModalProps {
  open: boolean;
  onClose: () => void;
  role: SessionChatRole;
  messages: ChatMessage[];
  error: string | null;
  sending: boolean;
  onSend: (payload: { 
    message: string; 
    visibility: 'public' | 'host'; 
    anonymous?: boolean;
    recipientParticipantId?: string;
  }) => Promise<void>;
  /** For host: list of participants to enable private replies */
  participants?: Array<{ id: string; displayName: string }>;
}

function formatTimeShort(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

type TabType = 'wall' | 'private';

export function SessionChatModal({
  open,
  onClose,
  role,
  messages,
  error,
  sending,
  onSend,
  participants = [],
}: SessionChatModalProps) {
  const t = useTranslations('play.sessionChatModal');
  const [tab, setTab] = useState<TabType>('wall');
  const [input, setInput] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleClose = () => {
    setInput('');
    setAnonymous(false);
    setTab('wall');
    setSelectedParticipantId(null);
    onClose();
  };

  // Filter messages based on tab
  const visibleMessages = useMemo(() => {
    if (tab === 'wall') {
      return messages.filter((m) => m.visibility === 'public');
    }
    
    // Private tab
    if (role === 'host') {
      // Host sees all private messages, optionally filtered by selected participant
      const hostMessages = messages.filter((m) => m.visibility === 'host');
      if (selectedParticipantId) {
        // Filter to only show messages from/to this participant using participantId
        return hostMessages.filter(m => 
          m.participantId === selectedParticipantId || m.isMine
        );
      }
      return hostMessages;
    }
    
    // Participant sees only their own private messages
    return messages.filter((m) => m.visibility === 'host');
  }, [messages, tab, role, selectedParticipantId]);

  // Group private messages by participant for host view
  const privateConversations = useMemo(() => {
    if (role !== 'host' || tab !== 'private') return [];
    
    const hostMessages = messages.filter((m) => m.visibility === 'host');
    const participantMap = new Map<string, { participantId: string; senderLabel: string; count: number }>();
    
    hostMessages.forEach(m => {
      if (!m.isMine && m.participantId) {
        const existing = participantMap.get(m.participantId);
        if (existing) {
          existing.count++;
        } else {
          participantMap.set(m.participantId, {
            participantId: m.participantId,
            senderLabel: m.senderLabel,
            count: 1,
          });
        }
      }
    });
    
    return Array.from(participantMap.values()).map(entry => ({
      senderLabel: entry.senderLabel,
      unreadCount: entry.count,
      participant: participants.find(p => p.id === entry.participantId) ?? { id: entry.participantId, displayName: entry.senderLabel },
    }));
  }, [messages, role, tab, participants]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    await onSend({
      message: input,
      visibility: tab === 'wall' ? 'public' : 'host',
      anonymous: tab === 'private' && role === 'participant' ? anonymous : undefined,
      recipientParticipantId: tab === 'private' && role === 'host' ? selectedParticipantId ?? undefined : undefined,
    });
    
    setInput('');
    setAnonymous(false);
  };

  const canSendPrivate = role === 'participant' || (role === 'host' && selectedParticipantId);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent
        className="max-w-lg h-[80vh] max-h-[600px] flex flex-col p-0 gap-0 !z-[75]"
        overlayClassName="!z-[75]"
      >
        <DialogHeader className="px-4 py-3 border-b border-border/50 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <ChatBubbleLeftRightIcon className="h-5 w-5" />
            {t('title')}
          </DialogTitle>
        </DialogHeader>

        {/* Tab bar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50 shrink-0 bg-muted/20">
          <Button
            type="button"
            size="sm"
            variant={tab === 'wall' ? 'primary' : 'ghost'}
            onClick={() => {
              setTab('wall');
              setSelectedParticipantId(null);
            }}
            className="gap-1.5"
          >
            <ChatBubbleLeftRightIcon className="h-4 w-4" />
            {t('tabs.wall')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={tab === 'private' ? 'primary' : 'ghost'}
            onClick={() => setTab('private')}
            className="gap-1.5"
          >
            <UserIcon className="h-4 w-4" />
            {t('tabs.private')}
            {role === 'host' && privateConversations.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5">
                {privateConversations.length}
              </Badge>
            )}
          </Button>
          <div className="ml-auto text-xs text-muted-foreground">
            {tab === 'wall' ? t('toAll') : t('toHost')}
          </div>
        </div>

        {/* Host: Participant selector for private messages */}
        {role === 'host' && tab === 'private' && (
          <div className="px-4 py-2 border-b border-border/50 shrink-0 bg-muted/10">
            {privateConversations.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('noPrivateMessages')}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={selectedParticipantId === null ? 'secondary' : 'ghost'}
                  onClick={() => setSelectedParticipantId(null)}
                  className="text-xs"
                >
                  {t('allConversations')}
                </Button>
                {privateConversations.map((conv) => (
                  <Button
                    key={conv.senderLabel}
                    size="sm"
                    variant={selectedParticipantId === conv.participant?.id ? 'secondary' : 'ghost'}
                    onClick={() => setSelectedParticipantId(conv.participant?.id ?? null)}
                    className="text-xs gap-1"
                  >
                    {conv.senderLabel === 'Anonym' && <EyeSlashIcon className="h-3 w-3" />}
                    {conv.senderLabel}
                    <Badge variant="outline" className="ml-1 h-4 min-w-4 px-1 text-[10px]">
                      {conv.unreadCount}
                    </Badge>
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Messages area */}
        <div className="flex-1 overflow-auto px-4 py-3 min-h-0">
          {visibleMessages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-sm text-muted-foreground">{t('noMessages')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleMessages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    'flex flex-col gap-0.5',
                    m.isMine ? 'items-end' : 'items-start'
                  )}
                >
                  <div className={cn(
                    'flex items-center gap-2 text-xs',
                    m.isMine ? 'flex-row-reverse' : 'flex-row'
                  )}>
                    <span className="font-medium text-foreground">
                      {m.isMine ? t('you') : m.senderLabel}
                    </span>
                    {m.visibility === 'host' && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                        {m.senderLabel === 'Anonym' ? (
                          <><EyeSlashIcon className="h-2.5 w-2.5 mr-0.5" />{t('anonymous')}</>
                        ) : (
                          t('private')
                        )}
                      </Badge>
                    )}
                    <span className="text-muted-foreground">{formatTimeShort(m.createdAt)}</span>
                  </div>
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-3 py-2 text-sm',
                      m.isMine
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted rounded-bl-md'
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.message}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-2 text-sm text-destructive bg-destructive/10 border-t border-destructive/20 shrink-0">
            {error}
          </div>
        )}

        {/* Input area */}
        <div className="px-4 py-3 border-t border-border/50 shrink-0 bg-muted/10">
          {/* Anonymous checkbox for participants in private mode */}
          {role === 'participant' && tab === 'private' && (
            <label className="mb-2 flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
                className="rounded border-border"
              />
              <EyeSlashIcon className="h-4 w-4" />
              {t('sendAnonymously')}
            </label>
          )}

          {/* Host private mode: info about replying */}
          {role === 'host' && tab === 'private' && (
            <div className="mb-2 text-xs text-muted-foreground">
              {selectedParticipantId ? (
                <span className="text-primary font-medium">
                  {t('replyingTo', { 
                    name: participants.find(p => p.id === selectedParticipantId)?.displayName ?? t('participant')
                  })}
                </span>
              ) : (
                <span>{t('selectParticipantToReply')}</span>
              )}
            </div>
          )}

          <div className="relative w-full">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={tab === 'wall' ? t('placeholders.public') : t('placeholders.private')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              disabled={sending || (tab === 'private' && !canSendPrivate)}
              className="w-full pr-12"
            />
            <Button
              type="button"
              onClick={() => void handleSend()}
              disabled={sending || !input.trim() || (tab === 'private' && !canSendPrivate)}
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
            >
              <PaperAirplaneIcon className="h-4 w-4" />
              <span className="sr-only">{t('send')}</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
