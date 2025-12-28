'use client';

import { useMemo, useState } from 'react';
import { Card, Button, Input, Textarea, Select } from '@/components/ui';
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, TrashIcon, SparklesIcon, EyeIcon } from '@heroicons/react/24/outline';
import type { ArtifactFormData, ArtifactVariantFormData, ArtifactVisibility } from '@/types/games';
import type { RoleData } from './RoleEditor';
import { ArtifactWizard } from './ArtifactWizard';

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

const artifactTypeOptions = [
  { value: 'card', label: 'Kort' },
  { value: 'keypad', label: 'Pinkod (Keypad)' },
  { value: 'document', label: 'Dokument' },
  { value: 'image', label: 'Bild' },
];

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
  const [wizardOpen, setWizardOpen] = useState(false);
  const [previewArtifact, setPreviewArtifact] = useState<ArtifactFormData | null>(null);

  const roleOptions = useMemo(
    () => roles.map((r) => ({ value: r.id, label: r.name || 'Roll' })),
    [roles]
  );

  const handleWizardComplete = (artifact: ArtifactFormData) => {
    onChange([...artifacts, artifact]);
    setWizardOpen(false);
  };

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
      {/* Artifact Wizard */}
      <ArtifactWizard
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onComplete={handleWizardComplete}
        roles={roles.map((r) => ({ id: r.id, name: r.name }))}
      />

      {/* Header with buttons */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Artefakter ({artifacts.length})</h3>
          <p className="text-sm text-muted-foreground">Ledtrådar, keypads, dokument och media</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setWizardOpen(true)}>
            <SparklesIcon className="h-4 w-4 mr-1" />
            Wizard
          </Button>
          <Button size="sm" onClick={() => onChange([...artifacts, createArtifact()])}>
            <PlusIcon className="h-4 w-4 mr-1" />
            Lägg till
          </Button>
        </div>
      </div>

      {artifacts.length === 0 && (
        <Card className="p-6 text-center text-muted-foreground">
          <p className="text-sm">Inga artefakter ännu.</p>
          <p className="text-xs mt-1">Använd Wizard för att snabbt skapa artefakter, eller lägg till manuellt.</p>
        </Card>
      )}

      {artifacts.map((artifact, idx) => (
        <Card key={artifact.id} className="p-4 space-y-4 border-border/70">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xl">
                {artifact.artifact_type === 'keypad' ? '🔐' :
                 artifact.artifact_type === 'document' ? '📄' :
                 artifact.artifact_type === 'image' ? '🖼️' : '📇'}
              </span>
              <Input
                value={artifact.title}
                onChange={(e) => updateArtifact(idx, { title: e.target.value })}
                placeholder="Titel"
                className="font-medium"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0"
                onClick={() => moveArtifact(idx, -1)}
                disabled={idx === 0}
              >
                <ArrowUpIcon className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0"
                onClick={() => moveArtifact(idx, 1)}
                disabled={idx === artifacts.length - 1}
              >
                <ArrowDownIcon className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0"
                onClick={() => removeArtifact(idx)}
              >
                <TrashIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Typ</label>
              <Select
                value={artifact.artifact_type}
                onChange={(e) => updateArtifact(idx, { artifact_type: e.target.value })}
                options={artifactTypeOptions}
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

          {/* Keypad-specific configuration */}
          {artifact.artifact_type === 'keypad' && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔐</span>
                <h4 className="text-sm font-semibold text-foreground">Pinkod-inställningar</h4>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Korrekt kod</label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={(artifact.metadata?.correctCode as string) || ''}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      updateArtifact(idx, {
                        metadata: { ...artifact.metadata, correctCode: val },
                      });
                    }}
                    placeholder="1234"
                    maxLength={8}
                  />
                  <p className="text-xs text-muted-foreground">Endast siffror (max 8)</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Kodlängd</label>
                  <Input
                    type="number"
                    min={2}
                    max={8}
                    value={(artifact.metadata?.codeLength as number) || 4}
                    onChange={(e) => {
                      const val = Math.max(2, Math.min(8, parseInt(e.target.value, 10) || 4));
                      updateArtifact(idx, {
                        metadata: { ...artifact.metadata, codeLength: val },
                      });
                    }}
                    placeholder="4"
                  />
                  <p className="text-xs text-muted-foreground">Antal siffror i koden (2-8)</p>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Meddelande vid rätt kod (valfritt)</label>
                <Input
                  value={(artifact.metadata?.successMessage as string) || ''}
                  onChange={(e) =>
                    updateArtifact(idx, {
                      metadata: { ...artifact.metadata, successMessage: e.target.value },
                    })
                  }
                  placeholder="Låst uppnådd! Du har hittat ledtråden."
                />
              </div>

              {/* Advanced keypad settings */}
              <details className="group">
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-2">
                  <span className="group-open:rotate-90 transition-transform">▶</span>
                  Avancerade inställningar
                </summary>
                <div className="mt-3 space-y-4 pl-4 border-l-2 border-amber-500/20">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Max försök</label>
                      <Input
                        type="number"
                        min={0}
                        max={10}
                        value={(artifact.metadata?.maxAttempts as number) || ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : Math.max(0, Math.min(10, parseInt(e.target.value, 10) || 0));
                          updateArtifact(idx, {
                            metadata: { ...artifact.metadata, maxAttempts: val },
                          });
                        }}
                        placeholder="Obegränsat"
                      />
                      <p className="text-xs text-muted-foreground">0 eller tom = obegränsat</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Lås vid misslyckande</label>
                      <Select
                        value={(artifact.metadata?.lockOnFail as boolean) ? 'true' : 'false'}
                        onChange={(e) =>
                          updateArtifact(idx, {
                            metadata: { ...artifact.metadata, lockOnFail: e.target.value === 'true' },
                          })
                        }
                        options={[
                          { value: 'false', label: 'Nej – kan försöka igen' },
                          { value: 'true', label: 'Ja – låses permanent' },
                        ]}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Meddelande vid fel kod</label>
                    <Input
                      value={(artifact.metadata?.failMessage as string) || ''}
                      onChange={(e) =>
                        updateArtifact(idx, {
                          metadata: { ...artifact.metadata, failMessage: e.target.value },
                        })
                      }
                      placeholder="Fel kod! Försök igen."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Meddelande när låst</label>
                    <Input
                      value={(artifact.metadata?.lockedMessage as string) || ''}
                      onChange={(e) =>
                        updateArtifact(idx, {
                          metadata: { ...artifact.metadata, lockedMessage: e.target.value },
                        })
                      }
                      placeholder="Keypaden är låst. Kontakta spelledaren."
                    />
                  </div>
                </div>
              </details>
            </div>
          )}

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
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => updateArtifact(idx, { variants: [...artifact.variants, createVariant()] })}
              >
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
                        size="sm"
                        className="h-9 w-9 p-0"
                        onClick={() => moveVariant(idx, vIdx, -1)}
                        disabled={vIdx === 0}
                      >
                        <ArrowUpIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0"
                        onClick={() => moveVariant(idx, vIdx, 1)}
                        disabled={vIdx === artifact.variants.length - 1}
                      >
                        <ArrowDownIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0"
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

    </div>
  );
}