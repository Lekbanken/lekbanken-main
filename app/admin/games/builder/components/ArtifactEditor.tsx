'use client';

import { useMemo } from 'react';
import { Card, Button, Input, Textarea, Select } from '@/components/ui';
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import type { ArtifactFormData, ArtifactVariantFormData, ArtifactVisibility } from '@/types/games';
import type { RoleData } from './RoleEditor';

type ArtifactEditorProps = {
  artifacts: ArtifactFormData[];
  roles: RoleData[];
  stepCount: number;
  phaseCount: number;
  onChange: (artifacts: ArtifactFormData[]) => void;
};

const visibilityOptions = [
  { value: 'public', label: 'Synlig för alla' },
  { value: 'leader_only', label: 'Endast lekledare' },
  { value: 'role_private', label: 'Privat för roll' },
] satisfies { value: ArtifactVisibility; label: string }[];

const makeId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2, 9)}`;

function createVariant(): ArtifactVariantFormData {
  return {
    id: makeId(),
    title: '',
    body: '',
    media_ref: '',
    visibility: 'public',
    visible_to_role_id: null,
    step_index: null,
    phase_index: null,
    metadata: null,
  };
}

function createArtifact(): ArtifactFormData {
  return {
    id: makeId(),
    title: 'Ny artefakt',
    description: '',
    artifact_type: 'card',
    tags: [],
    metadata: null,
    variants: [createVariant()],
  };
}

export function ArtifactEditor({ artifacts, roles, stepCount, phaseCount, onChange }: ArtifactEditorProps) {
  const roleOptions = useMemo(
    () => roles.map((r) => ({ value: r.id, label: r.name || 'Roll' })),
    [roles]
  );

  const updateArtifact = (index: number, next: Partial<ArtifactFormData>) => {
    const draft = [...artifacts];
    draft[index] = { ...draft[index], ...next };
    onChange(draft);
  };

  const updateVariant = (artifactIndex: number, variantIndex: number, next: Partial<ArtifactVariantFormData>) => {
    const draft = [...artifacts];
    const variants = [...draft[artifactIndex].variants];
    variants[variantIndex] = { ...variants[variantIndex], ...next };
    draft[artifactIndex] = { ...draft[artifactIndex], variants };
    onChange(draft);
  };

  const moveArtifact = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= artifacts.length) return;
    const draft = [...artifacts];
    const [item] = draft.splice(index, 1);
    draft.splice(target, 0, item);
    onChange(draft);
  };

  const moveVariant = (artifactIndex: number, variantIndex: number, direction: -1 | 1) => {
    const target = variantIndex + direction;
    const variants = artifacts[artifactIndex]?.variants ?? [];
    if (target < 0 || target >= variants.length) return;
    const nextVariants = [...variants];
    const [item] = nextVariants.splice(variantIndex, 1);
    nextVariants.splice(target, 0, item);
    updateArtifact(artifactIndex, { variants: nextVariants });
  };

  const removeArtifact = (index: number) => {
    const draft = [...artifacts];
    draft.splice(index, 1);
    onChange(draft);
  };

  const removeVariant = (artifactIndex: number, variantIndex: number) => {
    const variants = artifacts[artifactIndex]?.variants ?? [];
    if (variants.length <= 1) return;
    const nextVariants = [...variants];
    nextVariants.splice(variantIndex, 1);
    updateArtifact(artifactIndex, { variants: nextVariants });
  };

  return (
    <div className="space-y-4">
      {artifacts.map((artifact, idx) => (
        <Card key={artifact.id} className="p-4 space-y-4 border-border/70">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Artefakt</p>
              <Input
                value={artifact.title}
                onChange={(e) => updateArtifact(idx, { title: e.target.value })}
                placeholder="Titel"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="icon" onClick={() => moveArtifact(idx, -1)} disabled={idx === 0}>
                <ArrowUpIcon className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => moveArtifact(idx, 1)}
                disabled={idx === artifacts.length - 1}
              >
                <ArrowDownIcon className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" onClick={() => removeArtifact(idx)}>
                <TrashIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Typ</label>
              <Input
                value={artifact.artifact_type}
                onChange={(e) => updateArtifact(idx, { artifact_type: e.target.value })}
                placeholder="card"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Taggar (komma-separerade)</label>
              <Input
                value={artifact.tags.join(', ')}
                onChange={(e) =>
                  updateArtifact(idx, {
                    tags: e.target.value
                      .split(',')
                      .map((t) => t.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="mystery, clue"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Beskrivning</label>
            <Textarea
              value={artifact.description}
              onChange={(e) => updateArtifact(idx, { description: e.target.value })}
              rows={3}
              placeholder="Kort bakgrund eller anteckningar"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Varianter</p>
                <p className="text-xs text-muted-foreground">Styr synlighet, rollåtkomst och när varianten kan låsas upp.</p>
              </div>
              <Button type="button" size="sm" variant="secondary" onClick={() => updateArtifact(idx, { variants: [...artifact.variants, createVariant()] })}>
                <PlusIcon className="h-4 w-4 mr-1.5" /> Lägg till variant
              </Button>
            </div>

            <div className="space-y-3">
              {artifact.variants.map((variant, vIdx) => (
                <div key={variant.id} className="rounded-lg border border-border/70 p-3 space-y-3 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                        {vIdx + 1}
                      </span>
                      Variant
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => moveVariant(idx, vIdx, -1)}
                        disabled={vIdx === 0}
                      >
                        <ArrowUpIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => moveVariant(idx, vIdx, 1)}
                        disabled={vIdx === artifact.variants.length - 1}
                      >
                        <ArrowDownIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeVariant(idx, vIdx)}
                        disabled={artifact.variants.length <= 1}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Titel</label>
                      <Input
                        value={variant.title}
                        onChange={(e) => updateVariant(idx, vIdx, { title: e.target.value })}
                        placeholder="Varianttitel"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Synlighet</label>
                      <Select
                        value={variant.visibility}
                        onChange={(e) => updateVariant(idx, vIdx, { visibility: e.target.value as ArtifactVisibility })}
                        options={visibilityOptions}
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Roll (för privat variant)</label>
                      <Select
                        value={variant.visible_to_role_id ?? ''}
                        onChange={(e) => updateVariant(idx, vIdx, { visible_to_role_id: e.target.value || null })}
                        options={[{ value: '', label: 'Ingen (syns enligt synlighet)' }, ...roleOptions]}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Mediareferens (valfri)</label>
                      <Input
                        value={variant.media_ref}
                        onChange={(e) => updateVariant(idx, vIdx, { media_ref: e.target.value })}
                        placeholder="media_id eller URL"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Text/innehåll</label>
                    <Textarea
                      value={variant.body}
                      onChange={(e) => updateVariant(idx, vIdx, { body: e.target.value })}
                      rows={4}
                      placeholder="Vad visar denna variant?"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Steg-index (0 = första)</label>
                      <Input
                        type="number"
                        min={0}
                        max={Math.max(0, stepCount - 1)}
                        value={variant.step_index ?? ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : Number(e.target.value);
                          updateVariant(idx, vIdx, { step_index: Number.isFinite(val) ? val : null });
                        }}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Fas-index (0 = första)</label>
                      <Input
                        type="number"
                        min={0}
                        max={Math.max(0, phaseCount - 1)}
                        value={variant.phase_index ?? ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : Number(e.target.value);
                          updateVariant(idx, vIdx, { phase_index: Number.isFinite(val) ? val : null });
                        }}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      ))}

      <div className="flex justify-start">
        <Button type="button" onClick={() => onChange([...artifacts, createArtifact()])}>
          <PlusIcon className="h-4 w-4 mr-1.5" /> Lägg till artefakt
        </Button>
      </div>
    </div>
  );
}