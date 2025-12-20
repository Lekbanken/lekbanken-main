'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/features/play/api/chat-api';
import type { SessionChatRole } from '@/features/play/hooks/useSessionChat';

export interface SessionChatDrawerProps {
  open: boolean;
  onClose: () => void;
  role: SessionChatRole;
  messages: ChatMessage[];
  error: string | null;
  sending: boolean;
  onSend: (payload: { message: string; visibility: 'public' | 'host'; anonymous?: boolean }) => Promise<void>;
}

function formatTimeShort(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function SessionChatDrawer({
  open,
  onClose,
  role,
  messages,
  error,
  sending,
  onSend,
}: SessionChatDrawerProps) {
  const [tab, setTab] = useState<'public' | 'host'>('public');
  const [input, setInput] = useState('');
  const [anonymous, setAnonymous] = useState(false);

  const handleClose = () => {
    setInput('');
    setAnonymous(false);
    setTab('public');
    onClose();
  };

  const visibleMessages = useMemo(() => {
    return messages.filter((m) => (tab === 'public' ? m.visibility === 'public' : m.visibility === 'host'));
  }, [messages, tab]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[75]">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} aria-hidden="true" />

      <div
        className={cn(
          'absolute inset-x-0 bottom-0 max-h-[85vh] overflow-hidden rounded-t-2xl bg-background shadow-lg',
          'lg:inset-y-0 lg:right-0 lg:left-auto lg:bottom-auto lg:max-h-none lg:w-[420px] lg:rounded-none lg:rounded-l-2xl',
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Chatt"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="text-sm font-semibold text-foreground">Chatt</div>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            Stäng
          </Button>
        </div>

        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Button
            type="button"
            size="sm"
            variant={tab === 'public' ? 'primary' : 'outline'}
            onClick={() => setTab('public')}
          >
            Vägg
          </Button>
          <Button
            type="button"
            size="sm"
            variant={tab === 'host' ? 'primary' : 'outline'}
            onClick={() => setTab('host')}
          >
            Privat
          </Button>
          <div className="ml-auto text-xs text-muted-foreground">
            {tab === 'public' ? 'Till alla' : role === 'host' ? 'Till lekledare' : 'Till lekledare'}
          </div>
        </div>

        <div className="flex min-h-0 flex-col">
          <div className="min-h-0 flex-1 overflow-auto px-4 py-3">
            {visibleMessages.length === 0 ? (
              <p className="text-sm text-muted-foreground">Inga meddelanden ännu.</p>
            ) : (
              <div className="space-y-3">
                {visibleMessages.map((m) => (
                  <div key={m.id} className={cn('text-sm', m.isMine ? 'text-right' : 'text-left')}>
                    <div className={cn('flex items-center gap-2', m.isMine ? 'justify-end' : 'justify-start')}>
                      {!m.isMine && <span className="font-medium text-foreground">{m.senderLabel}</span>}
                      {m.visibility === 'host' && <Badge variant="secondary">Privat</Badge>}
                      <span className="text-xs text-muted-foreground">{formatTimeShort(m.createdAt)}</span>
                      {m.isMine && <span className="font-medium text-foreground">Du</span>}
                    </div>
                    <p className="text-muted-foreground whitespace-pre-wrap">{m.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="border-t border-border px-4 py-2 text-sm text-destructive">{error}</div>
          )}

          <div className="border-t border-border px-4 py-3">
            {role === 'participant' && tab === 'host' && (
              <label className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={anonymous}
                  onChange={(e) => setAnonymous(e.target.checked)}
                />
                Skicka anonymt
              </label>
            )}

            {role === 'host' && tab === 'host' && (
              <Card className="mb-3 p-3">
                <p className="text-sm text-muted-foreground">
                  Privat-chatten är till för deltagare → lekledare. Du kan svara på väggen.
                </p>
              </Card>
            )}

            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={tab === 'public' ? 'Skriv till alla…' : 'Skriv privat till lekledaren…'}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void onSend({ message: input, visibility: tab, anonymous });
                    setInput('');
                    setAnonymous(false);
                  }
                }}
                disabled={sending || (role === 'host' && tab === 'host')}
              />
              <Button
                type="button"
                onClick={() => {
                  void onSend({ message: input, visibility: tab, anonymous });
                  setInput('');
                  setAnonymous(false);
                }}
                disabled={sending || (role === 'host' && tab === 'host')}
              >
                Skicka
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
