/**
 * Step 7 — Admin UI verification tests
 *
 * Tests Zod schema validation, render_config per-type validation,
 * i18n key completeness, and admin nav registration.
 *
 * Environment: vitest `node` — tests logic/schemas, not DOM rendering.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  cosmeticCreateSchema,
  cosmeticUpdateSchema,
  unlockRuleCreateSchema,
  grantSchema,
  validateRenderConfig,
  svgFrameConfigSchema,
  cssBackgroundConfigSchema,
  cssParticlesConfigSchema,
  xpSkinConfigSchema,
  cssDividerConfigSchema,
  RENDER_TYPE_SCHEMAS,
} from "@/lib/journey/cosmetic-schemas";
import { ADMIN_NAV } from "@/lib/admin/nav";

// =============================================================================
// 1. cosmeticCreateSchema validation
// =============================================================================
describe("Step 7 — Admin UI", () => {
  describe("1. cosmeticCreateSchema", () => {
    const validPayload = {
      key: "forest_frame_oak",
      category: "avatar_frame" as const,
      factionId: "forest",
      rarity: "rare" as const,
      nameKey: "cosmetics.forest_frame_oak.name",
      descriptionKey: "cosmetics.forest_frame_oak.desc",
      renderType: "svg_frame" as const,
      renderConfig: { variant: "oak", glowColor: "#10b981" },
      sortOrder: 10,
      isActive: true,
    };

    it("accepts a valid full payload", () => {
      const result = cosmeticCreateSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it("applies defaults for rarity, sortOrder, isActive", () => {
      const minimal = {
        key: "test_item",
        category: "particles",
        nameKey: "cosmetics.test.name",
        descriptionKey: "cosmetics.test.desc",
        renderType: "css_particles",
        renderConfig: { className: "sparkle" },
      };
      const result = cosmeticCreateSchema.safeParse(minimal);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.rarity).toBe("common");
        expect(result.data.sortOrder).toBe(0);
        expect(result.data.isActive).toBe(true);
      }
    });

    it("rejects empty key", () => {
      const result = cosmeticCreateSchema.safeParse({ ...validPayload, key: "" });
      expect(result.success).toBe(false);
    });

    it("rejects invalid category", () => {
      const result = cosmeticCreateSchema.safeParse({
        ...validPayload,
        category: "invalid_slot",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid rarity", () => {
      const result = cosmeticCreateSchema.safeParse({
        ...validPayload,
        rarity: "mythic",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid renderType", () => {
      const result = cosmeticCreateSchema.safeParse({
        ...validPayload,
        renderType: "unknown_renderer",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid factionId", () => {
      const result = cosmeticCreateSchema.safeParse({
        ...validPayload,
        factionId: "fire",
      });
      expect(result.success).toBe(false);
    });

    it("allows null factionId (universal cosmetic)", () => {
      const result = cosmeticCreateSchema.safeParse({
        ...validPayload,
        factionId: null,
      });
      expect(result.success).toBe(true);
    });

    it("allows omitted factionId", () => {
      const { factionId: _, ...rest } = validPayload;
      const result = cosmeticCreateSchema.safeParse(rest);
      expect(result.success).toBe(true);
    });
  });

  // ===========================================================================
  // 2. cosmeticUpdateSchema validation (partial)
  // ===========================================================================
  describe("2. cosmeticUpdateSchema (partial)", () => {
    it("accepts empty object (no fields required)", () => {
      const result = cosmeticUpdateSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("accepts single field update", () => {
      const result = cosmeticUpdateSchema.safeParse({ isActive: false });
      expect(result.success).toBe(true);
    });

    it("still validates field types when provided", () => {
      const result = cosmeticUpdateSchema.safeParse({ rarity: "mythic" });
      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // 3. unlockRuleCreateSchema validation
  // ===========================================================================
  describe("3. unlockRuleCreateSchema", () => {
    it("accepts valid level rule", () => {
      const result = unlockRuleCreateSchema.safeParse({
        cosmeticId: "00000000-0000-0000-0000-000000000001",
        unlockType: "level",
        unlockConfig: { required_level: 5 },
        priority: 1,
      });
      expect(result.success).toBe(true);
    });

    it("accepts valid achievement rule", () => {
      const result = unlockRuleCreateSchema.safeParse({
        cosmeticId: "00000000-0000-0000-0000-000000000002",
        unlockType: "achievement",
        unlockConfig: { achievement_id: "first_session" },
      });
      expect(result.success).toBe(true);
    });

    it("accepts valid shop rule", () => {
      const result = unlockRuleCreateSchema.safeParse({
        cosmeticId: "00000000-0000-0000-0000-000000000003",
        unlockType: "shop",
        unlockConfig: { price: 100, currency: "coins" },
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid unlockType", () => {
      const result = unlockRuleCreateSchema.safeParse({
        cosmeticId: "00000000-0000-0000-0000-000000000001",
        unlockType: "magic",
        unlockConfig: {},
      });
      expect(result.success).toBe(false);
    });

    it("rejects non-uuid cosmeticId", () => {
      const result = unlockRuleCreateSchema.safeParse({
        cosmeticId: "not-a-uuid",
        unlockType: "level",
        unlockConfig: { required_level: 1 },
      });
      expect(result.success).toBe(false);
    });

    it("applies default priority = 0", () => {
      const result = unlockRuleCreateSchema.safeParse({
        cosmeticId: "00000000-0000-0000-0000-000000000001",
        unlockType: "level",
        unlockConfig: {},
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.priority).toBe(0);
      }
    });
  });

  // ===========================================================================
  // 4. grantSchema validation
  // ===========================================================================
  describe("4. grantSchema", () => {
    it("accepts valid grant", () => {
      const result = grantSchema.safeParse({
        cosmeticId: "00000000-0000-0000-0000-000000000001",
        userId: "00000000-0000-0000-0000-000000000099",
        reason: "Manual admin grant for testing",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty reason", () => {
      const result = grantSchema.safeParse({
        cosmeticId: "00000000-0000-0000-0000-000000000001",
        userId: "00000000-0000-0000-0000-000000000099",
        reason: "",
      });
      expect(result.success).toBe(false);
    });

    it("rejects reason exceeding 500 chars", () => {
      const result = grantSchema.safeParse({
        cosmeticId: "00000000-0000-0000-0000-000000000001",
        userId: "00000000-0000-0000-0000-000000000099",
        reason: "x".repeat(501),
      });
      expect(result.success).toBe(false);
    });

    it("rejects non-uuid userId", () => {
      const result = grantSchema.safeParse({
        cosmeticId: "00000000-0000-0000-0000-000000000001",
        userId: "user-123",
        reason: "Test",
      });
      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // 5. Per-render_type config schemas
  // ===========================================================================
  describe("5. Per-render_type config schemas", () => {
    it("RENDER_TYPE_SCHEMAS covers all 6 render types", () => {
      const expected = ["svg_frame", "css_background", "css_particles", "xp_skin", "css_divider", "title"];
      expect(Object.keys(RENDER_TYPE_SCHEMAS).sort()).toEqual(expected.sort());
    });

    describe("5a. svg_frame", () => {
      it("valid: variant required", () => {
        expect(svgFrameConfigSchema.safeParse({ variant: "oak" }).success).toBe(true);
      });
      it("valid: optional glowColor", () => {
        expect(
          svgFrameConfigSchema.safeParse({ variant: "oak", glowColor: "#10b981" }).success,
        ).toBe(true);
      });
      it("invalid: missing variant", () => {
        expect(svgFrameConfigSchema.safeParse({}).success).toBe(false);
      });
      it("invalid: empty variant", () => {
        expect(svgFrameConfigSchema.safeParse({ variant: "" }).success).toBe(false);
      });
    });

    describe("5b. css_background", () => {
      it("valid: className required", () => {
        expect(cssBackgroundConfigSchema.safeParse({ className: "ocean-waves" }).success).toBe(true);
      });
      it("invalid: missing className", () => {
        expect(cssBackgroundConfigSchema.safeParse({}).success).toBe(false);
      });
    });

    describe("5c. css_particles", () => {
      it("valid: className required", () => {
        expect(cssParticlesConfigSchema.safeParse({ className: "sparkle" }).success).toBe(true);
      });
      it("valid: optional count within range", () => {
        expect(
          cssParticlesConfigSchema.safeParse({ className: "sparkle", count: 16 }).success,
        ).toBe(true);
      });
      it("invalid: count exceeds max 32", () => {
        expect(
          cssParticlesConfigSchema.safeParse({ className: "sparkle", count: 100 }).success,
        ).toBe(false);
      });
      it("invalid: count below min 1", () => {
        expect(
          cssParticlesConfigSchema.safeParse({ className: "sparkle", count: 0 }).success,
        ).toBe(false);
      });
    });

    describe("5d. xp_skin", () => {
      it("valid: skin required", () => {
        expect(xpSkinConfigSchema.safeParse({ skin: "fire" }).success).toBe(true);
      });
      it("invalid: missing skin", () => {
        expect(xpSkinConfigSchema.safeParse({}).success).toBe(false);
      });
    });

    describe("5e. css_divider", () => {
      it("valid: variant required", () => {
        expect(cssDividerConfigSchema.safeParse({ variant: "vine" }).success).toBe(true);
      });
      it("invalid: missing variant", () => {
        expect(cssDividerConfigSchema.safeParse({}).success).toBe(false);
      });
    });
  });

  // ===========================================================================
  // 6. validateRenderConfig helper
  // ===========================================================================
  describe("6. validateRenderConfig", () => {
    it("returns success for valid svg_frame config", () => {
      const result = validateRenderConfig("svg_frame", { variant: "golden" });
      expect(result.success).toBe(true);
    });

    it("returns error for invalid svg_frame config (missing variant)", () => {
      const result = validateRenderConfig("svg_frame", {});
      expect(result.success).toBe(false);
    });

    it("returns error for unknown render_type", () => {
      const result = validateRenderConfig("hologram", { data: 123 });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Unknown render_type");
      }
    });

    it("validates css_particles count range", () => {
      const valid = validateRenderConfig("css_particles", { className: "p", count: 10 });
      expect(valid.success).toBe(true);

      const invalid = validateRenderConfig("css_particles", { className: "p", count: 50 });
      expect(invalid.success).toBe(false);
    });
  });

  // ===========================================================================
  // 7. i18n key completeness — admin.cosmetics namespace
  // ===========================================================================
  describe("7. i18n key completeness", () => {
    const messagesDir = resolve(__dirname, "../../messages");
    const svData = JSON.parse(readFileSync(resolve(messagesDir, "sv.json"), "utf-8"));
    const enData = JSON.parse(readFileSync(resolve(messagesDir, "en.json"), "utf-8"));
    const noData = JSON.parse(readFileSync(resolve(messagesDir, "no.json"), "utf-8"));

    function flatKeys(obj: Record<string, unknown>, prefix = ""): string[] {
      const keys: string[] = [];
      for (const [k, v] of Object.entries(obj)) {
        const full = prefix ? `${prefix}.${k}` : k;
        if (v !== null && typeof v === "object" && !Array.isArray(v)) {
          keys.push(...flatKeys(v as Record<string, unknown>, full));
        } else {
          keys.push(full);
        }
      }
      return keys;
    }

    it("sv.json has admin.gamification.cosmetics namespace", () => {
      expect(svData.admin?.gamification?.cosmetics).toBeDefined();
    });

    it("en.json has admin.gamification.cosmetics namespace", () => {
      expect(enData.admin?.gamification?.cosmetics).toBeDefined();
    });

    it("no.json has admin.gamification.cosmetics namespace", () => {
      expect(noData.admin?.gamification?.cosmetics).toBeDefined();
    });

    it("all three languages have the same admin.gamification.cosmetics keys", () => {
      const svKeys = flatKeys(svData.admin.gamification.cosmetics).sort();
      const enKeys = flatKeys(enData.admin.gamification.cosmetics).sort();
      const noKeys = flatKeys(noData.admin.gamification.cosmetics).sort();

      expect(enKeys).toEqual(svKeys);
      expect(noKeys).toEqual(svKeys);
    });

    it("nav label exists in all languages", () => {
      expect(svData.admin?.nav?.items?.cosmetics).toBeDefined();
      expect(enData.admin?.nav?.items?.cosmetics).toBeDefined();
      expect(noData.admin?.nav?.items?.cosmetics).toBeDefined();
    });

    const requiredKeys = [
      "pageTitle",
      "pageDescription",
      "breadcrumbs.admin",
      "breadcrumbs.cosmetics",
      "actions.create",
      "actions.edit",
      "actions.save",
      "actions.cancel",
      "actions.grant",
      "actions.activate",
      "actions.deactivate",
      "filters.search",
      "filters.category",
      "filters.faction",
      "filters.rarity",
      "filters.all",
      "columns.key",
      "columns.category",
      "columns.faction",
      "columns.rarity",
      "columns.renderType",
      "columns.rules",
      "columns.status",
      "columns.actions",
      "status.active",
      "status.inactive",
      "categories.avatar_frame",
      "categories.scene_background",
      "categories.particles",
      "categories.xp_bar",
      "categories.section_divider",
      "factions.forest",
      "factions.sea",
      "factions.desert",
      "factions.void",
      "factions.universal",
      "rarities.common",
      "rarities.uncommon",
      "rarities.rare",
      "rarities.epic",
      "rarities.legendary",
      "form.key",
      "form.category",
      "form.faction",
      "form.rarity",
      "form.nameKey",
      "form.descriptionKey",
      "form.renderType",
      "form.renderConfig",
      "form.sortOrder",
      "form.isActive",
      "grant.title",
      "grant.userSearch",
      "grant.reason",
      "grant.submit",
      "empty.title",
      "empty.description",
    ];

    it.each(requiredKeys)("sv has key admin.gamification.cosmetics.%s", (key) => {
      const parts = key.split(".");
      let obj: unknown = svData.admin.gamification.cosmetics;
      for (const part of parts) {
        expect(obj).toBeDefined();
        obj = (obj as Record<string, unknown>)[part];
      }
      expect(obj).toBeDefined();
    });
  });

  // ===========================================================================
  // 8. Admin nav registration
  // ===========================================================================
  describe("8. Admin nav includes cosmetics entry", () => {
    it("systemAdminCategories contains a cosmetics nav item", () => {
      const allItems = ADMIN_NAV.system.flatMap((cat) => cat.items);
      const cosmetics = allItems.find((item) => item.id === "cosmetics");
      expect(cosmetics).toBeDefined();
      expect(cosmetics?.href).toBe("/admin/cosmetics");
    });
  });

  // ===========================================================================
  // 9. Category → render_type mapping completeness
  // ===========================================================================
  describe("9. Category renders have matching schemas", () => {
    const CATEGORY_RENDER_TYPES: Record<string, string> = {
      avatar_frame: "svg_frame",
      scene_background: "css_background",
      particles: "css_particles",
      xp_bar: "xp_skin",
      section_divider: "css_divider",
    };

    it("all 5 categories map to a render_type", () => {
      expect(Object.keys(CATEGORY_RENDER_TYPES)).toHaveLength(5);
    });

    it.each(Object.entries(CATEGORY_RENDER_TYPES))(
      "category %s → render_type %s has a validation schema",
      (_category, renderType) => {
        expect(RENDER_TYPE_SCHEMAS[renderType]).toBeDefined();
      },
    );
  });
});
