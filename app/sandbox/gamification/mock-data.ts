import type { Achievement, CoinsSummary, ProgressSnapshot, StreakSummary } from '@/features/gamification/types';

export const mockAchievements: Achievement[] = [
  {
    id: 'achv-first-session',
    name: 'First Session',
    description: 'Complete your first activity.',
    status: 'unlocked',
    points: 10,
  },
  {
    id: 'achv-streak-7',
    name: '7 Day Streak',
    description: 'Keep a streak for seven days.',
    status: 'in_progress',
    progress: 70,
    points: 25,
    requirement: 'Play 7 days in a row.',
    hintText: 'One more day to go.',
  },
  {
    id: 'achv-hidden',
    name: 'Secret Finder',
    description: 'Discover a hidden challenge.',
    status: 'locked',
    isEasterEgg: true,
  },
  {
    id: 'achv-score-1000',
    name: 'Score 1000',
    description: 'Reach a total score of 1000.',
    status: 'locked',
    points: 50,
    requirement: 'Reach 1000 points.',
    hintText: 'Keep playing to build points.',
  },
  {
    id: 'achv-mentor',
    name: 'Team Mentor',
    description: 'Help a teammate finish a session.',
    status: 'unlocked',
    points: 15,
  },
  {
    id: 'achv-speed',
    name: 'Speed Run',
    description: 'Finish a session under 10 minutes.',
    status: 'in_progress',
    progress: 40,
    points: 35,
    requirement: 'Under 10 minutes.',
  },
];

export const mockCoins: CoinsSummary = {
  balance: 1250,
  recentTransactions: [
    {
      id: 'tx-1',
      type: 'earn',
      amount: 50,
      description: 'Session complete',
      date: 'Today',
    },
    {
      id: 'tx-2',
      type: 'spend',
      amount: 120,
      description: 'Shop purchase',
      date: 'Yesterday',
    },
    {
      id: 'tx-3',
      type: 'earn',
      amount: 30,
      description: 'Daily streak bonus',
      date: 'Yesterday',
    },
  ],
};

export const mockProgress: ProgressSnapshot = {
  level: 4,
  levelName: 'Explorer',
  currentXp: 860,
  nextLevelXp: 1200,
  completedAchievements: 12,
  totalAchievements: 28,
  nextReward: 'Unlock Bronze Badge Pack',
};

export const mockStreak: StreakSummary = {
  currentStreakDays: 4,
  bestStreakDays: 9,
  lastActiveDate: 'Yesterday',
};
