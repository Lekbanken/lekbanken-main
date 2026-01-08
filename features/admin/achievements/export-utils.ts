/**
 * Utility functions for building and parsing canonical award builder exports
 * These are shared between API routes and UI components
 */

import { awardBuilderExportSchemaV1, type AwardBuilderExportV1 } from '@/lib/validation/awardBuilderExportSchemaV1';
import { normalizeIconConfig } from './icon-utils';
import type { AchievementItem } from './types';

type BuilderPayloadV1 = {
  badge: Partial<AchievementItem>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Parse and validate export JSON against canonical schema.
 * Throws if validation fails.
 */
export function parseCanonicalExportOrThrow(exportJson: unknown): AwardBuilderExportV1 {
  const parsed = awardBuilderExportSchemaV1.safeParse(exportJson);
  if (!parsed.success) {
    const details = parsed.error.flatten();
    throw new Error(`Export JSON does not match AWARD_BUILDER_EXPORT_SCHEMA_V1: ${JSON.stringify(details)}`);
  }
  return parsed.data;
}

/**
 * Read the builder payload from a canonical export.
 * Throws if the expected structure is missing.
 */
export function readBuilderPayloadOrThrow(exportV1: AwardBuilderExportV1): BuilderPayloadV1 {
  const p = exportV1.achievements[0]?.unlock?.unlock_criteria?.params;
  if (!isRecord(p)) {
    throw new Error('Export JSON is missing achievements[0].unlock.unlock_criteria.params');
  }

  const builder = (p as Record<string, unknown>).builder;
  if (!isRecord(builder)) {
    throw new Error('Export JSON is missing achievements[0].unlock.unlock_criteria.params.builder');
  }

  const badge = builder.badge;
  if (!isRecord(badge)) {
    throw new Error('Export JSON is missing achievements[0].unlock.unlock_criteria.params.builder.badge');
  }

  return { badge: badge as unknown as Partial<AchievementItem> };
}

/**
 * Extract an AchievementItem from a canonical export JSON.
 * The exportId is used as the stable identifier.
 */
export function extractBadgeItem(exportId: string, exportJson: unknown): AchievementItem {
  const exportV1 = parseCanonicalExportOrThrow(exportJson);
  const payload = readBuilderPayloadOrThrow(exportV1);

  const badge = payload.badge;
  const icon = normalizeIconConfig(badge.icon);

  return {
    ...badge,
    id: exportId,
    title: typeof badge.title === 'string' ? badge.title : exportV1.achievements[0]?.name ?? '',
    description: typeof badge.description === 'string' ? badge.description : exportV1.achievements[0]?.description ?? undefined,
    icon,
    status: badge.status ?? 'draft',
    version: typeof badge.version === 'number' ? badge.version : 1,
  } as AchievementItem;
}

export type BuildExportJsonArgs = {
  scope: { type: 'tenant'; tenantId: string } | { type: 'global' };
  actorUserId: string;
  tool: string;
  nowIso: string;
  exportId: string;
  badge: AchievementItem;
};

/**
 * Build a canonical export JSON from an AchievementItem.
 * Validates the output before returning.
 */
export function buildExportJson(args: BuildExportJsonArgs): AwardBuilderExportV1 {
  const publish_scope =
    args.scope.type === 'global'
      ? ({ type: 'global', tenant_id: null } as const)
      : ({ type: 'tenant', tenant_id: args.scope.tenantId } as const);

  const name = args.badge.title ?? '';
  const description = args.badge.description ?? args.badge.subtitle ?? '';

  const exportV1: AwardBuilderExportV1 = {
    schema_version: '1.0',
    exported_at: args.nowIso,
    exported_by: {
      user_id: args.actorUserId,
      tool: args.tool,
    },
    publish_scope,
    achievements: [
      {
        achievement_key: args.exportId,
        name,
        description,
        icon: {
          icon_media_id: null,
          icon_url_legacy: null,
        },
        badge: {
          badge_color: null,
        },
        visibility: {
          is_easter_egg: false,
          hint_text: null,
        },
        unlock: {
          condition_type: 'manual',
          condition_value: null,
          unlock_criteria: {
            type: 'manual',
            params: {
              builder: {
                badge: args.badge,
              } satisfies BuilderPayloadV1,
            },
          },
        },
      },
    ],
  };

  // Hard guarantee: do not emit non-canonical JSON.
  return parseCanonicalExportOrThrow(exportV1);
}
