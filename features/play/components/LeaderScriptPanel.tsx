/**
 * LeaderScriptPanel Component
 * 
 * Displays multi-language leader script with language selector.
 * Shows current step/phase content with navigation.
 * 
 * Backlog B.8: Multi-language leader script
 */

'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
import {
  BookOpenIcon,
  GlobeAltIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChatBubbleBottomCenterTextIcon,
  BoltIcon,
  DocumentTextIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  Bars3BottomLeftIcon,
} from '@heroicons/react/24/outline';
import type {
  SupportedLanguage,
  LeaderScriptBlock,
} from '@/lib/multi-language-script';
import {
  BLOCK_TYPE_LABELS,
  getLanguageInfo,
} from '@/lib/multi-language-script';
import type { UseMultiLanguageScriptReturn } from '@/features/play/hooks/useMultiLanguageScript';

// =============================================================================
// Types
// =============================================================================

export interface LeaderScriptPanelProps {
  /** Multi-language script hook return */
  scriptHook: UseMultiLanguageScriptReturn;
  /** Optional className */
  className?: string;
  /** Compact mode */
  compact?: boolean;
  /** Show navigation controls */
  showNavigation?: boolean;
  /** Show translation status */
  showTranslationStatus?: boolean;
  /** Max height for scroll area */
  maxHeight?: number;
}

// =============================================================================
// Constants
// =============================================================================

const BLOCK_TYPE_ICONS: Record<LeaderScriptBlock['type'], React.ReactNode> = {
  heading: <Bars3BottomLeftIcon className="h-4 w-4" />,
  instruction: <ExclamationCircleIcon className="h-4 w-4" />,
  dialogue: <ChatBubbleBottomCenterTextIcon className="h-4 w-4" />,
  action: <BoltIcon className="h-4 w-4" />,
  note: <DocumentTextIcon className="h-4 w-4" />,
  cue: <ExclamationCircleIcon className="h-4 w-4" />,
};

const BLOCK_TYPE_STYLES: Record<LeaderScriptBlock['type'], string> = {
  heading: 'font-bold text-lg border-b pb-2 mb-2',
  instruction: 'pl-4 border-l-2 border-primary',
  dialogue: 'bg-muted/30 rounded-lg p-3 italic',
  action: 'bg-yellow-500/10 rounded-lg p-3 font-medium',
  note: 'bg-blue-500/10 rounded-lg p-3 text-sm',
  cue: 'bg-red-500/10 rounded-lg p-3',
};

// =============================================================================
// Sub-Component: LanguageSelector
// =============================================================================

interface LanguageSelectorProps {
  language: SupportedLanguage;
  availableLanguages: SupportedLanguage[];
  onLanguageChange: (lang: SupportedLanguage) => void;
  translationComplete?: boolean;
}

function LanguageSelector({
  language,
  availableLanguages,
  onLanguageChange,
  translationComplete,
}: LanguageSelectorProps) {
  const _currentLang = getLanguageInfo(language);
  
  const options = availableLanguages.map((code) => {
    const lang = getLanguageInfo(code);
    return {
      value: code,
      label: lang ? `${lang.flag} ${lang.nativeName}` : code,
    };
  });

  return (
    <div className="flex items-center gap-2">
      <GlobeAltIcon className="h-4 w-4 text-muted-foreground" />
      <Select
        options={options}
        value={language}
        onChange={(e) => onLanguageChange(e.target.value as SupportedLanguage)}
        className="w-[140px] h-8"
      />
      {translationComplete !== undefined && (
        translationComplete ? (
          <CheckCircleIcon className="h-4 w-4 text-green-500" />
        ) : (
          <ExclamationCircleIcon className="h-4 w-4 text-yellow-500" />
        )
      )}
    </div>
  );
}

// =============================================================================
// Sub-Component: PhaseNavigation
// =============================================================================

interface PhaseNavigationProps {
  currentPhase: 'intro' | 'main' | 'outro';
  onPhaseChange: (phase: 'intro' | 'main' | 'outro') => void;
}

function PhaseNavigation({ currentPhase, onPhaseChange }: PhaseNavigationProps) {
  const t = useTranslations('play.leaderScriptPanel');
  const phases: ('intro' | 'main' | 'outro')[] = ['intro', 'main', 'outro'];

  return (
    <div className="flex gap-1">
      {phases.map((phase) => (
        <Button
          key={phase}
          variant={currentPhase === phase ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onPhaseChange(phase)}
          className="flex-1"
        >
          {t(`phases.${phase}` as Parameters<typeof t>[0])}
        </Button>
      ))}
    </div>
  );
}

// =============================================================================
// Sub-Component: ScriptBlock
// =============================================================================

interface ScriptBlockProps {
  block: LeaderScriptBlock;
  text: string;
  language: SupportedLanguage;
  compact?: boolean;
  t: ReturnType<typeof useTranslations<'play.leaderScriptPanel'>>;
}

function ScriptBlock({ block, text, language, compact, t }: ScriptBlockProps) {
  const icon = BLOCK_TYPE_ICONS[block.type];
  const style = BLOCK_TYPE_STYLES[block.type];
  const typeLabel = BLOCK_TYPE_LABELS[block.type][language] ?? BLOCK_TYPE_LABELS[block.type]['sv'];

  return (
    <div className={`${style} ${compact ? 'py-1' : 'py-2'}`}>
      {/* Header for non-heading types */}
      {block.type !== 'heading' && (
        <div className="flex items-center gap-2 mb-1">
          {icon}
          <span className="text-xs text-muted-foreground uppercase tracking-wide">
            {typeLabel}
          </span>
          {block.timing && (
            <Badge variant="outline" className="text-xs ml-auto">
              {block.timing}
            </Badge>
          )}
          {block.speaker && (
            <Badge variant="outline" className="text-xs">
              {block.speaker}
            </Badge>
          )}
        </div>
      )}

      {/* Content */}
      <div className={block.type === 'heading' ? 'flex items-center gap-2' : ''}>
        {block.type === 'heading' && icon}
        <span>{text || <span className="text-muted-foreground italic">{t('noText')}</span>}</span>
      </div>
    </div>
  );
}

// =============================================================================
// Sub-Component: TranslationStatusBar
// =============================================================================

interface TranslationStatusBarProps {
  completion: number;
  language: SupportedLanguage;
}

function TranslationStatusBar({ completion, language }: TranslationStatusBarProps) {
  const t = useTranslations('play.leaderScriptPanel');
  const langInfo = getLanguageInfo(language);
  const isComplete = completion === 1;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {t('translationLabel', { language: langInfo?.nativeName ?? language })}
        </span>
        <span className={isComplete ? 'text-green-500' : 'text-yellow-500'}>
          {Math.round(completion * 100)}%
        </span>
      </div>
      <Progress value={completion * 100} className="h-1" />
    </div>
  );
}

function NoContentPlaceholder() {
  const t = useTranslations('play.leaderScriptPanel');
  return (
    <div className="text-center text-muted-foreground py-8">
      {t('noContent')}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function LeaderScriptPanel({
  scriptHook,
  className,
  compact = false,
  showNavigation = true,
  showTranslationStatus = true,
  maxHeight = 400,
}: LeaderScriptPanelProps) {
  const t = useTranslations('play.leaderScriptPanel');
  const [isExpanded, setIsExpanded] = useState(true);

  const {
    language,
    setLanguage,
    availableLanguages,
    currentStepIndex,
    currentPhase,
    goToPhase,
    nextStep,
    prevStep,
    content,
    gameTitle,
    translationStatus,
    isTranslationComplete,
  } = scriptHook;

  return (
    <Card className={className}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className={compact ? 'pb-2' : 'pb-3'}>
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-2 hover:opacity-80">
                <BookOpenIcon className="h-5 w-5" />
                <CardTitle className="text-base">{t('title')}</CardTitle>
                {isExpanded ? (
                  <ChevronUpIcon className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </CollapsibleTrigger>
            <LanguageSelector
              language={language}
              availableLanguages={availableLanguages}
              onLanguageChange={setLanguage}
              translationComplete={isTranslationComplete}
            />
          </div>
          {!compact && (
            <CardDescription>
              {t('gameStep', { title: gameTitle, step: currentStepIndex + 1 })}
            </CardDescription>
          )}
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-3">
            {/* Step header */}
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{content.stepName}</h3>
              {showNavigation && (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={prevStep}
                    disabled={currentStepIndex === 0}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={nextStep}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRightIcon className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Phase navigation */}
            <PhaseNavigation
              currentPhase={currentPhase}
              onPhaseChange={goToPhase}
            />

            {/* Phase title */}
            <h4 className="text-sm font-medium text-muted-foreground">
              {content.phaseTitle}
            </h4>

            {/* Content blocks */}
            <ScrollArea maxHeight={`${maxHeight}px`}>
              <div className="space-y-3 pr-3">
                {content.blocks.length > 0 ? (
                  content.blocks.map((block) => (
                    <ScriptBlock
                      key={block.id}
                      block={block}
                      text={content.getBlockText(block)}
                      language={language}
                      compact={compact}
                      t={t}
                    />
                  ))
                ) : (
                  <NoContentPlaceholder />
                )}
              </div>
            </ScrollArea>

            {/* Translation status */}
            {showTranslationStatus && translationStatus && (
              <TranslationStatusBar
                completion={translationStatus.completionRate}
                language={language}
              />
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// =============================================================================
// Compact Script Line
// =============================================================================

export interface CompactScriptLineProps {
  scriptHook: UseMultiLanguageScriptReturn;
  className?: string;
}

export function CompactScriptLine({
  scriptHook,
  className,
}: CompactScriptLineProps) {
  const t = useTranslations('play.leaderScriptPanel');
  const { content, currentPhase } = scriptHook;
  
  // Get first non-empty block
  const firstBlock = content.blocks[0];
  const text = firstBlock ? content.getBlockText(firstBlock) : '';

  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      <BookOpenIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <div className="flex-1 truncate">
        {text || <span className="text-muted-foreground">{t('noScript')}</span>}
      </div>
      <Badge variant="outline" className="flex-shrink-0">
        {t(`phases.${currentPhase}` as Parameters<typeof t>[0])}
      </Badge>
    </div>
  );
}
