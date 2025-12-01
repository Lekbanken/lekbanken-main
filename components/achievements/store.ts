'use client'

import { create } from 'zustand'
import {
  AchievementExport,
  AchievementState,
  BaseConfig,
  DecorationConfig,
  PermissionContext,
  SymbolConfig,
  ThemeId,
} from '@/types/achievements-builder'

const initialState: AchievementState = {
  theme: 'ember',
  base: { type: 'circle', color: { mode: 'token', token: 'gold' } },
  backDecorations: [],
  frontDecorations: [],
  symbol: { type: 'flame', color: { mode: 'token', token: 'gold' } },
  profileFrame: { enabled: false },
}

type Store = {
  state: AchievementState
  setTheme: (theme: ThemeId) => void
  setBase: (base: BaseConfig) => void
  setBackDecorations: (items: DecorationConfig[]) => void
  setFrontDecorations: (items: DecorationConfig[]) => void
  setSymbol: (symbol: SymbolConfig) => void
  setProfileFrameEnabled: (enabled: boolean) => void
  exportAchievement: (meta?: AchievementExport['metadata']) => AchievementExport
  canSendToScope: (scope: 'org' | 'global', ctx: PermissionContext) => boolean
}

export const useAchievementBuilderStore = create<Store>((set, get) => ({
  state: initialState,
  setTheme: (theme) => set((s) => ({ state: { ...s.state, theme } })),
  setBase: (base) => set((s) => ({ state: { ...s.state, base } })),
  setBackDecorations: (items) => set((s) => ({ state: { ...s.state, backDecorations: items } })),
  setFrontDecorations: (items) => set((s) => ({ state: { ...s.state, frontDecorations: items } })),
  setSymbol: (symbol) => set((s) => ({ state: { ...s.state, symbol } })),
  setProfileFrameEnabled: (enabled) =>
    set((s) => ({ state: { ...s.state, profileFrame: { ...s.state.profileFrame, enabled } } })),
  exportAchievement: (meta) => ({
    version: '1.0.0',
    state: get().state,
    metadata: meta,
  }),
  canSendToScope: (scope, ctx) => {
    if (scope === 'org') return ctx.isOrgAdmin || ctx.isSystemAdmin || ctx.isGameAdmin
    if (scope === 'global') return ctx.isSystemAdmin || ctx.isGameAdmin
    return false
  },
}))
