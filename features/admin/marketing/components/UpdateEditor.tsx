'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  XMarkIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Textarea, Label, Badge } from '@/components/ui';
import type { MarketingUpdate } from '@/lib/marketing/types';
import type { UpdateFormData } from '../types';
import { EMPTY_UPDATE_FORM } from '../types';
import {
  UPDATE_TYPE_OPTIONS,
  STATUS_OPTIONS,
} from '@/lib/marketing/types';

interface UpdateEditorProps {
  update: MarketingUpdate | null;
  onSave: (data: UpdateFormData) => void;
  onCancel: () => void;
  isPending?: boolean;
}

export function UpdateEditor({ update, onSave, onCancel, isPending }: UpdateEditorProps) {
  const t = useTranslations('admin.nav.marketingAdmin');
  
  // Initialize form data from update prop using useMemo
  const initialFormData = useMemo<UpdateFormData>(() => {
    if (update) {
      return {
        type: update.type,
        title: update.title,
        body: update.body || '',
        imageUrl: update.imageUrl || '',
        tags: update.tags,
        publishedAt: update.publishedAt ? update.publishedAt.toISOString().slice(0, 16) : '',
        status: update.status,
      };
    }
    return EMPTY_UPDATE_FORM;
  }, [update]);
  
  const [formData, setFormData] = useState<UpdateFormData>(initialFormData);
  const [tagInput, setTagInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag),
    }));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{update ? t('editUpdate') : t('newUpdate')}</CardTitle>
          <Button variant="ghost" size="sm" className="p-1.5" onClick={onCancel}>
            <XMarkIcon className="h-5 w-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type */}
          <div className="space-y-2">
            <Label htmlFor="type">{t('type')} *</Label>
            <select
              id="type"
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as typeof formData.type }))}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {UPDATE_TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">{t('title')} *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder={t('titlePlaceholderUpdate')}
              required
            />
          </div>

          {/* Body */}
          <div className="space-y-2">
            <Label htmlFor="body">{t('body')}</Label>
            <Textarea
              id="body"
              value={formData.body}
              onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
              placeholder={t('descriptionPlaceholder')}
              rows={4}
            />
          </div>

          {/* Image URL */}
          <div className="space-y-2">
            <Label htmlFor="imageUrl">{t('imageUrl')}</Label>
            <Input
              id="imageUrl"
              value={formData.imageUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
              placeholder="https://..."
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>{t('tags')}</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder={t('addTagPlaceholder')}
              />
              <Button type="button" variant="outline" onClick={handleAddTag}>
                {t('addTag')}
              </Button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {formData.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    {tag}
                    <XMarkIcon className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Publishing */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="publishedAt">{t('publishedAt')}</Label>
              <Input
                id="publishedAt"
                type="datetime-local"
                value={formData.publishedAt}
                onChange={(e) => setFormData(prev => ({ ...prev, publishedAt: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">{t('status')}</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as typeof formData.status }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={isPending || !formData.title}>
              <CheckIcon className="h-4 w-4 mr-2" />
              {t('save')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
