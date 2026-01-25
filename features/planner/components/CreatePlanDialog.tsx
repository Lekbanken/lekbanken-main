'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface CreatePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string, description: string) => Promise<void>;
  isSubmitting?: boolean;
}

interface CreatePlanFormProps {
  onSubmit: (name: string, description: string) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

function CreatePlanForm({ onSubmit, onCancel, isSubmitting }: CreatePlanFormProps) {
  const t = useTranslations('planner.wizard.createDialog');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onSubmit(name.trim(), description.trim());
  };

  const canSubmit = name.trim().length > 0 && !isSubmitting;

  return (
    <form onSubmit={(e) => void handleSubmit(e)}>
      <DialogHeader>
        <DialogTitle>{t('title')}</DialogTitle>
        <DialogDescription>{t('description')}</DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="plan-name">{t('nameLabel')} *</Label>
          <Input
            id="plan-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('namePlaceholder')}
            autoFocus
            disabled={isSubmitting}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="plan-description">{t('descriptionLabel')}</Label>
          <Textarea
            id="plan-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('descriptionPlaceholder')}
            rows={3}
            disabled={isSubmitting}
          />
        </div>
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          {t('cancelButton')}
        </Button>
        <Button type="submit" disabled={!canSubmit}>
          {isSubmitting ? t('creating') : t('createButton')}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function CreatePlanDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
}: CreatePlanDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {/* Key prop ensures form resets when dialog opens */}
        <CreatePlanForm
          key={open ? 'open' : 'closed'}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
          isSubmitting={isSubmitting}
        />
      </DialogContent>
    </Dialog>
  );
}
