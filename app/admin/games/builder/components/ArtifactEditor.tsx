'use client';

import { useMemo, useState } from 'react';
import { Card, Button, Input, Textarea, Select } from '@/components/ui';
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, TrashIcon, SparklesIcon } from '@heroicons/react/24/outline';
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
  // Grundläggande
  { value: 'card', label: 'Kort' },
  { value: 'document', label: 'Dokument' },
  { value: 'image', label: 'Bild' },
  // Kod & Input
  { value: 'keypad', label: '🔐 Pinkod (Keypad)' },
  { value: 'riddle', label: '❓ Gåta / Fråga' },
  { value: 'multi_answer', label: '✅ Flervalssvar' },
  // Media & Interaktion
  { value: 'audio', label: '🔊 Ljudklipp' },
  { value: 'hotspot', label: '🎯 Klickbar bild (Hotspot)' },
  { value: 'tile_puzzle', label: '🧩 Pusselspel' },
  // Kryptografi & Logik
  { value: 'cipher', label: '🔤 Kryptering / Chiffer' },
  { value: 'logic_grid', label: '🧠 Logikrutnät' },
  // Speciella
  { value: 'counter', label: '🔢 Räknare' },
  { value: 'qr_gate', label: '📱 QR/NFC-skanning' },
  { value: 'hint_container', label: '💡 Tips-behållare' },
  { value: 'prop_confirmation', label: '📦 Rekvisita-bekräftelse' },
  { value: 'location_check', label: '📍 Platsverifiering' },
  { value: 'sound_level', label: '🎤 Ljudnivå-detektor' },
  { value: 'replay_marker', label: '⏱️ Replay-markör' },
  // Session Cockpit (Task 2.1-2.3)
  { value: 'signal_generator', label: '📢 Signalgenerator' },
  { value: 'time_bank_step', label: '⏳ Tidsbank / Final timer' },
  { value: 'empty_artifact', label: '📦 Tom slot (placeholder)' },
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

          {/* Riddle configuration */}
          {artifact.artifact_type === 'riddle' && (
            <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">❓</span>
                <h4 className="text-sm font-semibold text-foreground">Gåta / Fråga-inställningar</h4>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Fråga / Ledtråd</label>
                <Textarea
                  value={(artifact.metadata?.prompt as string) || ''}
                  onChange={(e) =>
                    updateArtifact(idx, {
                      metadata: { ...artifact.metadata, prompt: e.target.value },
                    })
                  }
                  rows={2}
                  placeholder="Vad har fyra ben men kan inte gå?"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Korrekta svar (ett per rad)</label>
                <Textarea
                  value={((artifact.metadata?.correctAnswers as string[]) || []).join('\n')}
                  onChange={(e) =>
                    updateArtifact(idx, {
                      metadata: {
                        ...artifact.metadata,
                        correctAnswers: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                      },
                    })
                  }
                  rows={3}
                  placeholder="bord&#10;ett bord&#10;table"
                />
                <p className="text-xs text-muted-foreground">Flera alternativ = alla godkänns</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Matchningsläge</label>
                  <Select
                    value={(artifact.metadata?.normalizeMode as string) || 'fuzzy'}
                    onChange={(e) =>
                      updateArtifact(idx, {
                        metadata: { ...artifact.metadata, normalizeMode: e.target.value },
                      })
                    }
                    options={[
                      { value: 'strict', label: 'Exakt matchning' },
                      { value: 'fuzzy', label: 'Flexibel (ignorera versaler/mellanslag)' },
                      { value: 'numeric', label: 'Endast siffror' },
                    ]}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Max försök</label>
                  <Input
                    type="number"
                    min={0}
                    max={20}
                    value={(artifact.metadata?.maxAttempts as number) || ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? null : Math.max(0, parseInt(e.target.value, 10) || 0);
                      updateArtifact(idx, {
                        metadata: { ...artifact.metadata, maxAttempts: val },
                      });
                    }}
                    placeholder="Obegränsat"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Counter configuration */}
          {artifact.artifact_type === 'counter' && (
            <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔢</span>
                <h4 className="text-sm font-semibold text-foreground">Räknare-inställningar</h4>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Startvärde</label>
                  <Input
                    type="number"
                    value={(artifact.metadata?.initialValue as number) ?? 0}
                    onChange={(e) =>
                      updateArtifact(idx, {
                        metadata: { ...artifact.metadata, initialValue: parseInt(e.target.value, 10) || 0 },
                      })
                    }
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Målvärde</label>
                  <Input
                    type="number"
                    min={1}
                    value={(artifact.metadata?.target as number) || ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? null : parseInt(e.target.value, 10) || 1;
                      updateArtifact(idx, {
                        metadata: { ...artifact.metadata, target: val },
                      });
                    }}
                    placeholder="5"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Stegstorlek</label>
                  <Input
                    type="number"
                    min={1}
                    value={(artifact.metadata?.step as number) ?? 1}
                    onChange={(e) =>
                      updateArtifact(idx, {
                        metadata: { ...artifact.metadata, step: parseInt(e.target.value, 10) || 1 },
                      })
                    }
                    placeholder="1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Etikett (valfritt)</label>
                <Input
                  value={(artifact.metadata?.label as string) || ''}
                  onChange={(e) =>
                    updateArtifact(idx, {
                      metadata: { ...artifact.metadata, label: e.target.value },
                    })
                  }
                  placeholder="Hittade ledtrådar"
                />
              </div>
            </div>
          )}

          {/* Audio configuration */}
          {artifact.artifact_type === 'audio' && (
            <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔊</span>
                <h4 className="text-sm font-semibold text-foreground">Ljudklipp-inställningar</h4>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Ljud-URL</label>
                <Input
                  value={(artifact.metadata?.audioUrl as string) || ''}
                  onChange={(e) =>
                    updateArtifact(idx, {
                      metadata: { ...artifact.metadata, audioUrl: e.target.value },
                    })
                  }
                  placeholder="https://example.com/audio.mp3"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Autoplay</label>
                  <Select
                    value={(artifact.metadata?.autoplay as boolean) ? 'true' : 'false'}
                    onChange={(e) =>
                      updateArtifact(idx, {
                        metadata: { ...artifact.metadata, autoplay: e.target.value === 'true' },
                      })
                    }
                    options={[
                      { value: 'false', label: 'Nej – deltagaren startar' },
                      { value: 'true', label: 'Ja – spela automatiskt' },
                    ]}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Kräv bekräftelse</label>
                  <Select
                    value={(artifact.metadata?.requireAck as boolean) ? 'true' : 'false'}
                    onChange={(e) =>
                      updateArtifact(idx, {
                        metadata: { ...artifact.metadata, requireAck: e.target.value === 'true' },
                      })
                    }
                    options={[
                      { value: 'false', label: 'Nej' },
                      { value: 'true', label: 'Ja – "Jag har lyssnat"' },
                    ]}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Hotspot configuration */}
          {artifact.artifact_type === 'hotspot' && (
            <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">🎯</span>
                <h4 className="text-sm font-semibold text-foreground">Klickbar bild-inställningar</h4>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Bild-URL</label>
                <Input
                  value={(artifact.metadata?.imageUrl as string) || ''}
                  onChange={(e) =>
                    updateArtifact(idx, {
                      metadata: { ...artifact.metadata, imageUrl: e.target.value },
                    })
                  }
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Antal zoner att hitta</label>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={(artifact.metadata?.requiredHits as number) || ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? null : parseInt(e.target.value, 10);
                      updateArtifact(idx, {
                        metadata: { ...artifact.metadata, requiredHits: val },
                      });
                    }}
                    placeholder="Alla"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Visa feedback</label>
                  <Select
                    value={(artifact.metadata?.showFeedback as boolean) !== false ? 'true' : 'false'}
                    onChange={(e) =>
                      updateArtifact(idx, {
                        metadata: { ...artifact.metadata, showFeedback: e.target.value === 'true' },
                      })
                    }
                    options={[
                      { value: 'true', label: 'Ja – visa träffar' },
                      { value: 'false', label: 'Nej – tyst' },
                    ]}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                💡 Hotspot-zoner definieras i JSON-metadata: zones: [{'{'}x, y, radius, label{'}'}]
              </p>
            </div>
          )}

          {/* Tile Puzzle configuration */}
          {artifact.artifact_type === 'tile_puzzle' && (
            <div className="rounded-lg border border-pink-500/30 bg-pink-500/5 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">🧩</span>
                <h4 className="text-sm font-semibold text-foreground">Pusselspel-inställningar</h4>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Bild-URL</label>
                <Input
                  value={(artifact.metadata?.imageUrl as string) || ''}
                  onChange={(e) =>
                    updateArtifact(idx, {
                      metadata: { ...artifact.metadata, imageUrl: e.target.value },
                    })
                  }
                  placeholder="https://example.com/puzzle-image.jpg"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Rutnätsstorlek</label>
                  <Select
                    value={String((artifact.metadata?.gridSize as number) || 3)}
                    onChange={(e) =>
                      updateArtifact(idx, {
                        metadata: { ...artifact.metadata, gridSize: parseInt(e.target.value, 10) },
                      })
                    }
                    options={[
                      { value: '2', label: '2×2 (lätt)' },
                      { value: '3', label: '3×3 (normal)' },
                      { value: '4', label: '4×4 (svår)' },
                      { value: '5', label: '5×5 (expert)' },
                    ]}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Visa förhandsvisning</label>
                  <Select
                    value={(artifact.metadata?.showPreview as boolean) ? 'true' : 'false'}
                    onChange={(e) =>
                      updateArtifact(idx, {
                        metadata: { ...artifact.metadata, showPreview: e.target.value === 'true' },
                      })
                    }
                    options={[
                      { value: 'true', label: 'Ja' },
                      { value: 'false', label: 'Nej' },
                    ]}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Cipher configuration */}
          {artifact.artifact_type === 'cipher' && (
            <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/5 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔤</span>
                <h4 className="text-sm font-semibold text-foreground">Chiffer-inställningar</h4>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Chiffermetod</label>
                  <Select
                    value={(artifact.metadata?.cipherMethod as string) || 'caesar'}
                    onChange={(e) =>
                      updateArtifact(idx, {
                        metadata: { ...artifact.metadata, cipherMethod: e.target.value },
                      })
                    }
                    options={[
                      { value: 'caesar', label: 'Caesar (förskjutning)' },
                      { value: 'atbash', label: 'Atbash (spegling)' },
                      { value: 'vigenere', label: 'Vigenère (nyckelord)' },
                      { value: 'substitution', label: 'Substitution (egen)' },
                    ]}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    {(artifact.metadata?.cipherMethod as string) === 'caesar' ? 'Förskjutning (1-25)' : 'Nyckelord'}
                  </label>
                  <Input
                    value={(artifact.metadata?.cipherKey as string) || ''}
                    onChange={(e) =>
                      updateArtifact(idx, {
                        metadata: { ...artifact.metadata, cipherKey: e.target.value },
                      })
                    }
                    placeholder={(artifact.metadata?.cipherMethod as string) === 'caesar' ? '3' : 'hemligt'}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Klartext (vad som ska krypteras)</label>
                <Textarea
                  value={(artifact.metadata?.plaintext as string) || ''}
                  onChange={(e) =>
                    updateArtifact(idx, {
                      metadata: { ...artifact.metadata, plaintext: e.target.value },
                    })
                  }
                  rows={2}
                  placeholder="Hemligheten finns under trappan"
                />
              </div>
            </div>
          )}

          {/* Logic Grid configuration */}
          {artifact.artifact_type === 'logic_grid' && (
            <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">🧠</span>
                <h4 className="text-sm font-semibold text-foreground">Logikrutnät-inställningar</h4>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Rader (kommaseparerade)</label>
                  <Input
                    value={((artifact.metadata?.rows as string[]) || []).join(', ')}
                    onChange={(e) =>
                      updateArtifact(idx, {
                        metadata: {
                          ...artifact.metadata,
                          rows: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                        },
                      })
                    }
                    placeholder="Alice, Bob, Charlie"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Kolumner (kommaseparerade)</label>
                  <Input
                    value={((artifact.metadata?.columns as string[]) || []).join(', ')}
                    onChange={(e) =>
                      updateArtifact(idx, {
                        metadata: {
                          ...artifact.metadata,
                          columns: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                        },
                      })
                    }
                    placeholder="Röd, Grön, Blå"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                💡 Lösningen definieras i JSON:{' '}
                <code className="font-mono">solution: {'{"Alice": "Röd", "Bob": "Grön"}'}</code>
              </p>
            </div>
          )}

          {/* Multi-answer configuration */}
          {artifact.artifact_type === 'multi_answer' && (
            <div className="rounded-lg border border-teal-500/30 bg-teal-500/5 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">✅</span>
                <h4 className="text-sm font-semibold text-foreground">Flervalssvar-inställningar</h4>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Saker att bocka av (ett per rad)</label>
                <Textarea
                  value={((artifact.metadata?.items as string[]) || []).join('\n')}
                  onChange={(e) =>
                    updateArtifact(idx, {
                      metadata: {
                        ...artifact.metadata,
                        items: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                      },
                    })
                  }
                  rows={4}
                  placeholder="Hitta nyckeln&#10;Lösa gåtan&#10;Öppna dörren"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Kräv antal för klart</label>
                <Input
                  type="number"
                  min={1}
                  value={(artifact.metadata?.requiredCount as number) || ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? null : parseInt(e.target.value, 10);
                    updateArtifact(idx, {
                      metadata: { ...artifact.metadata, requiredCount: val },
                    });
                  }}
                  placeholder="Alla"
                />
              </div>
            </div>
          )}

          {/* QR/NFC Gate configuration */}
          {artifact.artifact_type === 'qr_gate' && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">📱</span>
                <h4 className="text-sm font-semibold text-foreground">QR/NFC-skanning-inställningar</h4>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Förväntat värde</label>
                <Input
                  value={(artifact.metadata?.expectedValue as string) || ''}
                  onChange={(e) =>
                    updateArtifact(idx, {
                      metadata: { ...artifact.metadata, expectedValue: e.target.value },
                    })
                  }
                  placeholder="SECRET123"
                />
                <p className="text-xs text-muted-foreground">Texten som QR-koden ska innehålla</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Meddelande vid lyckad skanning</label>
                <Input
                  value={(artifact.metadata?.successMessage as string) || ''}
                  onChange={(e) =>
                    updateArtifact(idx, {
                      metadata: { ...artifact.metadata, successMessage: e.target.value },
                    })
                  }
                  placeholder="Rätt kod! Fortsätt till nästa ledtråd."
                />
              </div>
            </div>
          )}

          {/* Hint Container configuration */}
          {artifact.artifact_type === 'hint_container' && (
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">💡</span>
                <h4 className="text-sm font-semibold text-foreground">Tips-behållare-inställningar</h4>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Tips (ett per rad, i ordning av avslöjande)</label>
                <Textarea
                  value={((artifact.metadata?.hints as string[]) || []).join('\n')}
                  onChange={(e) =>
                    updateArtifact(idx, {
                      metadata: {
                        ...artifact.metadata,
                        hints: e.target.value.split('\n').filter(Boolean),
                      },
                    })
                  }
                  rows={5}
                  placeholder="Titta under mattan&#10;Det finns en nyckel gömd&#10;Nyckeln passar i skåpet till höger"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Max tips att ge</label>
                  <Input
                    type="number"
                    min={1}
                    value={(artifact.metadata?.maxHints as number) || ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? null : parseInt(e.target.value, 10);
                      updateArtifact(idx, {
                        metadata: { ...artifact.metadata, maxHints: val },
                      });
                    }}
                    placeholder="Alla"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Poängavdrag per tips</label>
                  <Input
                    type="number"
                    min={0}
                    value={(artifact.metadata?.penaltyPerHint as number) ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                      updateArtifact(idx, {
                        metadata: { ...artifact.metadata, penaltyPerHint: val },
                      });
                    }}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Prop Confirmation configuration */}
          {artifact.artifact_type === 'prop_confirmation' && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">📦</span>
                <h4 className="text-sm font-semibold text-foreground">Rekvisita-bekräftelse-inställningar</h4>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Rekvisitanamn</label>
                <Input
                  value={(artifact.metadata?.propName as string) || ''}
                  onChange={(e) =>
                    updateArtifact(idx, {
                      metadata: { ...artifact.metadata, propName: e.target.value },
                    })
                  }
                  placeholder="Guldnyckeln"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Instruktion till deltagare</label>
                <Textarea
                  value={(artifact.metadata?.instruction as string) || ''}
                  onChange={(e) =>
                    updateArtifact(idx, {
                      metadata: { ...artifact.metadata, instruction: e.target.value },
                    })
                  }
                  rows={2}
                  placeholder="Visa upp guldnyckeln för spelledaren för att fortsätta."
                />
              </div>
            </div>
          )}

          {/* Location Check configuration */}
          {artifact.artifact_type === 'location_check' && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">📍</span>
                <h4 className="text-sm font-semibold text-foreground">Platsverifiering-inställningar</h4>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Latitud</label>
                  <Input
                    type="number"
                    step="any"
                    value={(artifact.metadata?.latitude as number) || ''}
                    onChange={(e) =>
                      updateArtifact(idx, {
                        metadata: { ...artifact.metadata, latitude: parseFloat(e.target.value) || null },
                      })
                    }
                    placeholder="59.3293"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Longitud</label>
                  <Input
                    type="number"
                    step="any"
                    value={(artifact.metadata?.longitude as number) || ''}
                    onChange={(e) =>
                      updateArtifact(idx, {
                        metadata: { ...artifact.metadata, longitude: parseFloat(e.target.value) || null },
                      })
                    }
                    placeholder="18.0686"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Radie (meter)</label>
                <Input
                  type="number"
                  min={1}
                  value={(artifact.metadata?.radius as number) || 50}
                  onChange={(e) =>
                    updateArtifact(idx, {
                      metadata: { ...artifact.metadata, radius: parseInt(e.target.value, 10) || 50 },
                    })
                  }
                  placeholder="50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Platsnamn (valfritt)</label>
                <Input
                  value={(artifact.metadata?.locationName as string) || ''}
                  onChange={(e) =>
                    updateArtifact(idx, {
                      metadata: { ...artifact.metadata, locationName: e.target.value },
                    })
                  }
                  placeholder="Stortorget"
                />
              </div>
            </div>
          )}

          {/* Sound Level configuration */}
          {artifact.artifact_type === 'sound_level' && (
            <div className="rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/5 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">🎤</span>
                <h4 className="text-sm font-semibold text-foreground">Ljudnivå-detektor-inställningar</h4>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Tröskel (0-100)</label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={(artifact.metadata?.threshold as number) ?? 70}
                    onChange={(e) =>
                      updateArtifact(idx, {
                        metadata: { ...artifact.metadata, threshold: parseInt(e.target.value, 10) || 70 },
                      })
                    }
                    placeholder="70"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Tid över tröskel (sek)</label>
                  <Input
                    type="number"
                    min={0}
                    value={(artifact.metadata?.holdDuration as number) ?? 2}
                    onChange={(e) =>
                      updateArtifact(idx, {
                        metadata: { ...artifact.metadata, holdDuration: parseFloat(e.target.value) || 2 },
                      })
                    }
                    placeholder="2"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Instruktion</label>
                <Input
                  value={(artifact.metadata?.instruction as string) || ''}
                  onChange={(e) =>
                    updateArtifact(idx, {
                      metadata: { ...artifact.metadata, instruction: e.target.value },
                    })
                  }
                  placeholder="Ropa högt för att öppna dörren!"
                />
              </div>
            </div>
          )}

          {/* Replay Marker configuration */}
          {artifact.artifact_type === 'replay_marker' && (
            <div className="rounded-lg border border-slate-500/30 bg-slate-500/5 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">⏱️</span>
                <h4 className="text-sm font-semibold text-foreground">Replay-markör-inställningar</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Denna artefakt låter deltagare markera viktiga ögonblick under sessionen för senare analys.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Max markörer</label>
                  <Input
                    type="number"
                    min={1}
                    value={(artifact.metadata?.maxMarkers as number) || ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? null : parseInt(e.target.value, 10);
                      updateArtifact(idx, {
                        metadata: { ...artifact.metadata, maxMarkers: val },
                      });
                    }}
                    placeholder="Obegränsat"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Tillåt etiketter</label>
                  <Select
                    value={(artifact.metadata?.allowLabels as boolean) !== false ? 'true' : 'false'}
                    onChange={(e) =>
                      updateArtifact(idx, {
                        metadata: { ...artifact.metadata, allowLabels: e.target.value === 'true' },
                      })
                    }
                    options={[
                      { value: 'true', label: 'Ja' },
                      { value: 'false', label: 'Nej' },
                    ]}
                  />
                </div>
              </div>
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
