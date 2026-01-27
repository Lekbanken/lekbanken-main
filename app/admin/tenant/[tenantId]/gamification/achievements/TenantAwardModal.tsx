'use client';

import { useState, useTransition, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  GiftIcon,
  UserGroupIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { Button, Input, Textarea } from '@/components/ui';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import type { TenantAchievementRow, TenantMemberRow } from '@/app/actions/tenant-achievements-admin';
import { listTenantMembers, awardTenantAchievement } from '@/app/actions/tenant-achievements-admin';

interface TenantAwardModalProps {
  open: boolean;
  tenantId: string;
  achievement: TenantAchievementRow;
  onClose: () => void;
  onComplete: (inserted: number, duplicates: number) => void;
}

export function TenantAwardModal({
  open,
  tenantId,
  achievement,
  onClose,
  onComplete,
}: TenantAwardModalProps) {
  const t = useTranslations('admin.achievements.award');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  
  // Members
  const [members, setMembers] = useState<TenantMemberRow[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  
  // Selection
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  
  // Message
  const [message, setMessage] = useState('');

  // Load members when modal opens
  useEffect(() => {
    if (!open) return;
    
    setSelectedUserIds(new Set());
    setMessage('');
    setError(null);
    setMemberSearch('');
    
    const loadMembers = async () => {
      setIsLoadingMembers(true);
      try {
        const data = await listTenantMembers(tenantId);
        setMembers(data);
      } catch (err) {
        console.error('Failed to load members:', err);
        setError(t('errors.couldNotLoadMembers'));
      } finally {
        setIsLoadingMembers(false);
      }
    };
    
    loadMembers();
  }, [open, tenantId, t]);

  // Filtered members based on search
  const filteredMembers = memberSearch.trim()
    ? members.filter(
        (m) =>
          m.email?.toLowerCase().includes(memberSearch.toLowerCase()) ||
          m.full_name?.toLowerCase().includes(memberSearch.toLowerCase())
      )
    : members;

  // Selection handlers
  const toggleUser = useCallback((userId: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedUserIds(new Set(filteredMembers.map((m) => m.user_id)));
  }, [filteredMembers]);

  const clearSelection = useCallback(() => {
    setSelectedUserIds(new Set());
  }, []);

  const handleSubmit = async () => {
    setError(null);

    if (selectedUserIds.size === 0) {
      setError(t('errors.selectAtLeastOne'));
      return;
    }

    const userIds = Array.from(selectedUserIds);

    startTransition(async () => {
      try {
        const result = await awardTenantAchievement(tenantId, achievement.id, {
          userIds,
          message: message || undefined,
        });

        if (result.success) {
          onComplete(result.awardedCount ?? 0, result.duplicateCount ?? 0);
        } else {
          setError(result.error || t('errors.couldNotAward'));
        }
      } catch (err) {
        console.error('Award failed:', err);
        setError(t('errors.unexpected'));
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GiftIcon className="h-5 w-5 text-primary" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>
            {t('description', { name: achievement.name })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Member search */}
          <div className="space-y-2">
            <Label>{t('selectRecipients')}</Label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="pl-9"
              />
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={selectAll}
              disabled={filteredMembers.length === 0}
            >
              <CheckIcon className="mr-1 h-3 w-3" />
              {t('selectAll', { count: filteredMembers.length })}
            </Button>
            {selectedUserIds.size > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearSelection}
              >
                <XMarkIcon className="mr-1 h-3 w-3" />
                {t('clearSelection', { count: selectedUserIds.size })}
              </Button>
            )}
          </div>

          {/* Member list */}
          <div className="max-h-60 overflow-y-auto rounded-lg border">
            {isLoadingMembers ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">
                {memberSearch ? t('noMembersMatchSearch') : t('noMembersInOrg')}
              </div>
            ) : (
              <div className="divide-y">
                {filteredMembers.map((member) => (
                  <label
                    key={member.user_id}
                    className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-slate-50"
                  >
                    <Checkbox
                      checked={selectedUserIds.has(member.user_id)}
                      onChange={() => toggleUser(member.user_id)}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-slate-900">
                        {member.full_name || member.email || t('unknownUser')}
                      </div>
                      {member.full_name && member.email && (
                        <div className="truncate text-sm text-slate-500">
                          {member.email}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 capitalize">
                      {member.role || t('member')}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Selection summary */}
          {selectedUserIds.size > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2 text-sm text-primary">
              <UserGroupIcon className="h-4 w-4" />
              <span>{t('usersSelected', { count: selectedUserIds.size })}</span>
            </div>
          )}

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">{t('messageLabel')}</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('messagePlaceholder')}
              rows={2}
              maxLength={1000}
            />
            <p className="text-xs text-slate-500">
              {t('messageHelper')}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            {t('cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || selectedUserIds.size === 0}
          >
            {isPending ? t('awarding') : t('awardToUsers', { count: selectedUserIds.size })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
