'use client';

import { useState, useEffect, useTransition, useCallback, useMemo } from 'react';
import {
  PlusIcon,
  TrashIcon,
  ArrowRightIcon,
  AcademicCapIcon,
  MapIcon,
} from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { Button, Input, Textarea } from '@/components/ui';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Tabs } from '@/components/ui/tabs';
import {
  createPath,
  updatePath,
  listPathNodes,
  listPathEdges,
  addPathNode,
  removePathNode,
  addPathEdge,
  removePathEdge,
  listCoursesForPathEditor,
  type LearningPathRow,
  type LearningPathNodeRow,
  type LearningPathEdgeRow,
  type TenantOption,
} from '@/app/actions/learning-admin';

interface CourseOption {
  id: string;
  title: string;
  slug: string;
  tenant_id: string | null;
}

interface PathEditorDrawerProps {
  open: boolean;
  path: LearningPathRow | null;
  tenants: TenantOption[];
  currentTenantId?: string;
  onClose: () => void;
  onSave: () => void;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[åä]/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

export function PathEditorDrawer({
  open,
  path,
  tenants,
  currentTenantId,
  onClose,
  onSave,
}: PathEditorDrawerProps) {
  const t = useTranslations('admin.learning.paths.editor');
  const isEditing = !!path;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  // Basic form state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'draft' | 'active' | 'archived'>('draft');
  const [kind, setKind] = useState<'onboarding' | 'role' | 'theme' | 'compliance'>('onboarding');
  const [scope, setScope] = useState<'global' | 'tenant'>('global');
  const [tenantId, setTenantId] = useState<string>('');

  // Nodes and edges
  const [nodes, setNodes] = useState<LearningPathNodeRow[]>([]);
  const [edges, setEdges] = useState<LearningPathEdgeRow[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [nodesLoading, setNodesLoading] = useState(false);

  // For adding new node/edge
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedEdgeFrom, setSelectedEdgeFrom] = useState('');
  const [selectedEdgeTo, setSelectedEdgeTo] = useState('');

  const scopeOptions = useMemo(() => ([
    { value: 'global', label: t('scope.global.label'), description: t('scope.global.description') },
    { value: 'tenant', label: t('scope.tenant.label'), description: t('scope.tenant.description') },
  ]), [t]);

  const statusOptions = useMemo(() => ([
    { value: 'draft', label: t('status.draft') },
    { value: 'active', label: t('status.active') },
    { value: 'archived', label: t('status.archived') },
  ]), [t]);

  const kindOptions = useMemo(() => ([
    { value: 'onboarding', label: t('kinds.onboarding') },
    { value: 'role', label: t('kinds.role') },
    { value: 'theme', label: t('kinds.theme') },
    { value: 'compliance', label: t('kinds.compliance') },
  ]), [t]);

  const loadNodesAndEdges = useCallback(async (pathId: string) => {
    setNodesLoading(true);
    try {
      const [nodesData, edgesData] = await Promise.all([
        listPathNodes(pathId),
        listPathEdges(pathId),
      ]);
      setNodes(nodesData);
      setEdges(edgesData);
    } catch (err) {
      console.error('Failed to load nodes/edges:', err);
    } finally {
      setNodesLoading(false);
    }
  }, []);

  // Reset form when path changes or drawer opens
  useEffect(() => {
    if (open) {
      if (path) {
        setTitle(path.title);
        setSlug(path.slug);
        setDescription(path.description || '');
        setStatus(path.status as 'draft' | 'active' | 'archived');
        setKind(path.kind as 'onboarding' | 'role' | 'theme' | 'compliance');
        setScope(path.tenant_id === null ? 'global' : 'tenant');
        setTenantId(path.tenant_id || currentTenantId || '');
        setSlugManuallyEdited(true);
        
        // Load nodes and edges
        loadNodesAndEdges(path.id);
      } else {
        setTitle('');
        setSlug('');
        setDescription('');
        setStatus('draft');
        setKind('onboarding');
        setScope('global');
        setTenantId(currentTenantId || (tenants[0]?.id ?? ''));
        setNodes([]);
        setEdges([]);
        setSlugManuallyEdited(false);
      }
      setError(null);
      setActiveTab('basic');
      setSelectedCourseId('');
      setSelectedEdgeFrom('');
      setSelectedEdgeTo('');
    }
  }, [open, path, currentTenantId, tenants, loadNodesAndEdges]);

  // Auto-generate slug from title
  useEffect(() => {
    if (!slugManuallyEdited && title) {
      setSlug(slugify(title));
    }
  }, [title, slugManuallyEdited]);

  const loadCourses = useCallback(async () => {
    try {
      const result = await listCoursesForPathEditor({
        scope: scope === 'global' ? 'global' : 'all',
        tenantId: scope === 'tenant' ? tenantId : undefined,
      });
      setCourses(result.courses);
    } catch (err) {
      console.error('Failed to load courses:', err);
    }
  }, [scope, tenantId]);

  // Load courses on open and when scope/tenant changes
  useEffect(() => {
    if (open) {
      loadCourses();
    }
  }, [open, loadCourses]);

  const handleSlugChange = (value: string) => {
    setSlugManuallyEdited(true);
    setSlug(slugify(value));
  };

  const handleAddNode = async () => {
    if (!path || !selectedCourseId) return;
    setError(null);
    
    startTransition(async () => {
      const result = await addPathNode({
        path_id: path.id,
        course_id: selectedCourseId,
        position_x: nodes.length * 200, // Simple horizontal layout
        position_y: 100,
      });
      
      if (result.success && result.data) {
        // Fetch the course title for display
        const course = courses.find(c => c.id === selectedCourseId);
        setNodes([...nodes, { ...result.data, course_title: course?.title }]);
        setSelectedCourseId('');
      } else {
        setError(result.error || t('errors.addCourseFailed'));
      }
    });
  };

  const handleRemoveNode = async (nodeId: string) => {
    if (!path) return;
    
    startTransition(async () => {
      const result = await removePathNode(nodeId);
      if (result.success) {
        setNodes(nodes.filter(n => n.id !== nodeId));
        // Also remove any edges connected to this node
        const removedNode = nodes.find(n => n.id === nodeId);
        if (removedNode) {
          setEdges(edges.filter(e => 
            e.from_course_id !== removedNode.course_id && 
            e.to_course_id !== removedNode.course_id
          ));
        }
      } else {
        setError(result.error || t('errors.removeCourseFailed'));
      }
    });
  };

  const handleAddEdge = async () => {
    if (!path || !selectedEdgeFrom || !selectedEdgeTo) return;
    if (selectedEdgeFrom === selectedEdgeTo) {
      setError(t('errors.sameCoursePrereq'));
      return;
    }
    
    startTransition(async () => {
      const result = await addPathEdge({
        path_id: path.id,
        from_course_id: selectedEdgeFrom,
        to_course_id: selectedEdgeTo,
        rule_type: 'completed',
      });
      
      if (result.success && result.data) {
        const fromCourse = courses.find(c => c.id === selectedEdgeFrom);
        const toCourse = courses.find(c => c.id === selectedEdgeTo);
        setEdges([...edges, { 
          ...result.data, 
          from_course_title: fromCourse?.title,
          to_course_title: toCourse?.title,
        }]);
        setSelectedEdgeFrom('');
        setSelectedEdgeTo('');
      } else {
        setError(result.error || t('errors.addPrereqFailed'));
      }
    });
  };

  const handleRemoveEdge = async (edgeId: string) => {
    startTransition(async () => {
      const result = await removePathEdge(edgeId);
      if (result.success) {
        setEdges(edges.filter(e => e.id !== edgeId));
      } else {
        setError(result.error || t('errors.removePrereqFailed'));
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!title.trim()) {
      setError(t('errors.titleRequired'));
      return;
    }
    if (!slug.trim()) {
      setError(t('errors.slugRequired'));
      return;
    }
    if (scope === 'tenant' && !tenantId) {
      setError(t('errors.tenantRequired'));
      return;
    }

    const formData = {
      title: title.trim(),
      slug: slug.trim(),
      description: description.trim() || null,
      status,
      kind,
      scope,
      tenant_id: scope === 'tenant' ? tenantId : null,
    };

    startTransition(async () => {
      try {
        if (isEditing && path) {
          const result = await updatePath({ id: path.id, ...formData });
          if (!result.success) {
            setError(result.error || t('errors.updateFailed'));
            return;
          }
        } else {
          const result = await createPath(formData);
          if (!result.success) {
            setError(result.error || t('errors.createFailed'));
            return;
          }
        }
        onSave();
      } catch (err) {
        setError(t('errors.unexpected'));
        console.error(err);
      }
    });
  };

  // Get courses that are in this path (as nodes)
  const coursesInPath = nodes.map(n => n.course_id);

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? t('title.edit') : t('title.create')}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? t('description.edit')
              : t('description.create')}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6">
          <Tabs
            tabs={[
              { id: 'basic', label: t('tabs.basic') },
              { id: 'nodes', label: t('tabs.courses'), disabled: !isEditing },
              { id: 'edges', label: t('tabs.prerequisites'), disabled: !isEditing },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
            className="mb-4"
          />

          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">{t('fields.title')}</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('fields.titlePlaceholder')}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">{t('fields.slug')}</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder={t('fields.slugPlaceholder')}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t('fields.description')}</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('fields.descriptionPlaceholder')}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('fields.scope')}</Label>
                <div className="grid gap-2">
                  {scopeOptions.map((option) => (
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

              {scope === 'tenant' && (
                <div className="space-y-2">
                  <Label htmlFor="tenant">{t('fields.tenant')}</Label>
                  <select
                    id="tenant"
                    value={tenantId}
                    onChange={(e) => setTenantId(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    required
                  >
                    <option value="">{t('fields.tenantPlaceholder')}</option>
                    {tenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="status">{t('fields.status')}</Label>
                  <select
                    id="status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as typeof status)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="kind">{t('fields.kind')}</Label>
                  <select
                    id="kind"
                    value={kind}
                    onChange={(e) => setKind(e.target.value as 'onboarding' | 'role' | 'theme' | 'compliance')}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {kindOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Nodes (Courses) Tab */}
          {activeTab === 'nodes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">{t('nodes.title')}</Label>
                <Badge variant="secondary">{t('nodes.count', { count: nodes.length })}</Badge>
              </div>

              {nodesLoading ? (
                <div className="text-center text-muted-foreground py-4">{t('nodes.loading')}</div>
              ) : (
                <>
                  {/* Current nodes */}
                  <div className="space-y-2">
                    {nodes.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border p-6 text-center">
                        <AcademicCapIcon className="mx-auto h-8 w-8 text-muted-foreground" />
                        <p className="mt-2 text-sm text-muted-foreground">
                          {t('nodes.empty')}
                        </p>
                      </div>
                    ) : (
                      nodes.map((node, idx) => (
                        <div
                          key={node.id}
                          className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10 text-sm font-medium">
                              {idx + 1}
                            </div>
                            <span className="font-medium">{node.course_title || t('nodes.courseFallback')}</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveNode(node.id)}
                            disabled={isPending}
                          >
                            <TrashIcon className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add course selector */}
                  <div className="flex gap-2">
                    <select
                      value={selectedCourseId}
                      onChange={(e) => setSelectedCourseId(e.target.value)}
                      className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">{t('nodes.addCoursePlaceholder')}</option>
                      {courses
                        .filter(c => !coursesInPath.includes(c.id))
                        .map((course) => (
                          <option key={course.id} value={course.id}>
                            {course.title} {course.tenant_id ? t('nodes.courseScope.org') : t('nodes.courseScope.global')}
                          </option>
                        ))}
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddNode}
                      disabled={!selectedCourseId || isPending}
                    >
                      <PlusIcon className="h-4 w-4 mr-1" />
                      {t('nodes.add')}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Edges (Prerequisites) Tab */}
          {activeTab === 'edges' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">{t('edges.title')}</Label>
                <Badge variant="secondary">{t('edges.count', { count: edges.length })}</Badge>
              </div>

              <p className="text-sm text-muted-foreground">{t('edges.description')}</p>

              {/* Current edges */}
              <div className="space-y-2">
                {edges.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-6 text-center">
                    <MapIcon className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      {t('edges.empty')}
                    </p>
                  </div>
                ) : (
                  edges.map((edge) => (
                    <div
                      key={edge.id}
                      className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
                    >
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{edge.from_course_title || t('edges.courseFallback')}</span>
                        <ArrowRightIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{edge.to_course_title || t('edges.courseFallback')}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveEdge(edge.id)}
                        disabled={isPending}
                      >
                        <TrashIcon className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))
                )}
              </div>

              {/* Add edge selectors */}
              {nodes.length >= 2 && (
                <div className="space-y-2 rounded-lg border border-border p-4">
                  <Label className="text-sm">{t('edges.addTitle')}</Label>
                  <div className="flex flex-wrap gap-2 items-center">
                    <select
                      value={selectedEdgeFrom}
                      onChange={(e) => setSelectedEdgeFrom(e.target.value)}
                      className="flex-1 min-w-[150px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">{t('edges.addFromPlaceholder')}</option>
                      {nodes.map((node) => (
                        <option key={node.id} value={node.course_id}>
                          {node.course_title}
                        </option>
                      ))}
                    </select>
                    <ArrowRightIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <select
                      value={selectedEdgeTo}
                      onChange={(e) => setSelectedEdgeTo(e.target.value)}
                      className="flex-1 min-w-[150px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">{t('edges.addToPlaceholder')}</option>
                      {nodes
                        .filter(n => n.course_id !== selectedEdgeFrom)
                        .map((node) => (
                          <option key={node.id} value={node.course_id}>
                            {node.course_title}
                          </option>
                        ))}
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddEdge}
                      disabled={!selectedEdgeFrom || !selectedEdgeTo || isPending}
                    >
                      <PlusIcon className="h-4 w-4 mr-1" />
                      {t('edges.add')}
                    </Button>
                  </div>
                </div>
              )}

              {nodes.length < 2 && (
                <p className="text-sm text-amber-600 dark:text-amber-400">{t('edges.minimumNotice')}</p>
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
              {isEditing ? t('actions.close') : t('actions.cancel')}
            </Button>
            <Button type="submit" disabled={isPending || !title || !slug}>
              {isPending ? t('actions.saving') : isEditing ? t('actions.save') : t('actions.create')}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
