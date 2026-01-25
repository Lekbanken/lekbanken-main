'use client'

import { useTranslations } from 'next-intl'
import type { ProgressSnapshot } from '../types'

interface ProgressOverviewProps {
  progress: ProgressSnapshot
}

export function ProgressOverview({ progress }: ProgressOverviewProps) {
  const t = useTranslations('gamification')
  const denom = typeof progress.nextLevelXp === 'number' && progress.nextLevelXp > 0 ? progress.nextLevelXp : 1
  const xpPercent = Math.max(0, Math.min(100, Math.round((progress.currentXp / denom) * 100)))

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">{t('yourJourney')}</h2>

      {/* Level indicator */}
      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
          {progress.level}
        </div>
        <div>
          <p className="font-medium text-zinc-900 dark:text-white">
            {t('level')} {progress.level} - {progress.levelName || `${t('level')} ${progress.level}`}
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {progress.currentXp.toLocaleString('sv-SE')} / {progress.nextLevelXp.toLocaleString('sv-SE')} XP
          </p>
        </div>
      </div>

      {/* XP progress bar */}
      <div className="mb-6">
        <div className="mb-1 flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span>{t('progress')}</span>
          <span>{xpPercent}%</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
            style={{ width: `${xpPercent}%` }}
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
          <p className="text-2xl font-bold text-zinc-900 dark:text-white">
            {progress.completedAchievements}/{progress.totalAchievements}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('achievementsLabel')}</p>
        </div>
        <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
          <p className="text-sm font-medium text-zinc-900 dark:text-white">{progress.nextReward}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('nextReward')}</p>
        </div>
      </div>
    </div>
  )
}
