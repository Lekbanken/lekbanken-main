'use client';

import { useState, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  XMarkIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Textarea, Label, Badge } from '@/components/ui';
import type { MarketingFeature } from '@/lib/marketing/types';
import type { FeatureFormData } from '../types';
import { EMPTY_FEATURE_FORM } from '../types';
import {
  AUDIENCE_OPTIONS,
  USE_CASE_OPTIONS,
  CONTEXT_OPTIONS,
  STATUS_OPTIONS,
} from '@/lib/marketing/types';

interface FeatureEditorProps {
  feature: MarketingFeature | null;
  onSave: (data: FeatureFormData) => void;
  onCancel: () => void;
  isPending?: boolean;
}

export function FeatureEditor({ feature, onSave, onCancel, isPending }: FeatureEditorProps) {
  const t = useTranslations('admin.nav.marketingAdmin');
  
  // Initialize form data from feature prop using useMemo
  const initialFormData = useMemo<FeatureFormData>(() => {
    if (feature) {
      return {
        title: feature.title,
        subtitle: feature.subtitle || '',
        description: feature.description || '',
        iconName: feature.iconName || '',
        imageUrl: feature.imageUrl || '',
        audience: feature.audience,
        useCase: feature.useCase,
        context: feature.context,
        tags: feature.tags,
        relatedGamesCount: feature.relatedGamesCount,
        priority: feature.priority,
        isFeatured: feature.isFeatured,
        status: feature.status,
      };
    }
    return EMPTY_FEATURE_FORM;
  }, [feature]);
  
  const [formData, setFormData] = useState<FeatureFormData>(initialFormData);
  const [tagInput, setTagInput] = useState('');

  // Sync form data when feature prop changes (e.g., when switching between features)
  useEffect(() => {
    setFormData(initialFormData);
    setTagInput('');
  }, [initialFormData]);

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
          <CardTitle>{feature ? t('editFeature') : t('newFeature')}</CardTitle>
          <Button variant="ghost" size="sm" className="p-1.5" onClick={onCancel}>
            <XMarkIcon className="h-5 w-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">{t('title')} *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="T.ex. Smarta filter"
              required
            />
          </div>

          {/* Subtitle */}
          <div className="space-y-2">
            <Label htmlFor="subtitle">{t('subtitle')}</Label>
            <Input
              id="subtitle"
              value={formData.subtitle}
              onChange={(e) => setFormData(prev => ({ ...prev, subtitle: e.target.value }))}
              placeholder={t('subtitlePlaceholder')}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">{t('description')}</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder={t('descriptionPlaceholder')}
              rows={3}
            />
          </div>

          {/* Icon & Image */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="iconName">{t('iconName')}</Label>
              <Input
                id="iconName"
                value={formData.iconName}
                onChange={(e) => setFormData(prev => ({ ...prev, iconName: e.target.value }))}
                placeholder="funnel, layout-grid..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="imageUrl">{t('imageUrl')}</Label>
              <Input
                id="imageUrl"
                value={formData.imageUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Filter dimensions */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="audience">{t('audience')}</Label>
              <select
                id="audience"
                value={formData.audience}
                onChange={(e) => setFormData(prev => ({ ...prev, audience: e.target.value as typeof formData.audience }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {AUDIENCE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="useCase">{t('useCase')}</Label>
              <select
                id="useCase"
                value={formData.useCase}
                onChange={(e) => setFormData(prev => ({ ...prev, useCase: e.target.value as typeof formData.useCase }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {USE_CASE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="context">{t('context')}</Label>
              <select
                id="context"
                value={formData.context}
                onChange={(e) => setFormData(prev => ({ ...prev, context: e.target.value as typeof formData.context }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {CONTEXT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
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

          {/* Meta */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="relatedGamesCount">{t('relatedGamesCount')}</Label>
              <Input
                id="relatedGamesCount"
                type="number"
                min={0}
                value={formData.relatedGamesCount}
                onChange={(e) => setFormData(prev => ({ ...prev, relatedGamesCount: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">{t('priority')}</Label>
              <Input
                id="priority"
                type="number"
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
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

          {/* Featured toggle */}
          <div className="flex items-center gap-2">
            <input
              id="isFeatured"
              type="checkbox"
              checked={formData.isFeatured}
              onChange={(e) => setFormData(prev => ({ ...prev, isFeatured: e.target.checked }))}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="isFeatured">{t('isFeatured')}</Label>
          </div>

          {/* Role visibility checkboxes */}
          <div className="space-y-2">
            <Label>{t('roleVisibility')}</Label>
            <p className="text-xs text-muted-foreground">{t('roleVisibilityDescription')}</p>
            <div className="flex flex-wrap gap-4 mt-2">
              <div className="flex items-center gap-2">
                <input
                  id="role-admin"
                  type="checkbox"
                  checked={formData.tags.includes('admin')}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData(prev => ({ ...prev, tags: [...prev.tags.filter(t => t !== 'admin'), 'admin'] }));
                    } else {
                      setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== 'admin') }));
                    }
                  }}
                  className="h-4 w-4 rounded border-input"
                />
                <Label htmlFor="role-admin">Admin</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="role-leader"
                  type="checkbox"
                  checked={formData.tags.includes('leader')}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData(prev => ({ ...prev, tags: [...prev.tags.filter(t => t !== 'leader'), 'leader'] }));
                    } else {
                      setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== 'leader') }));
                    }
                  }}
                  className="h-4 w-4 rounded border-input"
                />
                <Label htmlFor="role-leader">{t('roleLeader')}</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="role-participant"
                  type="checkbox"
                  checked={formData.tags.includes('participant')}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData(prev => ({ ...prev, tags: [...prev.tags.filter(t => t !== 'participant'), 'participant'] }));
                    } else {
                      setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== 'participant') }));
                    }
                  }}
                  className="h-4 w-4 rounded border-input"
                />
                <Label htmlFor="role-participant">{t('roleParticipant')}</Label>
              </div>
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
