'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button, Card, CardContent, Badge } from '@/components/ui'
import {
  TrophyIcon,
  FireIcon,
  UserGroupIcon,
  ClockIcon,
  CheckCircleIcon,
  ChartBarIcon,
  BoltIcon,
  StarIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline'
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid'

// Types
interface Challenge {
  id: string
  title: string
  description: string
  type: 'daily' | 'weekly' | 'special' | 'community'
  difficulty: 'easy' | 'medium' | 'hard'
  reward: number
  rewardType: 'xp' | 'coins' | 'badge'
  progress: number
  maxProgress: number
  participants?: number
  timeRemaining?: string
  isJoined?: boolean
  isCompleted?: boolean
}

// Mock data
const mockChallenges: Challenge[] = [
  {
    id: '1',
    title: 'Daglig utmaning: 3 lekar',
    description: 'Genomför minst 3 olika lekar idag',
    type: 'daily',
    difficulty: 'easy',
    reward: 50,
    rewardType: 'xp',
    progress: 2,
    maxProgress: 3,
    timeRemaining: '8 timmar',
    isJoined: true,
  },
  {
    id: '2',
    title: 'Veckoutmaning: Utforskaren',
    description: 'Prova 10 nya lekar du aldrig testat förut',
    type: 'weekly',
    difficulty: 'medium',
    reward: 200,
    rewardType: 'xp',
    progress: 4,
    maxProgress: 10,
    timeRemaining: '4 dagar',
    isJoined: true,
  },
  {
    id: '3',
    title: 'Gemenskapsutmaning: 1000 lekar',
    description: 'Tillsammans ska vi nå 1000 genomförda lekar',
    type: 'community',
    difficulty: 'hard',
    reward: 500,
    rewardType: 'coins',
    progress: 743,
    maxProgress: 1000,
    participants: 156,
    timeRemaining: '2 dagar',
    isJoined: true,
  },
  {
    id: '4',
    title: 'Specialutmaning: Vintertema',
    description: 'Genomför 5 vinter-temade aktiviteter',
    type: 'special',
    difficulty: 'medium',
    reward: 1,
    rewardType: 'badge',
    progress: 0,
    maxProgress: 5,
    timeRemaining: '6 dagar',
    isJoined: false,
  },
  {
    id: '5',
    title: 'Daglig utmaning: Samarbete',
    description: 'Genomför en gruppaktivitet med minst 5 deltagare',
    type: 'daily',
    difficulty: 'easy',
    reward: 30,
    rewardType: 'xp',
    progress: 1,
    maxProgress: 1,
    isCompleted: true,
    isJoined: true,
  },
]

function getDifficultyVariant(difficulty: string) {
  switch (difficulty) {
    case 'easy':
      return 'success'
    case 'medium':
      return 'warning'
    case 'hard':
      return 'destructive'
    default:
      return 'default'
  }
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'daily':
      return <BoltIcon className="h-4 w-4" />
    case 'weekly':
      return <ChartBarIcon className="h-4 w-4" />
    case 'community':
      return <UserGroupIcon className="h-4 w-4" />
    case 'special':
      return <StarIcon className="h-4 w-4" />
    default:
      return <TrophyIcon className="h-4 w-4" />
  }
}

function getRewardIcon(type: string) {
  switch (type) {
    case 'xp':
      return <StarSolidIcon className="h-4 w-4 text-yellow-500" />
    case 'coins':
      return <span className="text-yellow-500">🪙</span>
    case 'badge':
      return <TrophyIcon className="h-4 w-4 text-purple-500" />
    default:
      return null
  }
}

export default function ChallengesPage() {
  const [challenges] = useState<Challenge[]>(mockChallenges)
  const [filterType, setFilterType] = useState<string>('all')
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all')
  const t = useTranslations('app.challenges')

  const filteredChallenges = challenges.filter((challenge) => {
    if (filterType !== 'all' && challenge.type !== filterType) return false
    if (filterDifficulty !== 'all' && challenge.difficulty !== filterDifficulty) return false
    return true
  })

  const activeChallenges = challenges.filter((c) => c.isJoined && !c.isCompleted)
  const completedToday = challenges.filter((c) => c.isCompleted).length

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'all':
        return t('types.all')
      case 'daily':
        return t('types.daily')
      case 'weekly':
        return t('types.weekly')
      case 'community':
        return t('types.community')
      case 'special':
        return t('types.special')
      default:
        return type
    }
  }

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'all':
        return t('difficulty.all')
      case 'easy':
        return t('difficulty.easy')
      case 'medium':
        return t('difficulty.medium')
      case 'hard':
        return t('difficulty.hard')
      default:
        return difficulty
    }
  }

  const getRewardLabel = (rewardType: string, amount: number) => {
    switch (rewardType) {
      case 'badge':
        return t('rewards.badge')
      case 'xp':
        return t('rewards.xp', { amount })
      case 'coins':
        return t('rewards.coins', { amount })
      default:
        return `${amount}`
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
        <p className="text-muted-foreground mt-1">{t('subtitle')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{activeChallenges.length}</div>
            <div className="text-sm text-muted-foreground">{t('stats.active')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-500">{completedToday}</div>
            <div className="text-sm text-muted-foreground">{t('stats.completed')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-500">
              <FireIcon className="h-6 w-6 mx-auto" />
            </div>
            <div className="text-sm text-muted-foreground">{t('stats.streak', { days: 5 })}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1 mr-4">
          {['all', 'daily', 'weekly', 'special', 'community'].map((type) => (
            <Button
              key={type}
              variant={filterType === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType(type)}
            >
              {getTypeLabel(type)}
            </Button>
          ))}
        </div>
        <div className="flex gap-1">
          {['all', 'easy', 'medium', 'hard'].map((diff) => (
            <Button
              key={diff}
              variant={filterDifficulty === diff ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterDifficulty(diff)}
            >
              {getDifficultyLabel(diff)}
            </Button>
          ))}
        </div>
      </div>

      {/* Challenges List */}
      <div className="space-y-4">
        {filteredChallenges.map((challenge) => {
          const progressPercent = Math.round((challenge.progress / challenge.maxProgress) * 100)

          return (
            <Card
              key={challenge.id}
              className={`overflow-hidden ${challenge.isCompleted ? 'opacity-60' : ''}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Type Icon */}
                  <div
                    className={`h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      challenge.isCompleted
                        ? 'bg-green-100 text-green-600'
                        : challenge.type === 'special'
                        ? 'bg-purple-100 text-purple-600'
                        : challenge.type === 'community'
                        ? 'bg-accent/20 text-accent'
                        : 'bg-primary/10 text-primary'
                    }`}
                  >
                    {challenge.isCompleted ? (
                      <CheckCircleIcon className="h-6 w-6" />
                    ) : (
                      <span className="scale-150">{getTypeIcon(challenge.type)}</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge variant="outline" className="flex items-center gap-1">
                        {getTypeIcon(challenge.type)}
                        {getTypeLabel(challenge.type)}
                      </Badge>
                      <Badge
                        variant={getDifficultyVariant(challenge.difficulty) as 'success' | 'warning' | 'destructive' | 'default'}
                      >
                        {getDifficultyLabel(challenge.difficulty)}
                      </Badge>
                      {challenge.isCompleted && (
                        <Badge variant="success">{t('status.completed')}</Badge>
                      )}
                    </div>

                    {/* Title & Description */}
                    <h3 className={`font-semibold text-foreground ${challenge.isCompleted ? 'line-through' : ''}`}>
                      {challenge.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">{challenge.description}</p>

                    {/* Progress */}
                    {!challenge.isCompleted && (
                      <div className="mt-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">
                            {challenge.progress} / {challenge.maxProgress}
                          </span>
                          <span className="font-medium text-primary">{progressPercent}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Footer Info */}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        {challenge.timeRemaining && (
                          <span className="flex items-center gap-1">
                            <ClockIcon className="h-4 w-4" />
                            {challenge.timeRemaining}
                          </span>
                        )}
                        {challenge.participants && (
                          <span className="flex items-center gap-1">
                            <UserGroupIcon className="h-4 w-4" />
                            {t('participants', { count: challenge.participants })}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {getRewardIcon(challenge.rewardType)}
                        <span className="font-medium">
                          {getRewardLabel(challenge.rewardType, challenge.reward)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="flex-shrink-0">
                    {challenge.isCompleted ? (
                      <Button size="sm" variant="outline" disabled>
                        <CheckCircleIcon className="h-4 w-4 mr-1" />
                        {t('status.done')}
                      </Button>
                    ) : challenge.isJoined ? (
                      <Button size="sm" variant="outline">
                        {t('status.view')}
                      </Button>
                    ) : (
                      <Button size="sm">
                        <LockClosedIcon className="h-4 w-4 mr-1" />
                        {t('status.participate')}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Empty State */}
      {filteredChallenges.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <TrophyIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">{t('empty.title')}</h3>
            <p className="text-muted-foreground text-sm">
              {t('empty.message')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
