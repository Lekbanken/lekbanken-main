'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { CheckIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { cn } from '@/lib/utils';
import { PageTitleHeader } from '@/components/app/PageTitleHeader';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { MarkdownContent } from '@/components/legal/MarkdownContent';

// =============================================================================
// Types
// =============================================================================

interface LegalDocument {
  id: string;
  title: string;
  content_markdown: string;
  version_int: number;
  type: string;
}

interface LegalAcceptWizardProps {
  documents: LegalDocument[];
  redirectTo: string;
  onAccept: (formData: FormData) => Promise<{ success: boolean; error?: string; redirectTo?: string }>;
}

// =============================================================================
// Utility: Parse markdown into sections based on headers
// =============================================================================

interface ContentSection {
  id: string;
  title: string;
  content: string;
}

/**
 * Parse markdown content into sections based on ## (h2) headers.
 * Each main section (## header) becomes an accordion.
 * Subsections (### headers) are included in the content of their parent section.
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
    // Only match ## headers (h2) for main sections, not # or ###
    const mainHeaderMatch = line.match(/^##\s+(.+)$/);
    
    if (mainHeaderMatch) {
      // Save previous section if exists
      if (currentSection) {
        currentSection.content = contentLines.join('\n').trim();
        if (currentSection.content || currentSection.title) {
          sections.push(currentSection);
        }
      }
      
      // Start new section - use the full title as-is (keep numbers like "1. ")
      const title = mainHeaderMatch[1].trim();
      currentSection = {
        id: `section-${sections.length + 1}`,
        title: title || `Sektion ${sections.length + 1}`,
        content: '',
      };
      contentLines = [];
    } else if (currentSection) {
      // Include all other content (including ### subsections) in the current section
      contentLines.push(line);
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

// =============================================================================
// Tab Selector Component (Mobile dropdown / Desktop tabs)
// =============================================================================

interface TabSelectorProps {
  documents: LegalDocument[];
  activeDocId: string;
  acceptedDocs: Set<string>;
  onSelect: (docId: string) => void;
  selectLabel: string;
}

function TabSelector({ documents, activeDocId, acceptedDocs, onSelect, selectLabel }: TabSelectorProps) {
  if (documents.length === 1) return null;
  
  return (
    <div className="mb-6">
      {/* Mobile: Dropdown select */}
      <div className="sm:hidden">
        <Select
          value={activeDocId}
          onChange={(e) => onSelect(e.target.value)}
          aria-label={selectLabel}
          options={documents.map((doc) => ({
            value: doc.id,
            label: `${acceptedDocs.has(doc.id) ? '✓ ' : ''}${doc.title}`,
          }))}
        />
      </div>
      
      {/* Desktop: Tab buttons */}
      <div className="hidden sm:block">
        <div className="border-b border-border">
          <nav aria-label="Villkor" className="-mb-px flex">
            {documents.map((doc) => {
              const isActive = doc.id === activeDocId;
              const isAccepted = acceptedDocs.has(doc.id);
              
              return (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => onSelect(doc.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-2 flex-1 border-b-2 px-4 py-4 text-center text-sm font-medium transition-colors',
                    isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:border-muted hover:text-foreground'
                  )}
                >
                  {isAccepted && (
                    <CheckCircleIcon className="size-5 text-green-500 shrink-0" />
                  )}
                  <span className="truncate">{doc.title}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Accordion Section Component
// =============================================================================

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

// =============================================================================
// Document Content Component
// =============================================================================

interface DocumentContentProps {
  document: LegalDocument;
  isAccepted: boolean;
  onAcceptChange: (accepted: boolean) => void;
  versionLabel: string;
  acceptCheckboxLabel: string;
  acceptedLabel: string;
  viewModeLabels: {
    accordion: string;
    fullText: string;
  };
}

function DocumentContent({ 
  document, 
  isAccepted, 
  onAcceptChange,
  versionLabel,
  acceptCheckboxLabel,
  acceptedLabel,
  viewModeLabels,
}: DocumentContentProps) {
  const [viewMode, setViewMode] = useState<'accordion' | 'fullText'>('accordion');
  const sections = useMemo(() => parseMarkdownSections(document.content_markdown), [document.content_markdown]);
  
  return (
    <div className="space-y-6">
      {/* Document header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold text-foreground">{document.title}</h2>
          <p className="text-sm text-muted-foreground mt-1">{versionLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          {isAccepted && (
            <div className="flex items-center gap-1.5 text-green-600 bg-green-50 dark:bg-green-950/30 px-3 py-1.5 rounded-full text-sm font-medium shrink-0">
              <CheckCircleIcon className="size-4" />
              <span>{acceptedLabel}</span>
            </div>
          )}
          {/* View mode toggle */}
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
              {viewModeLabels.accordion}
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
              {viewModeLabels.fullText}
            </button>
          </div>
        </div>
      </div>
      
      {/* Content area */}
      <div className="rounded-2xl border border-border bg-card/60 overflow-hidden">
        {viewMode === 'fullText' ? (
          /* Full text view - scrollable document */
          <div className="p-8 max-h-[60vh] overflow-y-auto">
            <div className="prose prose-sm prose-slate dark:prose-invert max-w-none pr-4">
              <MarkdownContent content={document.content_markdown} />
            </div>
          </div>
        ) : (
          /* Accordion view */
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
              /* Fallback: show full content if no sections parsed */
              <div className="p-6">
                <div className="prose prose-sm prose-slate dark:prose-invert max-w-none">
                  <MarkdownContent content={document.content_markdown} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Accept checkbox */}
      <label className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card cursor-pointer hover:border-primary/40 transition-colors group">
        <input
          type="checkbox"
          checked={isAccepted}
          onChange={(e) => onAcceptChange(e.target.checked)}
          className="mt-0.5 h-5 w-5 rounded border-2 border-muted-foreground/40 text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer"
        />
        <span className="text-sm text-foreground group-hover:text-foreground/90">
          {acceptCheckboxLabel}
        </span>
      </label>
    </div>
  );
}

// =============================================================================
// Progress Footer Component
// =============================================================================

interface ProgressFooterProps {
  documents: LegalDocument[];
  acceptedDocs: Set<string>;
  canSubmit: boolean;
  isSubmitting: boolean;
  onSubmit: () => void;
  acceptButtonLabel: string;
  progressLabel: string;
  processingLabel: string;
}

function ProgressFooter({ 
  documents, 
  acceptedDocs, 
  canSubmit, 
  isSubmitting,
  onSubmit,
  acceptButtonLabel,
  progressLabel,
  processingLabel,
}: ProgressFooterProps) {
  const acceptedCount = acceptedDocs.size;
  const totalCount = documents.length;
  const progressPercent = totalCount > 0 ? (acceptedCount / totalCount) * 100 : 0;
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border shadow-lg z-50">
      <div className="container mx-auto max-w-4xl px-4 py-4">
        {/* Progress indicator */}
        <div className="flex items-center justify-between gap-6">
          {/* Steps visualization */}
          <div className="flex-1 hidden sm:block">
            <div className="flex items-center gap-2">
              {documents.map((doc, index) => {
                const isComplete = acceptedDocs.has(doc.id);
                
                return (
                  <div key={doc.id} className="flex items-center gap-2 flex-1 last:flex-none">
                    <div
                      className={cn(
                        'flex size-8 items-center justify-center rounded-full text-sm font-medium shrink-0 transition-colors',
                        isComplete
                          ? 'bg-green-500 text-white'
                          : 'border-2 border-muted-foreground/30 text-muted-foreground'
                      )}
                    >
                      {isComplete ? (
                        <CheckIcon className="size-4" />
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </div>
                    {index < documents.length - 1 && (
                      <div 
                        className={cn(
                          'h-0.5 flex-1 rounded-full transition-colors',
                          isComplete ? 'bg-green-500' : 'bg-muted'
                        )}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {progressLabel}
            </div>
          </div>
          
          {/* Mobile progress bar */}
          <div className="flex-1 sm:hidden">
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="mt-1.5 text-xs text-muted-foreground">
              {progressLabel}
            </div>
          </div>
          
          <Button
            type="button"
            size="lg"
            disabled={!canSubmit || isSubmitting}
            onClick={onSubmit}
            className="shrink-0"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>{processingLabel}</span>
              </span>
            ) : (
              acceptButtonLabel
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Main Wizard Component
// =============================================================================

export function LegalAcceptWizard({ documents, redirectTo, onAccept }: LegalAcceptWizardProps) {
  const t = useTranslations('legal.accept');
  const router = useRouter();
  
  const [activeDocId, setActiveDocId] = useState(documents[0]?.id ?? '');
  const [acceptedDocs, setAcceptedDocs] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const activeDoc = documents.find(d => d.id === activeDocId);
  const allAccepted = documents.every(doc => acceptedDocs.has(doc.id));
  
  const handleAcceptChange = (docId: string, accepted: boolean) => {
    setAcceptedDocs(prev => {
      const next = new Set(prev);
      if (accepted) {
        next.add(docId);
      } else {
        next.delete(docId);
      }
      return next;
    });
  };
  
  const handleSubmit = async () => {
    if (!allAccepted || isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      const formData = new FormData();
      formData.append('redirectTo', redirectTo);
      
      for (const doc of documents) {
        formData.append(`accept_${doc.id}`, 'on');
        formData.append('documentId', doc.id);
      }
      
      const result = await onAccept(formData);
      
      if (!result.success) {
        console.error('Error accepting legal documents:', result.error);
        setIsSubmitting(false);
        return;
      }
      
      // Use the redirect URL from the result, or fall back to prop
      const targetUrl = result.redirectTo || redirectTo;
      
      // Use window.location for cross-origin redirects (e.g., demo.lekbanken.no)
      // and router.push for same-origin relative paths
      if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
        window.location.href = targetUrl;
      } else {
        router.push(targetUrl);
      }
    } catch (error) {
      console.error('Error accepting legal documents:', error);
      setIsSubmitting(false);
    }
  };
  
  // Auto-advance to next document when one is accepted (optional UX enhancement)
  const handleDocumentAccepted = (docId: string, accepted: boolean) => {
    handleAcceptChange(docId, accepted);
    
    if (accepted && documents.length > 1) {
      const currentIndex = documents.findIndex(d => d.id === docId);
      const nextUnaccepted = documents.find((d, i) => i > currentIndex && !acceptedDocs.has(d.id) && d.id !== docId);
      if (nextUnaccepted) {
        // Small delay for visual feedback
        setTimeout(() => setActiveDocId(nextUnaccepted.id), 300);
      }
    }
  };
  
  return (
    <div className="pb-32">
      {/* Page header */}
      <PageTitleHeader
        icon={<ShieldCheckIcon className="size-6" />}
        title={t('header')}
        subtitle={t('title')}
        className="mb-6"
      />
      
      <p className="text-muted-foreground mb-8">{t('intro')}</p>
      
      {/* Document tabs */}
      <TabSelector
        documents={documents}
        activeDocId={activeDocId}
        acceptedDocs={acceptedDocs}
        onSelect={setActiveDocId}
        selectLabel={t('selectDocument')}
      />
      
      {/* Active document content */}
      {activeDoc && (
        <DocumentContent
          document={activeDoc}
          isAccepted={acceptedDocs.has(activeDoc.id)}
          onAcceptChange={(accepted) => handleDocumentAccepted(activeDoc.id, accepted)}
          versionLabel={t('versionLabel', { version: activeDoc.version_int })}
          acceptCheckboxLabel={t('acceptCheckbox', { title: activeDoc.title })}
          acceptedLabel={t('accepted')}
          viewModeLabels={{
            accordion: t('viewAccordion'),
            fullText: t('viewFullText'),
          }}
        />
      )}
      
      {/* Sticky progress footer */}
      <ProgressFooter
        documents={documents}
        acceptedDocs={acceptedDocs}
        canSubmit={allAccepted}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
        acceptButtonLabel={t('acceptButton')}
        progressLabel={t('progressLabel', { accepted: acceptedDocs.size, total: documents.length })}
        processingLabel={t('processing')}
      />
    </div>
  );
}
