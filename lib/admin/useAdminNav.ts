'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import type { AdminNavCategory, AdminNavItem } from './nav';
import { ADMIN_NAV } from './nav';

/**
 * Translated versions of nav types with resolved labels
 */
export interface TranslatedAdminNavItem extends Omit<AdminNavItem, 'labelKey'> {
  label: string;
  labelKey: string;
}

export interface TranslatedAdminNavCategory extends Omit<AdminNavCategory, 'labelKey' | 'items'> {
  label: string;
  labelKey: string;
  items: TranslatedAdminNavItem[];
}

export interface TranslatedAdminNavConfig {
  system: TranslatedAdminNavCategory[];
  organisation: TranslatedAdminNavCategory[];
}

/**
 * Hook that returns admin navigation with translated labels
 * 
 * Uses the admin.nav and admin.navGroups namespaces from messages
 */
export function useAdminNav(): TranslatedAdminNavConfig {
  const tNav = useTranslations('admin.nav');
  const tGroups = useTranslations('admin.navGroups');

  return useMemo(() => {
    const translateItem = (item: AdminNavItem): TranslatedAdminNavItem => ({
      ...item,
      label: tNav(item.labelKey),
    });

    const translateCategory = (category: AdminNavCategory): TranslatedAdminNavCategory => ({
      ...category,
      label: tGroups(category.labelKey),
      items: category.items.map(translateItem),
    });

    return {
      system: ADMIN_NAV.system.map(translateCategory),
      organisation: ADMIN_NAV.organisation.map(translateCategory),
    };
  }, [tNav, tGroups]);
}

/**
 * Helper to translate a single nav item
 */
export function useTranslatedNavItem() {
  const tNav = useTranslations('admin.nav');
  
  return useMemo(() => ({
    translate: (labelKey: string) => tNav(labelKey),
  }), [tNav]);
}

/**
 * Helper to translate nav group labels
 */
export function useTranslatedNavGroup() {
  const tGroups = useTranslations('admin.navGroups');
  
  return useMemo(() => ({
    translate: (labelKey: string) => tGroups(labelKey),
  }), [tGroups]);
}
