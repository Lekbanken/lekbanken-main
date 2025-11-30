# Design Consistency TODO

> **Audit Date:** 2024-11-30  
> **Last Updated:** 2025-01-27
> **Status:** 🟢 App Pages Complete  
> **Audited by:** Claude Opus 4.5

## Overview

This document tracks all files that need to be updated to use consistent design tokens instead of hardcoded Tailwind color classes.

### Design Token Reference

| Old (Hardcoded) | New (Semantic Token) | Usage |
|-----------------|---------------------|-------|
| `text-gray-900` | `text-foreground` | Primary text |
| `text-slate-900` | `text-foreground` | Primary text |
| `text-gray-600`, `text-gray-700` | `text-muted-foreground` | Secondary text |
| `text-slate-600`, `text-slate-700` | `text-muted-foreground` | Secondary text |
| `text-gray-400`, `text-gray-500` | `text-muted-foreground` | Tertiary/placeholder text |
| `text-slate-400`, `text-slate-500` | `text-muted-foreground` | Tertiary/placeholder text |
| `bg-gray-50`, `bg-gray-100` | `bg-muted` | Subtle backgrounds |
| `bg-slate-50`, `bg-slate-100` | `bg-muted` | Subtle backgrounds |
| `bg-gray-200` | `bg-muted` | Skeleton/placeholder |
| `border-gray-*` | `border-border` | Borders |
| `border-slate-*` | `border-border` | Borders |
| `text-indigo-*` | `text-primary` | Brand/action text |
| `bg-indigo-*` | `bg-primary` | Brand/action backgrounds |
| `hover:bg-indigo-*` | `hover:bg-primary/90` | Hover states |
| `ring-indigo-*` | `ring-primary` | Focus rings |

---

## ✅ High Priority - App Pages (User-facing) - COMPLETED

These files are seen by end users and have been fixed.

### 1. `app/app/games/page.tsx` ✅
- [x] All gray-* classes replaced with design tokens

### 2. `app/app/games/[gameId]/page.tsx` ✅
- [x] All gray/indigo classes replaced with design tokens

### 3. `app/app/leaderboard/page.tsx` ✅
- [x] All gray-* classes replaced with design tokens

### 4. `app/app/profile/page.tsx` ✅
- [x] All gray-* classes replaced with design tokens

### 5. `app/app/profile/friends/page.tsx` ✅
- [x] All slate-* classes replaced with design tokens
- [x] Border colors replaced with border-border
- [x] Button colors replaced with bg-primary

### 6. `app/app/support/page.tsx` ✅
- [x] All gray-* classes replaced with design tokens

### 7. `app/app/subscription/page.tsx` ✅
- [x] All gray-* classes replaced with design tokens

### 8. `app/app/notifications/page.tsx` ✅
- [x] All gray-* classes replaced with design tokens

### 9. `app/app/shop/page.tsx` ✅
- [x] All gray-* classes replaced with design tokens

### 10. `app/app/challenges/page.tsx` ✅
- [x] All gray-* classes replaced with design tokens

### 11. `app/app/events/page.tsx` ✅
- [x] All gray-* classes replaced with design tokens

### 12. `app/app/preferences/page.tsx` ✅
- [x] All gray-* classes replaced with design tokens

---

## ⏸️ Admin Pages (Skip for now)

> **Note:** Admin pages will be rebuilt from the sandbox implementation, so we skip fixing these for now.

### Files to fix later (during Admin Implementation phase):
- `app/admin/content/page.tsx`
- `app/admin/billing/page.tsx`
- `app/admin/notifications/page.tsx`
- `app/admin/marketplace/page.tsx`
- `app/admin/moderation/page.tsx`
- `app/admin/achievements-advanced/page.tsx`
- `app/admin/personalization/page.tsx`

---

## ✅ Marketing & Auth - COMPLETED

### 1. `app/(marketing)/auth/reset-password/page.tsx` ✅
- [x] All gray/blue classes replaced with design tokens
- Note: Has minor lint warning about apostrophe escaping

---

## ✅ Components - COMPLETED

### 1. `components/GameCard.tsx` ✅
- [x] All indigo-* classes replaced with text-primary
- [x] All gray-* classes replaced with design tokens

---

## ⚪ Sandbox Pages (Optional)

Sandbox pages are for demo/development purposes. They MAY use hardcoded colors for demonstration, but ideally should also follow design tokens for consistency.

### Files to review:
- `app/sandbox/layout.tsx` - `bg-gray-50` → `bg-background`
- `app/sandbox/admin/users/page.tsx`
- `app/sandbox/admin/support/page.tsx`
- `app/sandbox/admin/settings/page.tsx`
- `app/sandbox/app/shop/page.tsx`
- `app/sandbox/app/profile/page.tsx`

---

## ✅ Already Consistent

These files/components are using design tokens correctly:

- `components/ui/button.tsx` ✅
- `components/ui/badge.tsx` ✅
- `components/ui/card.tsx` ✅
- `components/ui/input.tsx` ✅
- `components/ui/textarea.tsx` ✅
- `components/ui/select.tsx` ✅
- `components/ui/alert.tsx` ✅
- `components/ui/toast.tsx` ✅
- `components/ui/dialog.tsx` ✅
- `components/ui/dropdown-menu.tsx` ✅
- `components/ui/avatar.tsx` ✅
- `components/ui/breadcrumbs.tsx` ✅
- `components/ui/tabs.tsx` ✅
- `components/ui/empty-state.tsx` ✅
- `components/ui/error-state.tsx` ✅
- `components/ui/loading-spinner.tsx` ✅
- `components/ui/skeleton.tsx` ✅
- `app/admin/components/sidebar.tsx` ✅
- `app/admin/components/topbar.tsx` ✅
- `app/admin/layout-client.tsx` ✅
- `app/app/layout-client.tsx` ✅
- `components/app/AppShell.tsx` ✅
- `components/app/SideNav.tsx` ✅
- `components/app/BottomNav.tsx` ✅
- `components/app/PageHeader.tsx` ✅

---

## 📝 Notes for Implementation

### Quick Find & Replace Patterns

```
# Text colors
text-gray-900 → text-foreground
text-gray-800 → text-foreground
text-gray-700 → text-muted-foreground
text-gray-600 → text-muted-foreground
text-gray-500 → text-muted-foreground
text-gray-400 → text-muted-foreground
text-gray-300 → text-muted-foreground

text-slate-900 → text-foreground
text-slate-800 → text-foreground
text-slate-700 → text-muted-foreground
text-slate-600 → text-muted-foreground
text-slate-500 → text-muted-foreground
text-slate-400 → text-muted-foreground
text-slate-300 → text-muted-foreground

# Background colors
bg-gray-50 → bg-muted
bg-gray-100 → bg-muted
bg-gray-200 → bg-muted
bg-slate-50 → bg-muted
bg-slate-100 → bg-muted
bg-slate-200 → bg-muted

# Borders
border-gray-100 → border-border
border-gray-200 → border-border
border-gray-300 → border-border
border-slate-200 → border-border
border-slate-300 → border-border

# Brand colors
text-indigo-600 → text-primary
text-indigo-700 → text-primary
text-indigo-800 → text-primary
bg-indigo-600 → bg-primary
bg-indigo-100 → bg-primary/10
hover:bg-indigo-500 → hover:bg-primary/90
hover:bg-indigo-700 → hover:bg-primary/90
```

### Context-Aware Replacements

Some replacements need context:
- Loading skeletons: `bg-gray-200` → Use `<Skeleton />` component
- Empty states: Consider using `<EmptyState />` component
- Error states: Consider using `<ErrorState />` component
- Hover states on list items: `hover:bg-gray-50` → `hover:bg-muted`

---

## Progress Tracker

| Category | Total Files | Fixed | Remaining |
|----------|-------------|-------|-----------|
| App Pages | 12 | 0 | 12 |
| Admin Pages | 7 | 0 | 7 |
| Marketing/Auth | 1 | 0 | 1 |
| Components | 1 | 0 | 1 |
| Sandbox | 6 | 0 | 6 |
| **Total** | **27** | **0** | **27** |

---

## Next Steps

1. Start with `components/GameCard.tsx` - used across the app
2. Fix app pages in order of user traffic
3. Fix admin pages
4. Update marketing/auth pages
5. Optionally update sandbox pages

---

*Last updated: 2024-11-30*
