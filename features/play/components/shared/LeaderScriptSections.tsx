/**
 * LeaderScriptSections — Structured renderer for leader scripts.
 *
 * Parses structured sections (Mål, Ledaren gör, Gruppen gör, Klar när,
 * Om det strular) from plain-text leader scripts and renders them
 * with coloured labels.
 *
 * Fallback: if no known labels are found, renders the entire script
 * as a neutral "Notes" block (backwards-compatible with unstructured text).
 */

'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

// =============================================================================
// Parser
// =============================================================================

/** Known section labels (Swedish). Order determines rendering order. */
const KNOWN_LABELS = [
  'Mål',
  'Ledaren gör',
  'Gruppen gör',
  'Klar när',
  'Om det strular',
] as const;

export type SectionLabel = (typeof KNOWN_LABELS)[number];

export interface ScriptSection {
  label: SectionLabel | 'notes';
  body: string;
}

/**
 * Regex to detect a label prefix at the start of a line:
 *   `Mål:`, `Ledaren gör:`, etc. Case-insensitive, allows leading whitespace.
 */
const LABEL_REGEX = new RegExp(
  `^\\s*(${KNOWN_LABELS.map(l => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\s*:\\s*(.*)$`,
  'im',
);

export function parseLeaderScript(raw: string): ScriptSection[] {
  const lines = raw.split('\n');
  const sections: ScriptSection[] = [];
  let currentLabel: SectionLabel | 'notes' = 'notes';
  let currentBody: string[] = [];

  const flush = () => {
    const body = currentBody.join('\n').trim();
    if (body) {
      sections.push({ label: currentLabel, body });
    }
    currentBody = [];
  };

  for (const line of lines) {
    const match = LABEL_REGEX.exec(line);
    if (match) {
      flush();
      // Normalise label to canonical case (match group 1 is case-insensitive)
      const rawLabel = match[1];
      currentLabel =
        KNOWN_LABELS.find(l => l.toLowerCase() === rawLabel.toLowerCase()) ?? 'notes';
      // Remainder on the same line as the label
      const remainder = match[2]?.trim();
      if (remainder) {
        currentBody.push(remainder);
      }
    } else {
      currentBody.push(line);
    }
  }
  flush();

  return sections;
}

// =============================================================================
// Colour tokens
// =============================================================================

const SECTION_STYLES: Record<
  SectionLabel | 'notes',
  { pillBg: string; pillText: string; bodyText: string }
> = {
  'Mål': {
    pillBg: 'bg-blue-100 dark:bg-blue-900/40',
    pillText: 'text-blue-700 dark:text-blue-300',
    bodyText: 'text-blue-900 dark:text-blue-100',
  },
  'Ledaren gör': {
    pillBg: 'bg-emerald-100 dark:bg-emerald-900/40',
    pillText: 'text-emerald-700 dark:text-emerald-300',
    bodyText: 'text-emerald-900 dark:text-emerald-100',
  },
  'Gruppen gör': {
    pillBg: 'bg-violet-100 dark:bg-violet-900/40',
    pillText: 'text-violet-700 dark:text-violet-300',
    bodyText: 'text-violet-900 dark:text-violet-100',
  },
  'Klar när': {
    pillBg: 'bg-amber-100 dark:bg-amber-900/40',
    pillText: 'text-amber-700 dark:text-amber-300',
    bodyText: 'text-amber-900 dark:text-amber-100',
  },
  'Om det strular': {
    pillBg: 'bg-red-100 dark:bg-red-900/40',
    pillText: 'text-red-700 dark:text-red-300',
    bodyText: 'text-red-900 dark:text-red-100',
  },
  notes: {
    pillBg: 'bg-gray-100 dark:bg-gray-800/40',
    pillText: 'text-gray-600 dark:text-gray-400',
    bodyText: 'text-gray-900 dark:text-gray-100',
  },
};

// =============================================================================
// Component
// =============================================================================

export interface LeaderScriptSectionsProps {
  /** Raw leader script text (may contain structured labels) */
  script: string;
  /** Optional label shown when rendering unstructured "notes" fallback */
  notesLabel?: string;
  className?: string;
}

export function LeaderScriptSections({
  script,
  notesLabel = 'Anteckningar',
  className,
}: LeaderScriptSectionsProps) {
  const sections = useMemo(() => parseLeaderScript(script), [script]);

  if (sections.length === 0) return null;

  return (
    <div className={cn('space-y-3', className)}>
      {sections.map((section, i) => {
        const style = SECTION_STYLES[section.label];
        const displayLabel = section.label === 'notes' ? notesLabel : section.label;

        return (
          <div key={`${section.label}-${i}`} className="space-y-1">
            <span
              className={cn(
                'inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                style.pillBg,
                style.pillText,
              )}
            >
              {displayLabel}
            </span>
            <div
              className={cn(
                'text-base leading-relaxed whitespace-pre-wrap',
                style.bodyText,
              )}
            >
              {section.body}
            </div>
          </div>
        );
      })}
    </div>
  );
}
