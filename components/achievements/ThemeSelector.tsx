'use client'

import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { THEME_PRESETS } from './themes'
import { useAchievementBuilderStore } from './store'

export function ThemeSelector() {
  const t = useTranslations('achievements')
  const currentTheme = useAchievementBuilderStore((s) => s.state.theme)
  const setTheme = useAchievementBuilderStore((s) => s.setTheme)

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {THEME_PRESETS.map((theme) => {
          const isActive = theme.id === currentTheme
          return (
            <button
              key={theme.id}
              onClick={() => setTheme(theme.id)}
              className={cn(
                'group relative flex flex-col items-center gap-2 rounded-xl p-3 transition-all duration-200',
                'border-2 hover:scale-105 hover:shadow-md',
                isActive
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border bg-card hover:border-muted-foreground/30'
              )}
              title={theme.label}
            >
              {/* Color preview */}
              <div className="flex gap-1">
                <div
                  className="h-6 w-6 rounded-full shadow-sm ring-1 ring-black/10"
                  style={{ backgroundColor: theme.colors.primary }}
                />
                <div
                  className="h-6 w-6 rounded-full shadow-sm ring-1 ring-black/10"
                  style={{ backgroundColor: theme.colors.secondary }}
                />
                <div
                  className="h-6 w-6 rounded-full shadow-sm ring-1 ring-black/10"
                  style={{ backgroundColor: theme.colors.accent }}
                />
              </div>
              
              {/* Label */}
              <span
                className={cn(
                  'text-xs font-medium',
                  isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                )}
              >
                {theme.label}
              </span>

              {/* Active indicator */}
              {isActive && (
                <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white shadow-sm">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Theme details */}
      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <div className="mb-2 text-xs font-medium text-muted-foreground">{t('themeColors.title')}</div>
        <div className="flex items-center gap-3">
          {THEME_PRESETS.find((th) => th.id === currentTheme) && (
            <>
              <div className="flex items-center gap-1.5">
                <div
                  className="h-4 w-4 rounded-full ring-1 ring-black/10"
                  style={{
                    backgroundColor: THEME_PRESETS.find((th) => th.id === currentTheme)!.colors.primary,
                  }}
                />
                <span className="text-xs text-muted-foreground">{t('themeColors.primary')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div
                  className="h-4 w-4 rounded-full ring-1 ring-black/10"
                  style={{
                    backgroundColor: THEME_PRESETS.find((th) => th.id === currentTheme)!.colors.secondary,
                  }}
                />
                <span className="text-xs text-muted-foreground">{t('themeColors.secondary')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div
                  className="h-4 w-4 rounded-full ring-1 ring-black/10"
                  style={{
                    backgroundColor: THEME_PRESETS.find((th) => th.id === currentTheme)!.colors.accent,
                  }}
                />
                <span className="text-xs text-muted-foreground">{t('themeColors.accent')}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
