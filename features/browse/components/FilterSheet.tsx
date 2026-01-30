import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { BrowseFilters, EnergyLevel, Environment, FilterOptions, GroupSize } from "../types";
import { cn } from "@/lib/utils";

type Option<T extends string> = { label: string; value: T; icon?: string; color?: string };

const groupOptions: Option<GroupSize>[] = [
  { label: "2-6", value: "small", icon: "👥" },
  { label: "6-14", value: "medium", icon: "👥" },
  { label: "15+", value: "large", icon: "👥" },
];

const energyOptions: Option<EnergyLevel>[] = [
  { label: "Låg", value: "low", icon: "🔋", color: "text-emerald-600 dark:text-emerald-400" },
  { label: "Medel", value: "medium", icon: "⚡", color: "text-amber-600 dark:text-amber-400" },
  { label: "Hög", value: "high", icon: "🔥", color: "text-rose-600 dark:text-rose-400" },
];

const environmentOptions: Option<Environment>[] = [
  { label: "Inne", value: "indoor", icon: "🏠" },
  { label: "Ute", value: "outdoor", icon: "🌳" },
  { label: "Både", value: "both", icon: "🔄" },
];

type FilterSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: BrowseFilters;
  options: FilterOptions | null;
  onApply: (filters: BrowseFilters) => void;
  onClearAll: () => void;
};

export function FilterSheet({ open, onOpenChange, filters, options, onApply, onClearAll }: FilterSheetProps) {
  const [localFilters, setLocalFilters] = useState<BrowseFilters>(filters);
  const t = useTranslations("browse");

  const activeCount = useMemo(() => {
    const { products, mainPurposes, subPurposes, groupSizes, energyLevels, environment, minPlayers, maxPlayers, minAge, maxAge, minTime, maxTime } = localFilters;
    return (
      products.length +
      mainPurposes.length +
      subPurposes.length +
      groupSizes.length +
      energyLevels.length +
      (environment ? 1 : 0) +
      (minPlayers ? 1 : 0) +
      (maxPlayers ? 1 : 0) +
      (minAge ? 1 : 0) +
      (maxAge ? 1 : 0) +
      (minTime ? 1 : 0) +
      (maxTime ? 1 : 0)
    );
  }, [localFilters]);

  const toggleValue = <T extends string>(key: keyof BrowseFilters, value: T) => {
    setLocalFilters((prev) => {
      const current = prev[key] as T[];
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      return { ...prev, [key]: next };
    });
  };

  const setField = <K extends keyof BrowseFilters>(key: K, value: BrowseFilters[K]) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleApply = () => {
    onApply(localFilters);
    onOpenChange(false);
  };

  const handleOpenChange = (state: boolean) => {
    if (!state) {
      setLocalFilters(filters);
    }
    onOpenChange(state);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] overflow-y-auto px-4 py-6 sm:max-w-xl sm:rounded-t-3xl">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-primary/30" aria-hidden />
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-lg">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </span>
            {t("filter.title")}
          </SheetTitle>
          <p className="text-sm text-muted-foreground">{t("filter.description")}</p>
        </SheetHeader>

        <div className="mt-6 space-y-1">
          <FilterSection
            title="Produkt"
            icon="📦"
            options={(options?.products ?? []).map((p) => ({ label: p.name ?? "Okänd produkt", value: p.id }))}
            selected={localFilters.products}
            onToggle={(value) => toggleValue("products", value)}
            emptyLabel="Inga produkter tillgängliga"
          />
          <FilterSection
            title="Syfte"
            icon="🎯"
            options={(options?.mainPurposes ?? []).map((p) => ({ label: p.name ?? "Syfte", value: p.id }))}
            selected={localFilters.mainPurposes}
            onToggle={(value) => toggleValue("mainPurposes", value)}
            emptyLabel="Inga syften tillgängliga"
          />
          <FilterSection
            title="Del-syfte"
            icon="📌"
            options={(options?.subPurposes ?? []).map((p) => ({ label: p.name ?? "Del-syfte", value: p.id }))}
            selected={localFilters.subPurposes}
            onToggle={(value) => toggleValue("subPurposes", value)}
            emptyLabel="Inga del-syften tillgängliga"
          />
          <FilterSection
            title="Gruppstorlek"
            icon="👥"
            options={groupOptions}
            selected={localFilters.groupSizes}
            onToggle={(value) => toggleValue("groupSizes", value)}
          />
          <FilterSection
            title="Energi"
            icon="⚡"
            options={energyOptions}
            selected={localFilters.energyLevels}
            onToggle={(value) => toggleValue("energyLevels", value)}
            colorMode
          />
          <FilterSection
            title={t('environment')}
            icon="🌍"
            options={environmentOptions}
            selected={localFilters.environment ? [localFilters.environment] : []}
            onToggle={(value) =>
              setField("environment", localFilters.environment === value ? null : value)
            }
          />

          <NumberSection
            title={t('players')}
            icon="🎮"
            minValue={localFilters.minPlayers}
            maxValue={localFilters.maxPlayers}
            onMinChange={(value) => setField("minPlayers", value)}
            onMaxChange={(value) => setField("maxPlayers", value)}
            placeholder={t('count')}
          />
          <NumberSection
            title={t('age')}
            icon="🎂"
            minValue={localFilters.minAge}
            maxValue={localFilters.maxAge}
            onMinChange={(value) => setField("minAge", value)}
            onMaxChange={(value) => setField("maxAge", value)}
            placeholder={t('years')}
          />
          <NumberSection
            title="Tid (min)"
            icon="⏱️"
            minValue={localFilters.minTime}
            maxValue={localFilters.maxTime}
            onMinChange={(value) => setField("minTime", value)}
            onMaxChange={(value) => setField("maxTime", value)}
            placeholder="Minuter"
          />
        </div>

        <SheetFooter className="sticky bottom-0 mt-6 flex flex-col gap-3 border-t border-primary/20 bg-gradient-to-t from-card via-card to-card/95 pt-4 backdrop-blur sm:flex-row sm:justify-between sm:space-x-3 sm:space-y-0">
          <Button variant="outline" onClick={onClearAll} className="w-full border-primary/30 hover:bg-primary/5 sm:w-auto">
            {t("filter.clearAll")}
          </Button>
          <Button onClick={handleApply} className="w-full shadow-lg shadow-primary/25 sm:w-auto">
            {t("filter.apply")} {activeCount > 0 ? `(${activeCount})` : ""}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

type FilterSectionProps<T extends string> = {
  title: string;
  icon?: string;
  options: Option<T>[];
  selected: T[];
  onToggle: (value: T) => void;
  emptyLabel?: string;
  colorMode?: boolean;
};

function FilterSection<T extends string>({ title, icon, options, selected, onToggle, emptyLabel, colorMode }: FilterSectionProps<T>) {
  return (
    <div className="rounded-xl border border-border/40 bg-card/50 p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        {icon && <span className="text-base">{icon}</span>}
        {title}
      </h3>
      {options.length === 0 ? (
        <p className="text-sm italic text-primary/60">{emptyLabel || "Inga alternativ"}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {options.map((option) => {
            const active = selected.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onToggle(option.value)}
                aria-pressed={active}
                className={cn(
                  "rounded-full px-3.5 py-2 text-sm font-medium transition-all active:scale-95",
                  active
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                    : "bg-muted/80 text-foreground ring-1 ring-border/50 hover:bg-primary/10 hover:ring-primary/30",
                  colorMode && option.color && !active && option.color
                )}
              >
                {option.icon && <span className="mr-1">{option.icon}</span>}
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

type NumberSectionProps = {
  title: string;
  icon?: string;
  minValue: number | null;
  maxValue: number | null;
  onMinChange: (value: number | null) => void;
  onMaxChange: (value: number | null) => void;
  placeholder?: string;
};

function NumberSection({ title, icon, minValue, maxValue, onMinChange, onMaxChange, placeholder }: NumberSectionProps) {
  const parseValue = (val: string) => {
    if (val === "") return null;
    const parsed = Number(val);
    return Number.isNaN(parsed) ? null : parsed;
  };

  return (
    <div className="rounded-xl border border-border/40 bg-card/50 p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        {icon && <span className="text-base">{icon}</span>}
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Min</Label>
          <Input
            type="number"
            inputMode="numeric"
            value={minValue ?? ""}
            onChange={(e) => onMinChange(parseValue(e.target.value))}
            placeholder={placeholder}
            className="border-border/50 bg-background focus:border-primary focus:ring-primary/20"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Max</Label>
          <Input
            type="number"
            inputMode="numeric"
            value={maxValue ?? ""}
            onChange={(e) => onMaxChange(parseValue(e.target.value))}
            placeholder={placeholder}
            className="border-border/50 bg-background focus:border-primary focus:ring-primary/20"
          />
        </div>
      </div>
    </div>
  );
}
