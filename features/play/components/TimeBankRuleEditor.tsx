/**
 * TimeBankRuleEditor Component
 * 
 * CRUD component for creating and editing TimeBank reward rules.
 * Used in Game Builder to configure how time is awarded/deducted.
 * 
 * Task 4.5 - Session Cockpit Architecture
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  ClockIcon,
  PlusIcon,
  TrashIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline';

// =============================================================================
// Types
// =============================================================================

export type TimeBankRuleTrigger =
  | 'artifact_solved'        // When any/specific artifact is solved
  | 'step_completed'         // When a step is completed
  | 'phase_completed'        // When a phase is completed
  | 'trigger_fired'          // When a specific trigger fires
  | 'time_elapsed'           // After a certain time has passed
  | 'manual';                // Manual adjustment by host

export type TimeBankOperator =
  | 'add'                    // Add time
  | 'subtract'               // Subtract time
  | 'set'                    // Set to specific value
  | 'multiply';              // Multiply remaining time

export interface TimeBankRule {
  id: string;
  name: string;
  description?: string;
  trigger: TimeBankRuleTrigger;
  /** For artifact_solved, step_completed, etc - specific ID or '*' for any */
  targetId?: string;
  operator: TimeBankOperator;
  /** Value in seconds (for add/subtract/set) or multiplier (for multiply) */
  value: number;
  /** Maximum times this rule can fire (0 = unlimited) */
  maxFires: number;
  /** Is this rule enabled? */
  enabled: boolean;
  /** Optional condition - only fire if TimeBank balance is below/above threshold */
  condition?: {
    type: 'balance_below' | 'balance_above';
    threshold: number;
  };
}

export interface TimeBankConfig {
  /** Initial balance in seconds */
  initialBalance: number;
  /** Minimum balance (can be negative for "debt") */
  minBalance: number;
  /** Maximum balance */
  maxBalance: number;
  /** What happens when balance reaches 0 */
  onZeroAction: 'pause' | 'end_game' | 'continue' | 'trigger';
  /** If onZeroAction is 'trigger', which trigger to fire */
  onZeroTriggerId?: string;
  /** Show countdown to participants */
  showToParticipants: boolean;
  /** Reward rules */
  rules: TimeBankRule[];
}

export interface TimeBankRuleEditorProps {
  /** Current config */
  config: TimeBankConfig;
  /** Callback when config changes */
  onChange: (config: TimeBankConfig) => void;
  /** Available artifacts for targeting */
  artifacts?: Array<{ id: string; name: string }>;
  /** Available steps for targeting */
  steps?: Array<{ id: string; name: string }>;
  /** Available triggers for targeting */
  triggers?: Array<{ id: string; name: string }>;
  /** Optional className */
  className?: string;
}

// =============================================================================
// Constants - Option keys for translation
// =============================================================================

const TRIGGER_KEYS = [
  'artifact_solved',
  'step_completed',
  'phase_completed',
  'trigger_fired',
  'time_elapsed',
  'manual',
] as const;

const OPERATOR_KEYS = ['add', 'subtract', 'set', 'multiply'] as const;

const ZERO_ACTION_KEYS = ['pause', 'end_game', 'continue', 'trigger'] as const;

const CONDITION_KEYS = ['none', 'balance_below', 'balance_above'] as const;

// =============================================================================
// Helper: Generate ID
// =============================================================================

const generateId = () => Math.random().toString(36).substring(2, 10);

// =============================================================================
// Helper: Format Time
// =============================================================================

const formatTime = (seconds: number): string => {
  const mins = Math.floor(Math.abs(seconds) / 60);
  const secs = Math.abs(seconds) % 60;
  const sign = seconds < 0 ? '-' : '';
  return `${sign}${mins}:${secs.toString().padStart(2, '0')}`;
};

// =============================================================================
// Helper: Create Default Rule
// =============================================================================

const createDefaultRule = (t: ReturnType<typeof useTranslations>): TimeBankRule => ({
  id: generateId(),
  name: t('newRule'),
  trigger: 'artifact_solved',
  targetId: '*',
  operator: 'add',
  value: 30,
  maxFires: 0,
  enabled: true,
});

// =============================================================================
// Default Config
// =============================================================================

export const DEFAULT_TIMEBANK_CONFIG: TimeBankConfig = {
  initialBalance: 600, // 10 minutes
  minBalance: -60,     // Allow 1 minute debt
  maxBalance: 1800,    // 30 minutes max
  onZeroAction: 'pause',
  showToParticipants: true,
  rules: [],
};

// =============================================================================
// Sub-Component: RuleCard
// =============================================================================

interface RuleCardProps {
  rule: TimeBankRule;
  isEditing: boolean;
  onEdit: () => void;
  onUpdate: (rule: TimeBankRule) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  artifacts?: Array<{ id: string; name: string }>;
  steps?: Array<{ id: string; name: string }>;
  triggers?: Array<{ id: string; name: string }>;
  triggerOptions: Array<{ value: string; label: string }>;
  operatorOptions: Array<{ value: string; label: string }>;
  conditionOptions: Array<{ value: string; label: string }>;
}

function RuleCard({
  rule,
  isEditing,
  onEdit,
  onUpdate,
  onDelete,
  onDuplicate,
  artifacts = [],
  steps = [],
  triggers = [],
  triggerOptions,
  operatorOptions,
  conditionOptions,
}: RuleCardProps) {
  const t = useTranslations('play.timeBankEditor');
  const triggerOption = triggerOptions.find((o) => o.value === rule.trigger);
  
  // Get target name
  const getTargetName = () => {
    if (rule.targetId === '*') return t('all');
    
    switch (rule.trigger) {
      case 'artifact_solved':
        return artifacts.find((a) => a.id === rule.targetId)?.name || rule.targetId;
      case 'step_completed':
        return steps.find((s) => s.id === rule.targetId)?.name || rule.targetId;
      case 'trigger_fired':
        return triggers.find((t) => t.id === rule.targetId)?.name || rule.targetId;
      default:
        return rule.targetId;
    }
  };
  
  // Get value display
  const getValueDisplay = () => {
    switch (rule.operator) {
      case 'add':
        return `+${formatTime(rule.value)}`;
      case 'subtract':
        return `-${formatTime(rule.value)}`;
      case 'set':
        return `= ${formatTime(rule.value)}`;
      case 'multiply':
        return `× ${rule.value}`;
    }
  };
  
  // Get target options for select
  const getTargetOptions = () => {
    const options = [{ value: '*', label: t('all') }];
    
    switch (rule.trigger) {
      case 'artifact_solved':
        return [...options, ...artifacts.map(a => ({ value: a.id, label: a.name }))];
      case 'step_completed':
        return [...options, ...steps.map(s => ({ value: s.id, label: s.name }))];
      case 'trigger_fired':
        return [...options, ...triggers.map(t => ({ value: t.id, label: t.name }))];
      default:
        return options;
    }
  };
  
  if (!isEditing) {
    // Collapsed view
    return (
      <div
        className={`
          group flex items-center gap-3 p-3 border rounded-lg cursor-pointer
          hover:border-primary/50 transition-colors
          ${!rule.enabled ? 'opacity-50' : ''}
        `}
        onClick={onEdit}
      >
        <Bars3Icon className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
        
        <Switch
          checked={rule.enabled}
          onCheckedChange={(checked) => {
            onUpdate({ ...rule, enabled: checked });
          }}
          onClick={(e) => e.stopPropagation()}
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{rule.name}</span>
            {rule.maxFires > 0 && (
              <Badge variant="outline" className="text-xs">
                {t('maxFiresBadge', { count: rule.maxFires })}
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {triggerOption?.label}: {getTargetName()}
          </div>
        </div>
        
        <Badge 
          variant={rule.operator === 'subtract' ? 'destructive' : 'default'}
          className="font-mono"
        >
          {getValueDisplay()}
        </Badge>
        
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            className="h-8 w-8 p-0"
          >
            <PlusIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }
  
  // Expanded editing view
  return (
    <Card className="border-primary">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{t('editRule')}</CardTitle>
          <div className="flex items-center gap-2">
            <Switch
              checked={rule.enabled}
              onCheckedChange={(checked) => onUpdate({ ...rule, enabled: checked })}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-destructive hover:text-destructive"
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor={`rule-name-${rule.id}`}>{t('name')}</Label>
          <Input
            id={`rule-name-${rule.id}`}
            value={rule.name}
            onChange={(e) => onUpdate({ ...rule, name: e.target.value })}
            placeholder={t('ruleNamePlaceholder')}
          />
        </div>
        
        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor={`rule-desc-${rule.id}`}>{t('descriptionOptional')}</Label>
          <Input
            id={`rule-desc-${rule.id}`}
            value={rule.description || ''}
            onChange={(e) => onUpdate({ ...rule, description: e.target.value })}
            placeholder={t('descriptionPlaceholder')}
          />
        </div>
        
        {/* Trigger */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('when')}</Label>
            <Select
              value={rule.trigger}
              onChange={(e) => onUpdate({
                ...rule,
                trigger: e.target.value as TimeBankRuleTrigger,
                targetId: '*',
              })}
              options={triggerOptions}
            />
          </div>
          
          {/* Target selection (context-dependent) */}
          {(rule.trigger === 'artifact_solved' || 
            rule.trigger === 'step_completed' || 
            rule.trigger === 'trigger_fired') && (
            <div className="space-y-2">
              <Label>{t('target')}</Label>
              <Select
                value={rule.targetId || '*'}
                onChange={(e) => onUpdate({ ...rule, targetId: e.target.value })}
                options={getTargetOptions()}
              />
            </div>
          )}
          
          {rule.trigger === 'time_elapsed' && (
            <div className="space-y-2">
              <Label htmlFor={`rule-elapsed-${rule.id}`}>{t('afterSeconds')}</Label>
              <Input
                id={`rule-elapsed-${rule.id}`}
                type="number"
                value={parseInt(rule.targetId || '0')}
                onChange={(e) => onUpdate({ ...rule, targetId: e.target.value })}
                min={1}
                step={10}
              />
            </div>
          )}
        </div>
        
        {/* Operator and value */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('operation')}</Label>
            <Select
              value={rule.operator}
              onChange={(e) => onUpdate({
                ...rule,
                operator: e.target.value as TimeBankOperator,
              })}
              options={operatorOptions}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor={`rule-value-${rule.id}`}>
              {rule.operator === 'multiply' ? t('factor') : t('seconds')}
            </Label>
            <Input
              id={`rule-value-${rule.id}`}
              type="number"
              value={rule.value}
              onChange={(e) => onUpdate({ ...rule, value: parseFloat(e.target.value) || 0 })}
              min={rule.operator === 'multiply' ? 0.1 : 1}
              step={rule.operator === 'multiply' ? 0.1 : 5}
            />
          </div>
        </div>
        
        {/* Max fires */}
        <div className="space-y-2">
          <Label htmlFor={`rule-max-${rule.id}`}>{t('maxFires')}</Label>
          <Input
            id={`rule-max-${rule.id}`}
            type="number"
            value={rule.maxFires}
            onChange={(e) => onUpdate({ ...rule, maxFires: parseInt(e.target.value) || 0 })}
            min={0}
          />
        </div>
        
        {/* Condition */}
        <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
          <Label className="text-sm font-medium">{t('conditionOptional')}</Label>
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={rule.condition?.type || 'none'}
              onChange={(e) => {
                const value = e.target.value;
                if (value === 'none') {
                  onUpdate({ ...rule, condition: undefined });
                } else {
                  onUpdate({
                    ...rule,
                    condition: {
                      type: value as 'balance_below' | 'balance_above',
                      threshold: rule.condition?.threshold || 60,
                    },
                  });
                }
              }}
              options={conditionOptions}
            />
            
            {rule.condition && (
              <Input
                type="number"
                value={rule.condition.threshold}
                onChange={(e) => onUpdate({
                  ...rule,
                  condition: {
                    ...rule.condition!,
                    threshold: parseInt(e.target.value) || 0,
                  },
                })}
                min={0}
                placeholder={t('seconds')}
              />
            )}
          </div>
        </div>
        
        {/* Done button */}
        <div className="pt-2">
          <Button variant="outline" onClick={onEdit} className="w-full">
            {t('done')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function TimeBankRuleEditor({
  config,
  onChange,
  artifacts = [],
  steps = [],
  triggers = [],
  className,
}: TimeBankRuleEditorProps) {
  const t = useTranslations('play.timeBankEditor');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Build translated options
  const triggerOptions = useMemo(() => 
    TRIGGER_KEYS.map(key => ({ value: key, label: t(`triggers.${key}`) })), [t]);
  const operatorOptions = useMemo(() => 
    OPERATOR_KEYS.map(key => ({ value: key, label: t(`operators.${key}`) })), [t]);
  const zeroActionOptions = useMemo(() => 
    ZERO_ACTION_KEYS.map(key => ({ value: key, label: t(`zeroActions.${key}`) })), [t]);
  const conditionOptions = useMemo(() => 
    CONDITION_KEYS.map(key => ({ value: key, label: t(`conditions.${key}`) })), [t]);
  
  const updateConfig = useCallback((updates: Partial<TimeBankConfig>) => {
    onChange({ ...config, ...updates });
  }, [config, onChange]);
  
  const addRule = useCallback(() => {
    const newRule = createDefaultRule(t);
    updateConfig({ rules: [...config.rules, newRule] });
    setEditingId(newRule.id);
  }, [config.rules, updateConfig, t]);
  
  const updateRule = useCallback((rule: TimeBankRule) => {
    updateConfig({
      rules: config.rules.map((r) => (r.id === rule.id ? rule : r)),
    });
  }, [config.rules, updateConfig]);
  
  const deleteRule = useCallback((id: string) => {
    updateConfig({
      rules: config.rules.filter((r) => r.id !== id),
    });
    if (editingId === id) {
      setEditingId(null);
    }
  }, [config.rules, updateConfig, editingId]);
  
  const duplicateRule = useCallback((rule: TimeBankRule) => {
    const newRule: TimeBankRule = {
      ...rule,
      id: generateId(),
      name: t('copyName', { name: rule.name }),
    };
    updateConfig({ rules: [...config.rules, newRule] });
    setEditingId(newRule.id);
  }, [config.rules, updateConfig, t]);
  
  // Build trigger options for zero action
  const triggerSelectOptions = triggers.map(t => ({ value: t.id, label: t.name }));
  
  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClockIcon className="h-5 w-5" />
            {t('title')}
          </CardTitle>
          <CardDescription>
            {t('description')}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Basic settings */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tb-initial">{t('initialTime')}</Label>
              <Input
                id="tb-initial"
                type="number"
                value={config.initialBalance}
                onChange={(e) => updateConfig({
                  initialBalance: parseInt(e.target.value) || 0,
                })}
                min={0}
                step={60}
              />
              <div className="text-xs text-muted-foreground">
                {formatTime(config.initialBalance)}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tb-min">{t('minimum')}</Label>
              <Input
                id="tb-min"
                type="number"
                value={config.minBalance}
                onChange={(e) => updateConfig({
                  minBalance: parseInt(e.target.value) || 0,
                })}
                step={30}
              />
              <div className="text-xs text-muted-foreground">
                {config.minBalance < 0 ? t('allowDebt') : t('noDebt')}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tb-max">{t('maximum')}</Label>
              <Input
                id="tb-max"
                type="number"
                value={config.maxBalance}
                onChange={(e) => updateConfig({
                  maxBalance: parseInt(e.target.value) || 0,
                })}
                min={0}
                step={60}
              />
              <div className="text-xs text-muted-foreground">
                {formatTime(config.maxBalance)}
              </div>
            </div>
          </div>
          
          {/* On zero action */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('onZero')}</Label>
              <Select
                value={config.onZeroAction}
                onChange={(e) => updateConfig({
                  onZeroAction: e.target.value as TimeBankConfig['onZeroAction'],
                })}
                options={zeroActionOptions}
              />
            </div>
            
            {config.onZeroAction === 'trigger' && (
              <div className="space-y-2">
                <Label>{t('triggerToActivate')}</Label>
                <Select
                  value={config.onZeroTriggerId || ''}
                  onChange={(e) => updateConfig({
                    onZeroTriggerId: e.target.value,
                  })}
                  options={triggerSelectOptions}
                  placeholder={t('selectTrigger')}
                />
              </div>
            )}
          </div>
          
          {/* Show to participants */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <Label className="font-medium">{t('showToParticipants')}</Label>
              <p className="text-xs text-muted-foreground mt-1">
                {t('showToParticipantsDescription')}
              </p>
            </div>
            <Switch
              checked={config.showToParticipants}
              onCheckedChange={(checked) => updateConfig({
                showToParticipants: checked,
              })}
            />
          </div>
          
          {/* Rules section */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">{t('rewardRules')}</Label>
              <Badge variant="outline">
                {t('activeCount', { count: config.rules.filter((r) => r.enabled).length })}
              </Badge>
            </div>
            
            {config.rules.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/30">
                <ClockIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>{t('noRules')}</p>
                <p className="text-sm">
                  {t('noRulesHint')}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {config.rules.map((rule) => (
                  <RuleCard
                    key={rule.id}
                    rule={rule}
                    isEditing={editingId === rule.id}
                    onEdit={() => setEditingId(editingId === rule.id ? null : rule.id)}
                    onUpdate={updateRule}
                    onDelete={() => deleteRule(rule.id)}
                    onDuplicate={() => duplicateRule(rule)}
                    artifacts={artifacts}
                    steps={steps}
                    triggers={triggers}
                    triggerOptions={triggerOptions}
                    operatorOptions={operatorOptions}
                    conditionOptions={conditionOptions}
                  />
                ))}
              </div>
            )}
            
            <Button
              variant="outline"
              onClick={addRule}
              className="w-full"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              {t('addRule')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// Exports
// =============================================================================

export { TRIGGER_KEYS, OPERATOR_KEYS, ZERO_ACTION_KEYS };
