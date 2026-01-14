'use client';

import { useMemo, useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import { cn } from '@/lib/utils';
import { MarkdownContent } from './MarkdownContent';

interface ContentSection {
  id: string;
  title: string;
  content: string;
}

/**
 * Parse markdown content into sections based on ## (h2) headers.
 * Each main section (## header) becomes an accordion.
 */
function parseMarkdownSections(markdown: string): ContentSection[] {
  const lines = markdown.split('\n');
  const sections: ContentSection[] = [];
  let currentSection: ContentSection | null = null;
  let contentLines: string[] = [];

  for (const line of lines) {
    // Only match ## headers (h2) for main sections
    const mainHeaderMatch = line.match(/^##\s+(.+)$/);
    
    if (mainHeaderMatch) {
      // Save previous section if exists
      if (currentSection) {
        currentSection.content = contentLines.join('\n').trim();
        if (currentSection.content || currentSection.title) {
          sections.push(currentSection);
        }
      }
      
      // Start new section - remove leading numbers like "1. " from title
      const title = mainHeaderMatch[1].replace(/^\d+\.?\s*/, '').trim();
      currentSection = {
        id: `section-${sections.length + 1}`,
        title: title || `Sektion ${sections.length + 1}`,
        content: '',
      };
      contentLines = [];
    } else if (currentSection) {
      contentLines.push(line);
    } else {
      // Content before first header
      if (line.trim() && !line.startsWith('#')) {
        currentSection = {
          id: 'section-intro',
          title: 'Översikt',
          content: '',
        };
        contentLines.push(line);
      }
    }
  }
  
  // Don't forget the last section
  if (currentSection) {
    currentSection.content = contentLines.join('\n').trim();
    if (currentSection.content || currentSection.title) {
      sections.push(currentSection);
    }
  }
  
  return sections;
}

interface AccordionSectionProps {
  section: ContentSection;
  defaultOpen?: boolean;
}

function AccordionSection({ section, defaultOpen = false }: AccordionSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-3 px-2 text-left hover:bg-muted/50 transition-colors rounded-lg group"
      >
        <span className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">
          {section.title}
        </span>
        <ChevronDownIcon
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>
      {isOpen && (
        <div className="pb-3 px-2">
          <div className="prose prose-sm prose-slate dark:prose-invert max-w-none text-muted-foreground">
            <MarkdownContent content={section.content} />
          </div>
        </div>
      )}
    </div>
  );
}

interface MarkdownAccordionPreviewProps {
  content: string;
  className?: string;
  /** If true, shows first section open by default */
  firstOpen?: boolean;
}

/**
 * Renders markdown content with collapsible accordion sections.
 * Each ## (h2) header becomes a separate accordion section.
 * Falls back to regular markdown rendering if no sections found.
 */
export function MarkdownAccordionPreview({ 
  content, 
  className,
  firstOpen = true,
}: MarkdownAccordionPreviewProps) {
  const sections = useMemo(() => parseMarkdownSections(content), [content]);

  if (sections.length === 0) {
    // Fallback: no sections found, render as plain markdown
    return (
      <div className={cn('prose prose-sm prose-slate dark:prose-invert max-w-none', className)}>
        <MarkdownContent content={content} />
      </div>
    );
  }

  return (
    <div className={cn('divide-y divide-border rounded-lg border border-border bg-card/50', className)}>
      {sections.map((section, index) => (
        <AccordionSection
          key={section.id}
          section={section}
          defaultOpen={firstOpen && index === 0}
        />
      ))}
    </div>
  );
}
