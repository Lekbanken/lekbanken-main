'use client';

import { cn } from '@/lib/utils';
import {
  InformationCircleIcon,
  ListBulletIcon,
  CubeIcon,
  ShieldCheckIcon,
  AdjustmentsHorizontalIcon,
  ClockIcon,
  UserGroupIcon,
  TvIcon,
  LanguageIcon,
  Cog6ToothIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';

export type BuilderSection = 
  | 'grundinfo'
  | 'steg'
  | 'material'
  | 'sakerhet'
  | 'artifacts'
  | 'spellage'
  | 'faser'
  | 'roller'
  | 'tavla'
  | 'oversattningar'
  | 'installningar';

type SectionConfig = {
  id: BuilderSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  advanced?: boolean;
  requiresMode?: ('facilitated' | 'participants')[];
};

const sections: SectionConfig[] = [
  { id: 'grundinfo', label: 'Grundinformation', icon: InformationCircleIcon },
  { id: 'steg', label: 'Steg-för-steg', icon: ListBulletIcon },
  { id: 'material', label: 'Material', icon: CubeIcon },
  { id: 'sakerhet', label: 'Säkerhet & Inkludering', icon: ShieldCheckIcon },
  { id: 'artifacts', label: 'Artifakter', icon: Squares2X2Icon, advanced: true, requiresMode: ['participants'] },
  { id: 'spellage', label: 'Spelläge', icon: AdjustmentsHorizontalIcon, advanced: true },
  { id: 'faser', label: 'Faser & Rundor', icon: ClockIcon, advanced: true, requiresMode: ['facilitated', 'participants'] },
  { id: 'roller', label: 'Roller', icon: UserGroupIcon, advanced: true, requiresMode: ['participants'] },
  { id: 'tavla', label: 'Publik Tavla', icon: TvIcon, advanced: true, requiresMode: ['participants'] },
  { id: 'oversattningar', label: 'Översättningar', icon: LanguageIcon },
  { id: 'installningar', label: 'Inställningar', icon: Cog6ToothIcon },
];

type BuilderSectionNavProps = {
  activeSection: BuilderSection;
  onSectionChange: (section: BuilderSection) => void;
  playMode: 'basic' | 'facilitated' | 'participants';
  completedSections?: BuilderSection[];
};

export function BuilderSectionNav({
  activeSection,
  onSectionChange,
  playMode,
  completedSections = [],
}: BuilderSectionNavProps) {
  const visibleSections = sections.filter((section) => {
    if (!section.requiresMode) return true;
    return section.requiresMode.includes(playMode as 'facilitated' | 'participants');
  });

  const basicSections = visibleSections.filter((s) => !s.advanced && s.id !== 'oversattningar' && s.id !== 'installningar');
  const advancedSections = visibleSections.filter((s) => s.advanced);
  const utilitySections = visibleSections.filter((s) => s.id === 'oversattningar' || s.id === 'installningar');

  const renderSection = (section: SectionConfig) => {
    const Icon = section.icon;
    const isActive = activeSection === section.id;
    const isComplete = completedSections.includes(section.id);

    return (
      <button
        key={section.id}
        type="button"
        onClick={() => onSectionChange(section.id)}
        className={cn(
          'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors',
          isActive
            ? 'bg-primary/10 text-primary font-medium'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        <Icon className="h-5 w-5 flex-shrink-0" />
        <span className="flex-1 truncate">{section.label}</span>
        {isComplete && (
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
        )}
      </button>
    );
  };

  return (
    <nav className="space-y-6 p-4">
      {/* Basic sections */}
      <div className="space-y-1">
        {basicSections.map(renderSection)}
      </div>

      {/* Advanced sections */}
      {advancedSections.length > 0 && (
        <>
          <div className="border-t border-border pt-4">
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Avancerat
            </p>
            <div className="space-y-1">
              {advancedSections.map(renderSection)}
            </div>
          </div>
        </>
      )}

      {/* Utility sections */}
      <div className="border-t border-border pt-4 space-y-1">
        {utilitySections.map(renderSection)}
      </div>
    </nav>
  );
}
