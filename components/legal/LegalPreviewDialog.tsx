'use client';

import { useMemo, useState } from 'react';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { MarkdownContent } from './MarkdownContent';

interface ContentSection {
  id: string;
  title: string;
  content: string;
}

/**
 * Parse markdown content into sections based on ## (h2) headers.
 * Each main section becomes an accordion with the full title (including numbers).
 * 
 * Handles multiple formats:
 * 1. Standard markdown with ## headers
 * 2. Escaped newlines (\\n instead of real \n)
 * 3. Windows-style line endings (\r\n)
 */
function parseMarkdownSections(markdown: string): ContentSection[] {
  // Normalize the markdown:
  // 1. Replace literal \n strings with actual newlines (in case of escaped storage)
  // 2. Normalize Windows line endings
  let normalized = markdown;
  
  // Check if we have escaped newlines (literal backslash-n)
  if (normalized.includes('\\n') && !normalized.includes('\n')) {
    normalized = normalized.replace(/\\n/g, '\n');
  }
  
  // Normalize Windows line endings
  normalized = normalized.replace(/\r\n/g, '\n');
  
  const lines = normalized.split('\n');
  const sections: ContentSection[] = [];
  let currentSection: ContentSection | null = null;
  let contentLines: string[] = [];

  for (const line of lines) {
    // Match ## headers (h2) - the main section markers
    const mainHeaderMatch = line.match(/^##\s+(.+)$/);
    
    if (mainHeaderMatch) {
      if (currentSection) {
        currentSection.content = contentLines.join('\n').trim();
        if (currentSection.content || currentSection.title) {
          sections.push(currentSection);
        }
      }
      
      // Use the full title as-is (keep numbers like "1. ")
      const title = mainHeaderMatch[1].trim();
      currentSection = {
        id: `section-${sections.length + 1}`,
        title: title || `Sektion ${sections.length + 1}`,
        content: '',
      };
      contentLines = [];
    } else if (currentSection) {
      contentLines.push(line);
    }
  }
  
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
  return (
    <Collapsible defaultOpen={defaultOpen} className="border-b border-border last:border-b-0">
      <CollapsibleTrigger className="w-full flex items-center justify-between py-4 px-6 text-left hover:bg-muted/50 transition-colors group">
        <span className="font-medium text-foreground group-hover:text-primary transition-colors">
          {section.title}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="pb-6 px-6">
        <div className="prose prose-sm prose-slate dark:prose-invert max-w-none text-muted-foreground">
          <MarkdownContent content={section.content} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

interface DocumentPreviewProps {
  title: string;
  version: number;
  contentMarkdown: string;
}

function DocumentPreview({ title, version, contentMarkdown }: DocumentPreviewProps) {
  const [viewMode, setViewMode] = useState<'accordion' | 'fullText'>('accordion');
  const sections = useMemo(() => parseMarkdownSections(contentMarkdown), [contentMarkdown]);

  return (
    <div className="space-y-4">
      {/* Document header with view toggle */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">Version {version}</p>
        </div>
        <div className="flex items-center rounded-lg border border-border bg-muted/50 p-0.5">
          <button
            type="button"
            onClick={() => setViewMode('accordion')}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
              viewMode === 'accordion'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {'Sections'}
          </button>
          <button
            type="button"
            onClick={() => setViewMode('fullText')}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
              viewMode === 'fullText'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {'Full text'}
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="rounded-2xl border border-border bg-card/60 overflow-hidden max-h-[60vh] overflow-y-auto">
        {viewMode === 'fullText' ? (
          <div className="p-8">
            <div className="prose prose-sm prose-slate dark:prose-invert max-w-none pr-4">
              <MarkdownContent content={contentMarkdown} />
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sections.length > 0 ? (
              sections.map((section, index) => (
                <AccordionSection 
                  key={section.id} 
                  section={section}
                  defaultOpen={index === 0}
                />
              ))
            ) : (
              <div className="p-6">
                <div className="prose prose-sm prose-slate dark:prose-invert max-w-none">
                  <MarkdownContent content={contentMarkdown} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface LegalPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: {
    title: string;
    version_int: number;
    content_markdown: string;
  } | null;
}

export function LegalPreviewDialog({ open, onOpenChange, document }: LegalPreviewDialogProps) {
  if (!document) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheckIcon className="size-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                {'PREVIEW'}
              </p>
              <DialogTitle>{'User view of terms'}</DialogTitle>
            </div>
          </div>
          <DialogDescription className="sr-only">
            Preview of how the legal document will appear to users
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-2 -mr-2">
          <DocumentPreview
            title={document.title}
            version={document.version_int}
            contentMarkdown={document.content_markdown}
          />
        </div>

        <div className="flex justify-end pt-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {'Close'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
