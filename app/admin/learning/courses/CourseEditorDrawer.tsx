'use client';

import { useState, useEffect, useTransition } from 'react';
import {
  PlusIcon,
  TrashIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  CodeBracketIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline';
import { Button, Input, Textarea } from '@/components/ui';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Tabs } from '@/components/ui/tabs';
import type { LearningCourseRow, TenantOption } from '@/app/actions/learning-admin';
import { createCourse, updateCourse } from '@/app/actions/learning-admin';

// Types for block-based content
interface ContentSection {
  id: string;
  title: string;
  body_markdown: string;
  order: number;
}

interface QuizOption {
  id: string;
  text: string;
  is_correct: boolean;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: QuizOption[];
  explanation?: string;
  order: number;
}

interface CourseRewards {
  dicecoin_amount?: number;
  xp_amount?: number;
  achievement_id?: string;
}

interface CourseEditorDrawerProps {
  open: boolean;
  course: LearningCourseRow | null;
  tenants: TenantOption[];
  isSystemAdmin: boolean;
  currentTenantId?: string;
  onClose: () => void;
  onSave: () => void;
}

const SCOPE_OPTIONS = [
  { value: 'global', label: 'Global', description: 'Synlig för alla organisationer' },
  { value: 'tenant', label: 'Organisation', description: 'Synlig endast inom vald organisation' },
];

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Utkast' },
  { value: 'active', label: 'Aktiv' },
  { value: 'archived', label: 'Arkiverad' },
];

const DIFFICULTY_OPTIONS = [
  { value: '', label: 'Välj nivå...' },
  { value: 'beginner', label: 'Nybörjare' },
  { value: 'intermediate', label: 'Medel' },
  { value: 'advanced', label: 'Avancerad' },
  { value: 'expert', label: 'Expert' },
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[åä]/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function CourseEditorDrawer({
  open,
  course,
  tenants,
  isSystemAdmin,
  currentTenantId,
  onClose,
  onSave,
}: CourseEditorDrawerProps) {
  const isEditing = !!course;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  // Basic form state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'draft' | 'active' | 'archived'>('draft');
  const [difficulty, setDifficulty] = useState<string>('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [passScore, setPassScore] = useState('70');
  const [tags, setTags] = useState('');
  const [scope, setScope] = useState<'global' | 'tenant'>('tenant');
  const [tenantId, setTenantId] = useState<string>('');

  // Block-based content
  const [sections, setSections] = useState<ContentSection[]>([]);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [rewards, setRewards] = useState<CourseRewards>({});

  // Advanced mode JSON
  const [contentJson, setContentJson] = useState('[]');
  const [quizJson, setQuizJson] = useState('[]');
  const [rewardsJson, setRewardsJson] = useState('{}');

  // Parse JSON to blocks and vice versa
  const parseJsonSafe = <T,>(str: string, fallback: T): T => {
    try {
      return JSON.parse(str) as T;
    } catch {
      return fallback;
    }
  };

  const sectionsToJson = (s: ContentSection[]): string => {
    return JSON.stringify(s, null, 2);
  };

  const questionsToJson = (q: QuizQuestion[]): string => {
    return JSON.stringify(q, null, 2);
  };

  const rewardsToJson = (r: CourseRewards): string => {
    return JSON.stringify(r, null, 2);
  };

  // Reset form when course changes or drawer opens
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) {
      if (course) {
        setTitle(course.title);
        setSlug(course.slug);
        setDescription(course.description || '');
        setStatus(course.status);
        setDifficulty(course.difficulty || '');
        setDurationMinutes(course.duration_minutes?.toString() || '');
        setPassScore(course.pass_score.toString());
        setTags(Array.isArray(course.tags) ? (course.tags as string[]).join(', ') : '');
        setScope(course.tenant_id === null ? 'global' : 'tenant');
        setTenantId(course.tenant_id || currentTenantId || '');

        // Parse content blocks
        const parsedSections = parseJsonSafe<ContentSection[]>(
          JSON.stringify(course.content_json),
          []
        );
        setSections(parsedSections);
        setContentJson(JSON.stringify(course.content_json, null, 2));

        const parsedQuestions = parseJsonSafe<QuizQuestion[]>(
          JSON.stringify(course.quiz_json),
          []
        );
        setQuestions(parsedQuestions);
        setQuizJson(JSON.stringify(course.quiz_json, null, 2));

        const parsedRewards = parseJsonSafe<CourseRewards>(
          JSON.stringify(course.rewards_json),
          {}
        );
        setRewards(parsedRewards);
        setRewardsJson(JSON.stringify(course.rewards_json, null, 2));

        setSlugManuallyEdited(true);
      } else {
        setTitle('');
        setSlug('');
        setDescription('');
        setStatus('draft');
        setDifficulty('');
        setDurationMinutes('');
        setPassScore('70');
        setTags('');
        setScope(isSystemAdmin ? 'global' : 'tenant');
        setTenantId(currentTenantId || (tenants[0]?.id ?? ''));
        setSections([]);
        setQuestions([]);
        setRewards({});
        setContentJson('[]');
        setQuizJson('[]');
        setRewardsJson('{}');
        setSlugManuallyEdited(false);
      }
      setError(null);
      setAdvancedMode(false);
      setActiveTab('basic');
    }
  }, [open, course, isSystemAdmin, currentTenantId, tenants]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Sync blocks to JSON when switching to advanced mode
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (advancedMode) {
      setContentJson(sectionsToJson(sections));
      setQuizJson(questionsToJson(questions));
      setRewardsJson(rewardsToJson(rewards));
    }
  }, [advancedMode, sections, questions, rewards]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Sync JSON to blocks when switching back from advanced mode
  const handleAdvancedModeToggle = (checked: boolean) => {
    if (!checked) {
      // Switching from advanced to block mode - parse JSON
      setSections(parseJsonSafe(contentJson, []));
      setQuestions(parseJsonSafe(quizJson, []));
      setRewards(parseJsonSafe(rewardsJson, {}));
    }
    setAdvancedMode(checked);
  };

  // Auto-generate slug from title
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!slugManuallyEdited && title) {
      setSlug(slugify(title));
    }
  }, [title, slugManuallyEdited]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSlugChange = (value: string) => {
    setSlugManuallyEdited(true);
    setSlug(slugify(value));
  };

  // Section management
  const addSection = () => {
    if (sections.length >= 50) return;
    setSections([
      ...sections,
      { id: generateId(), title: '', body_markdown: '', order: sections.length },
    ]);
  };

  const updateSection = (id: string, field: keyof ContentSection, value: string | number) => {
    setSections(sections.map(s => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const removeSection = (id: string) => {
    setSections(sections.filter(s => s.id !== id).map((s, i) => ({ ...s, order: i })));
  };

  const moveSection = (id: string, direction: 'up' | 'down') => {
    const idx = sections.findIndex(s => s.id === id);
    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === sections.length - 1) return;

    const newSections = [...sections];
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    [newSections[idx], newSections[swapIdx]] = [newSections[swapIdx], newSections[idx]];
    setSections(newSections.map((s, i) => ({ ...s, order: i })));
  };

  // Question management
  const addQuestion = () => {
    if (questions.length >= 50) return;
    setQuestions([
      ...questions,
      {
        id: generateId(),
        question: '',
        options: [
          { id: generateId(), text: '', is_correct: true },
          { id: generateId(), text: '', is_correct: false },
        ],
        explanation: '',
        order: questions.length,
      },
    ]);
  };

  const updateQuestion = (id: string, field: keyof QuizQuestion, value: unknown) => {
    setQuestions(questions.map(q => (q.id === id ? { ...q, [field]: value } : q)));
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id).map((q, i) => ({ ...q, order: i })));
  };

  const addOption = (questionId: string) => {
    setQuestions(
      questions.map(q => {
        if (q.id !== questionId) return q;
        if (q.options.length >= 6) return q;
        return {
          ...q,
          options: [...q.options, { id: generateId(), text: '', is_correct: false }],
        };
      })
    );
  };

  const updateOption = (questionId: string, optionId: string, field: keyof QuizOption, value: string | boolean) => {
    setQuestions(
      questions.map(q => {
        if (q.id !== questionId) return q;
        return {
          ...q,
          options: q.options.map(o => {
            if (o.id !== optionId) {
              // If setting this option as correct, make others incorrect
              if (field === 'is_correct' && value === true) {
                return { ...o, is_correct: false };
              }
              return o;
            }
            return { ...o, [field]: value };
          }),
        };
      })
    );
  };

  const removeOption = (questionId: string, optionId: string) => {
    setQuestions(
      questions.map(q => {
        if (q.id !== questionId) return q;
        if (q.options.length <= 2) return q;
        return { ...q, options: q.options.filter(o => o.id !== optionId) };
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!title.trim()) {
      setError('Titel krävs');
      return;
    }
    if (!slug.trim()) {
      setError('Slug krävs');
      return;
    }
    if (scope === 'tenant' && !tenantId) {
      setError('Välj en organisation');
      return;
    }

    // Prepare content data
    const finalContent = advancedMode ? parseJsonSafe(contentJson, []) : sections;
    const finalQuiz = advancedMode ? parseJsonSafe(quizJson, []) : questions;
    const finalRewards = advancedMode ? parseJsonSafe(rewardsJson, {}) : rewards;

    const formData = {
      title: title.trim(),
      slug: slug.trim(),
      description: description.trim() || null,
      status,
      difficulty: (difficulty || null) as 'beginner' | 'intermediate' | 'advanced' | 'expert' | null,
      duration_minutes: durationMinutes ? parseInt(durationMinutes, 10) : null,
      pass_score: parseInt(passScore, 10) || 70,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      scope,
      tenant_id: scope === 'tenant' ? tenantId : null,
      content_json: finalContent,
      quiz_json: finalQuiz,
      rewards_json: finalRewards,
    };

    startTransition(async () => {
      try {
        if (isEditing && course) {
          const result = await updateCourse({ id: course.id, ...formData });
          if (!result.success) {
            setError(result.error || 'Kunde inte uppdatera kursen');
            return;
          }
        } else {
          const result = await createCourse(formData);
          if (!result.success) {
            setError(result.error || 'Kunde inte skapa kursen');
            return;
          }
        }
        onSave();
      } catch (err) {
        setError('Ett oväntat fel uppstod');
        console.error(err);
      }
    });
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Redigera kurs' : 'Skapa ny kurs'}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? 'Uppdatera kursinställningar nedan.'
              : 'Fyll i informationen för att skapa en ny kurs.'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6">
          <Tabs
            tabs={[
              { id: 'basic', label: 'Grundinfo' },
              { id: 'content', label: 'Innehåll' },
              { id: 'quiz', label: 'Quiz' },
              { id: 'rewards', label: 'Belöningar' },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
            className="mb-4"
          />

          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Titel *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="T.ex. Introduktion till Lekbanken"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="t.ex. intro-lekbanken"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Beskrivning</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="En kort beskrivning av kursen..."
                  rows={3}
                />
              </div>

              {isSystemAdmin && (
                <div className="space-y-2">
                  <Label>Scope *</Label>
                  <div className="grid gap-2">
                    {SCOPE_OPTIONS.map((option) => (
                      <label
                        key={option.value}
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                          scope === option.value
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-muted-foreground/50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="scope"
                          value={option.value}
                          checked={scope === option.value}
                          onChange={(e) => setScope(e.target.value as 'global' | 'tenant')}
                          className="mt-1"
                        />
                        <div>
                          <p className="font-medium">{option.label}</p>
                          <p className="text-sm text-muted-foreground">{option.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {scope === 'tenant' && isSystemAdmin && (
                <div className="space-y-2">
                  <Label htmlFor="tenant">Organisation *</Label>
                  <select
                    id="tenant"
                    value={tenantId}
                    onChange={(e) => setTenantId(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    required
                  >
                    <option value="">Välj organisation</option>
                    {tenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {!isSystemAdmin && currentTenantId && (
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-sm text-muted-foreground">
                    Kursen skapas för din organisation.
                  </p>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as typeof status)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="difficulty">Svårighetsgrad</Label>
                  <select
                    id="difficulty"
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {DIFFICULTY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Tid (min)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="1"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    placeholder="15"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="passScore">Godkänt (%)</Label>
                  <Input
                    id="passScore"
                    type="number"
                    min="0"
                    max="100"
                    value={passScore}
                    onChange={(e) => setPassScore(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Taggar</Label>
                <Input
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="säkerhet, grundkurs, obligatorisk"
                />
                <p className="text-xs text-muted-foreground">Separera med komma.</p>
              </div>
            </div>
          )}

          {/* Content Tab */}
          {activeTab === 'content' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Innehållssektioner</Label>
                <div className="flex items-center gap-2">
                  <Label htmlFor="advanced-content" className="text-sm text-muted-foreground">
                    Avancerat
                  </Label>
                  <Switch
                    id="advanced-content"
                    checked={advancedMode}
                    onCheckedChange={handleAdvancedModeToggle}
                  />
                </div>
              </div>

              {advancedMode ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CodeBracketIcon className="h-4 w-4" />
                    JSON-läge
                  </div>
                  <Textarea
                    value={contentJson}
                    onChange={(e) => setContentJson(e.target.value)}
                    rows={12}
                    className="font-mono text-xs"
                    placeholder='[{"id": "s1", "title": "...", "body_markdown": "..."}]'
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  {sections.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border p-6 text-center">
                      <Bars3Icon className="mx-auto h-8 w-8 text-muted-foreground" />
                      <p className="mt-2 text-sm text-muted-foreground">
                        Inga sektioner ännu. Lägg till din första sektion.
                      </p>
                    </div>
                  ) : (
                    sections.map((section, idx) => (
                      <div
                        key={section.id}
                        className="rounded-lg border border-border bg-card p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-muted-foreground">
                            Sektion {idx + 1}
                          </span>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => moveSection(section.id, 'up')}
                              disabled={idx === 0}
                            >
                              <ChevronUpIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => moveSection(section.id, 'down')}
                              disabled={idx === sections.length - 1}
                            >
                              <ChevronDownIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeSection(section.id)}
                            >
                              <TrashIcon className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                        <Input
                          value={section.title}
                          onChange={(e) => updateSection(section.id, 'title', e.target.value)}
                          placeholder="Sektionsrubrik"
                        />
                        <Textarea
                          value={section.body_markdown}
                          onChange={(e) => updateSection(section.id, 'body_markdown', e.target.value)}
                          placeholder="Innehåll (Markdown stöds)"
                          rows={4}
                        />
                      </div>
                    ))
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addSection}
                    disabled={sections.length >= 50}
                    className="w-full"
                  >
                    <PlusIcon className="mr-2 h-4 w-4" />
                    Lägg till sektion
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Quiz Tab */}
          {activeTab === 'quiz' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Quizfrågor</Label>
                <div className="flex items-center gap-2">
                  <Label htmlFor="advanced-quiz" className="text-sm text-muted-foreground">
                    Avancerat
                  </Label>
                  <Switch
                    id="advanced-quiz"
                    checked={advancedMode}
                    onCheckedChange={handleAdvancedModeToggle}
                  />
                </div>
              </div>

              {advancedMode ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CodeBracketIcon className="h-4 w-4" />
                    JSON-läge
                  </div>
                  <Textarea
                    value={quizJson}
                    onChange={(e) => setQuizJson(e.target.value)}
                    rows={12}
                    className="font-mono text-xs"
                    placeholder='[{"id": "q1", "question": "...", "options": [...]}]'
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  {questions.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border p-6 text-center">
                      <p className="text-sm text-muted-foreground">
                        Inga frågor ännu. Lägg till din första fråga.
                      </p>
                    </div>
                  ) : (
                    questions.map((q, qIdx) => (
                      <div
                        key={q.id}
                        className="rounded-lg border border-border bg-card p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Fråga {qIdx + 1}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeQuestion(q.id)}
                          >
                            <TrashIcon className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                        <Input
                          value={q.question}
                          onChange={(e) => updateQuestion(q.id, 'question', e.target.value)}
                          placeholder="Frågetext"
                        />
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Svarsalternativ</Label>
                          {q.options.map((opt, optIdx) => (
                            <div key={opt.id} className="flex items-center gap-2">
                              <input
                                type="radio"
                                name={`correct-${q.id}`}
                                checked={opt.is_correct}
                                onChange={() => updateOption(q.id, opt.id, 'is_correct', true)}
                                title="Markera som korrekt svar"
                              />
                              <Input
                                value={opt.text}
                                onChange={(e) => updateOption(q.id, opt.id, 'text', e.target.value)}
                                placeholder={`Alternativ ${optIdx + 1}`}
                                className="flex-1"
                              />
                              {q.options.length > 2 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeOption(q.id, opt.id)}
                                >
                                  <TrashIcon className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          ))}
                          {q.options.length < 6 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => addOption(q.id)}
                              className="text-xs"
                            >
                              <PlusIcon className="mr-1 h-3 w-3" />
                              Lägg till alternativ
                            </Button>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Förklaring (valfritt)</Label>
                          <Textarea
                            value={q.explanation || ''}
                            onChange={(e) => updateQuestion(q.id, 'explanation', e.target.value)}
                            placeholder="Förklaring som visas efter svar"
                            rows={2}
                          />
                        </div>
                      </div>
                    ))
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addQuestion}
                    disabled={questions.length >= 50}
                    className="w-full"
                  >
                    <PlusIcon className="mr-2 h-4 w-4" />
                    Lägg till fråga
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Rewards Tab */}
          {activeTab === 'rewards' && (
            <div className="space-y-4">
              <Label className="text-base font-medium">Belöningar vid godkänt</Label>

              {advancedMode ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CodeBracketIcon className="h-4 w-4" />
                    JSON-läge
                  </div>
                  <Textarea
                    value={rewardsJson}
                    onChange={(e) => setRewardsJson(e.target.value)}
                    rows={6}
                    className="font-mono text-xs"
                    placeholder='{"dicecoin_amount": 100, "xp_amount": 50}'
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="dicecoin">DiceCoin</Label>
                      <Input
                        id="dicecoin"
                        type="number"
                        min="0"
                        value={rewards.dicecoin_amount ?? ''}
                        onChange={(e) =>
                          setRewards({
                            ...rewards,
                            dicecoin_amount: e.target.value ? parseInt(e.target.value, 10) : undefined,
                          })
                        }
                        placeholder="100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="xp">XP</Label>
                      <Input
                        id="xp"
                        type="number"
                        min="0"
                        value={rewards.xp_amount ?? ''}
                        onChange={(e) =>
                          setRewards({
                            ...rewards,
                            xp_amount: e.target.value ? parseInt(e.target.value, 10) : undefined,
                          })
                        }
                        placeholder="50"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="achievement">Achievement ID (valfritt)</Label>
                    <Input
                      id="achievement"
                      value={rewards.achievement_id ?? ''}
                      onChange={(e) =>
                        setRewards({
                          ...rewards,
                          achievement_id: e.target.value || undefined,
                        })
                      }
                      placeholder="UUID för achievement"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
              {error}
            </div>
          )}

          <SheetFooter className="mt-6 flex-row justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Avbryt
            </Button>
            <Button type="submit" disabled={isPending || !title || !slug}>
              {isPending ? 'Sparar...' : isEditing ? 'Uppdatera' : 'Skapa'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
