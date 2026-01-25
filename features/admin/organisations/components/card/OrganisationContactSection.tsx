'use client';

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PencilIcon, CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, Input, Textarea } from "@/components/ui";
import type { OrganisationDetail } from "../../types";

type OrganisationContactSectionProps = {
  organisation: OrganisationDetail;
  onUpdate: (updates: Partial<OrganisationDetail>) => Promise<void>;
};

export function OrganisationContactSection({
  organisation,
  onUpdate,
}: OrganisationContactSectionProps) {
  const t = useTranslations('admin.organisations.contact');
  const [isEditing, setIsEditing] = useState(false);
  const [contactName, setContactName] = useState(organisation.contactName ?? '');
  const [contactEmail, setContactEmail] = useState(organisation.contactEmail ?? '');
  const [contactPhone, setContactPhone] = useState(organisation.contactPhone ?? '');
  const [adminNotes, setAdminNotes] = useState(organisation.adminNotes ?? '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate({
        contactName: contactName || null,
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
        adminNotes: adminNotes || null,
      });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setContactName(organisation.contactName ?? '');
    setContactEmail(organisation.contactEmail ?? '');
    setContactPhone(organisation.contactPhone ?? '');
    setAdminNotes(organisation.adminNotes ?? '');
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">{t('title')}</CardTitle>
        {!isEditing ? (
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
            <PencilIcon className="h-4 w-4" />
          </Button>
        ) : (
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isSaving}>
              <XMarkIcon className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSave} disabled={isSaving}>
              <CheckIcon className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Contact Name */}
        <div>
          <label className="text-xs font-medium text-muted-foreground">{t('primaryContact')}</label>
          {isEditing ? (
            <Input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder={t('namePlaceholder')}
              className="mt-1"
            />
          ) : (
            <p className="text-sm">{organisation.contactName || <span className="text-muted-foreground italic">{t('notSpecified')}</span>}</p>
          )}
        </div>

        {/* Contact Email */}
        <div>
          <label className="text-xs font-medium text-muted-foreground">{t('contactEmail')}</label>
          {isEditing ? (
            <Input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="email@example.com"
              className="mt-1"
            />
          ) : (
            <p className="text-sm">
              {organisation.contactEmail ? (
                <a href={`mailto:${organisation.contactEmail}`} className="text-primary hover:underline">
                  {organisation.contactEmail}
                </a>
              ) : (
                <span className="text-muted-foreground italic">{t('notSpecified')}</span>
              )}
            </p>
          )}
        </div>

        {/* Contact Phone */}
        <div>
          <label className="text-xs font-medium text-muted-foreground">{t('phone')}</label>
          {isEditing ? (
            <Input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="+46 70 123 45 67"
              className="mt-1"
            />
          ) : (
            <p className="text-sm">
              {organisation.contactPhone ? (
                <a href={`tel:${organisation.contactPhone}`} className="text-primary hover:underline">
                  {organisation.contactPhone}
                </a>
              ) : (
                <span className="text-muted-foreground italic">{t('notSpecifiedNeutral')}</span>
              )}
            </p>
          )}
        </div>

        {/* Admin Notes */}
        <div className="pt-2 border-t border-border/40">
          <label className="text-xs font-medium text-muted-foreground">
            {t('internalNote')} <span className="text-amber-600">{t('systemAdminOnly')}</span>
          </label>
          {isEditing ? (
            <Textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder={t('internalNotePlaceholder')}
              className="mt-1"
              rows={3}
            />
          ) : (
            <p className="text-sm mt-1">
              {organisation.adminNotes || <span className="text-muted-foreground italic">{t('noNotes')}</span>}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
