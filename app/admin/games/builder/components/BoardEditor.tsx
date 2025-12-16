'use client';

import { useState } from 'react';
import { Card, Button, Input, Textarea } from '@/components/ui';
import {
  TvIcon,
  DevicePhoneMobileIcon,
  QrCodeIcon,
  ClockIcon,
  UserGroupIcon,
  UserIcon,
  TrophyIcon,
  ChatBubbleBottomCenterTextIcon,
} from '@heroicons/react/24/outline';
import type { BoardTheme, BoardLayout } from '@/types/games';

// =============================================================================
// Types
// =============================================================================

export type BoardConfigData = {
  show_game_name: boolean;
  show_current_phase: boolean;
  show_timer: boolean;
  show_participants: boolean;
  show_public_roles: boolean;
  show_leaderboard: boolean;
  show_qr_code: boolean;
  welcome_message: string;
  theme: BoardTheme;
  background_color: string;
  layout_variant: BoardLayout;
};

type BoardEditorProps = {
  config: BoardConfigData;
  gameName?: string;
  onChange: (config: BoardConfigData) => void;
};

// =============================================================================
// Theme Config
// =============================================================================

const themeOptions: { value: BoardTheme; label: string; emoji: string; bgColor: string }[] = [
  { value: 'mystery', label: 'Mysterium', emoji: '🔍', bgColor: 'bg-slate-800' },
  { value: 'party', label: 'Fest', emoji: '🎉', bgColor: 'bg-pink-600' },
  { value: 'sport', label: 'Sport', emoji: '⚽', bgColor: 'bg-green-600' },
  { value: 'nature', label: 'Natur', emoji: '🌲', bgColor: 'bg-emerald-700' },
  { value: 'neutral', label: 'Neutral', emoji: '⚪', bgColor: 'bg-zinc-700' },
];

const layoutOptions: { value: BoardLayout; label: string }[] = [
  { value: 'standard', label: 'Standard' },
  { value: 'fullscreen', label: 'Fullscreen' },
];

// =============================================================================
// Toggle Item Component
// =============================================================================

type ToggleItemProps = {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon?: React.ReactNode;
  disabled?: boolean;
};

function ToggleItem({ label, description, checked, onChange, icon, disabled }: ToggleItemProps) {
  return (
    <label
      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
        checked ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {icon && <div className="text-muted-foreground">{icon}</div>}
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
      />
    </label>
  );
}

// =============================================================================
// Board Preview Component
// =============================================================================

type BoardPreviewProps = {
  config: BoardConfigData;
  gameName: string;
  layout: BoardLayout;
};

function BoardPreview({ config, gameName, layout }: BoardPreviewProps) {
  const theme = themeOptions.find((t) => t.value === config.theme) || themeOptions[4];
  const isFullscreen = layout === 'fullscreen';

  return (
    <div
      className={`relative rounded-lg overflow-hidden ${theme.bgColor} text-white transition-all ${
        isFullscreen ? 'aspect-video' : 'aspect-[4/3]'
      }`}
      style={config.background_color ? { backgroundColor: config.background_color } : undefined}
    >
      {/* Content */}
      <div className={`h-full flex flex-col ${isFullscreen ? 'p-6' : 'p-4'}`}>
        {/* Header */}
        <div className="text-center mb-4">
          {config.show_game_name && (
            <h2 className={`font-bold tracking-wide ${isFullscreen ? 'text-3xl' : 'text-xl'}`}>
              {gameName || 'Spelnamn'}
            </h2>
          )}
          {config.welcome_message && (
            <p className={`text-white/80 mt-1 ${isFullscreen ? 'text-lg' : 'text-sm'}`}>
              {config.welcome_message}
            </p>
          )}
        </div>

        {/* Middle section */}
        <div className="flex-1 flex items-center justify-center gap-8">
          {config.show_current_phase && (
            <div className="text-center">
              <span className="text-white/60 text-xs uppercase tracking-wide">Fas</span>
              <p className={`font-semibold ${isFullscreen ? 'text-xl' : 'text-base'}`}>Utredning</p>
            </div>
          )}
          {config.show_timer && (
            <div className="text-center">
              <span className="text-white/60 text-xs uppercase tracking-wide">Tid kvar</span>
              <p className={`font-mono font-bold ${isFullscreen ? 'text-3xl' : 'text-xl'}`}>04:32</p>
            </div>
          )}
        </div>

        {/* Bottom section */}
        <div className="flex items-end justify-between">
          <div className="flex items-center gap-4">
            {config.show_participants && (
              <div className="flex items-center gap-1.5 text-white/80">
                <UserGroupIcon className="h-4 w-4" />
                <span className="text-sm">12 deltagare</span>
              </div>
            )}
            {config.show_public_roles && (
              <div className="flex items-center gap-1.5 text-white/80">
                <UserIcon className="h-4 w-4" />
                <span className="text-sm">3 roller</span>
              </div>
            )}
            {config.show_leaderboard && (
              <div className="flex items-center gap-1.5 text-white/80">
                <TrophyIcon className="h-4 w-4" />
                <span className="text-sm">Topplista</span>
              </div>
            )}
          </div>
          {config.show_qr_code && (
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-white rounded-md flex items-center justify-center">
                <QrCodeIcon className="h-8 w-8 text-gray-800" />
              </div>
              <span className="text-xs text-white/60 mt-1">Skanna</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Main BoardEditor Component
// =============================================================================

export function BoardEditor({ config, gameName = 'Mitt spel', onChange }: BoardEditorProps) {
  const [previewLayout, setPreviewLayout] = useState<BoardLayout>('standard');

  const updateConfig = <K extends keyof BoardConfigData>(key: K, value: BoardConfigData[K]) => {
    onChange({ ...config, [key]: value });
  };

  // Check if at least one element is visible
  const hasContent = config.show_game_name || config.show_current_phase || 
    config.show_timer || config.show_participants || config.show_public_roles || 
    config.show_leaderboard || config.show_qr_code || config.welcome_message.trim();

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Publik Tavla</h3>
          <p className="text-sm text-muted-foreground">
            Konfiguration för projektor/storskärm under spelet
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: Preview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Förhandsgranskning</span>
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              {layoutOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPreviewLayout(opt.value)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    previewLayout === opt.value
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {opt.value === 'standard' ? (
                    <DevicePhoneMobileIcon className="h-4 w-4" />
                  ) : (
                    <TvIcon className="h-4 w-4" />
                  )}
                </button>
              ))}
            </div>
          </div>
          
          <BoardPreview config={config} gameName={gameName} layout={previewLayout} />

          {!hasContent && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-sm">
              <ChatBubbleBottomCenterTextIcon className="h-5 w-5 flex-shrink-0" />
              <span>Aktivera minst ett element eller lägg till välkomstmeddelande.</span>
            </div>
          )}
        </div>

        {/* Right: Configuration */}
        <div className="space-y-6">
          {/* Element Toggles */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground">Tavlaelement</h4>
            <div className="grid sm:grid-cols-2 gap-2">
              <ToggleItem
                label="Spelnamn"
                checked={config.show_game_name}
                onChange={(v) => updateConfig('show_game_name', v)}
                icon={<ChatBubbleBottomCenterTextIcon className="h-4 w-4" />}
              />
              <ToggleItem
                label="Aktuell fas"
                checked={config.show_current_phase}
                onChange={(v) => updateConfig('show_current_phase', v)}
                icon={<ClockIcon className="h-4 w-4" />}
              />
              <ToggleItem
                label="Timer"
                checked={config.show_timer}
                onChange={(v) => updateConfig('show_timer', v)}
                icon={<ClockIcon className="h-4 w-4" />}
              />
              <ToggleItem
                label="Deltagare"
                checked={config.show_participants}
                onChange={(v) => updateConfig('show_participants', v)}
                icon={<UserGroupIcon className="h-4 w-4" />}
              />
              <ToggleItem
                label="Publika roller"
                checked={config.show_public_roles}
                onChange={(v) => updateConfig('show_public_roles', v)}
                icon={<UserIcon className="h-4 w-4" />}
              />
              <ToggleItem
                label="Ledartavla"
                description="Kommer snart"
                checked={config.show_leaderboard}
                onChange={(v) => updateConfig('show_leaderboard', v)}
                icon={<TrophyIcon className="h-4 w-4" />}
                disabled
              />
              <ToggleItem
                label="QR-kod"
                description="Länk till /join/[code]"
                checked={config.show_qr_code}
                onChange={(v) => updateConfig('show_qr_code', v)}
                icon={<QrCodeIcon className="h-4 w-4" />}
              />
            </div>
          </div>

          {/* Theme Selector */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground">Tema</h4>
            <div className="flex flex-wrap gap-2">
              {themeOptions.map((theme) => (
                <button
                  key={theme.value}
                  type="button"
                  onClick={() => updateConfig('theme', theme.value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                    config.theme === theme.value
                      ? 'border-primary bg-primary/10 ring-2 ring-primary/50'
                      : 'border-border hover:border-muted-foreground'
                  }`}
                >
                  <span className="text-lg">{theme.emoji}</span>
                  <span className="text-sm font-medium">{theme.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Background Color */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground">Bakgrundsfärg (valfritt)</h4>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={config.background_color || '#1e293b'}
                onChange={(e) => updateConfig('background_color', e.target.value)}
                className="w-10 h-10 rounded-lg border border-border cursor-pointer"
              />
              <Input
                value={config.background_color}
                onChange={(e) => updateConfig('background_color', e.target.value)}
                placeholder="#1e293b"
                className="flex-1 font-mono text-sm"
              />
              {config.background_color && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => updateConfig('background_color', '')}
                >
                  Rensa
                </Button>
              )}
            </div>
          </div>

          {/* Layout Variant */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground">Layout</h4>
            <div className="flex gap-2">
              {layoutOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateConfig('layout_variant', opt.value)}
                  className={`flex-1 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                    config.layout_variant === opt.value
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border text-muted-foreground hover:border-muted-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Welcome Message */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground">Välkomstmeddelande</h4>
            <Textarea
              value={config.welcome_message}
              onChange={(e) => updateConfig('welcome_message', e.target.value)}
              placeholder="Välkomna till kvällens mysterium!"
              rows={3}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
