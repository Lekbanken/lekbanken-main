import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { BrowseFilters, EnergyLevel, Environment, FilterOptions, GroupSize } from "../types";
import { cn } from "@/lib/utils";

type Option<T extends string> = { label: string; value: T };

const groupOptions: Option<GroupSize>[] = [
  { label: "2-6", value: "small" },
  { label: "6-14", value: "medium" },
  { label: "15+", value: "large" },
];

const energyOptions: Option<EnergyLevel>[] = [
  { label: "Låg", value: "low" },
  { label: "Medel", value: "medium" },
  { label: "Hög", value: "high" },
];

const environmentOptions: Option<Environment>[] = [
  { label: "Inne", value: "indoor" },
  { label: "Ute", value: "outdoor" },
  { label: "Både", value: "both" },
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
      <SheetContent side="bottom" className="h-[80vh] overflow-y-auto px-4 py-6 sm:max-w-xl sm:rounded-t-3xl">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-muted" aria-hidden />
        <SheetHeader>
          <SheetTitle className="text-lg">{t("filter.title")}</SheetTitle>
          <p className="text-sm text-muted-foreground">{t("filter.description")}</p>
        </SheetHeader>

        <div className="mt-5 space-y-5 divide-y divide-border/40">
          <FilterSection
            title="Produkt"
            options={(options?.products ?? []).map((p) => ({ label: p.name ?? "Okänd produkt", value: p.id }))}
            selected={localFilters.products}
            onToggle={(value) => toggleValue("products", value)}
            emptyLabel="Inga produkter tillgängliga"
          />
          <FilterSection
            title="Syfte"
            options={(options?.mainPurposes ?? []).map((p) => ({ label: p.name ?? "Syfte", value: p.id }))}
            selected={localFilters.mainPurposes}
            onToggle={(value) => toggleValue("mainPurposes", value)}
            emptyLabel="Inga syften tillgängliga"
          />
          <FilterSection
            title="Del-syfte"
            options={(options?.subPurposes ?? []).map((p) => ({ label: p.name ?? "Del-syfte", value: p.id }))}
            selected={localFilters.subPurposes}
            onToggle={(value) => toggleValue("subPurposes", value)}
            emptyLabel="Inga del-syften tillgängliga"
          />
          <FilterSection
            title="Gruppstorlek"
            options={groupOptions}
            selected={localFilters.groupSizes}
            onToggle={(value) => toggleValue("groupSizes", value)}
          />
          <FilterSection
            title="Energi"
            options={energyOptions}
            selected={localFilters.energyLevels}
            onToggle={(value) => toggleValue("energyLevels", value)}
          />
          <FilterSection
            title={t('environment')}
            options={environmentOptions}
            selected={localFilters.environment ? [localFilters.environment] : []}
            onToggle={(value) =>
              setField("environment", localFilters.environment === value ? null : value)
            }
          />

          <NumberSection
            title={t('players')}
            minValue={localFilters.minPlayers}
            maxValue={localFilters.maxPlayers}
            onMinChange={(value) => setField("minPlayers", value)}
            onMaxChange={(value) => setField("maxPlayers", value)}
            placeholder={t('count')}
          />
          <NumberSection
            title={t('age')}
            minValue={localFilters.minAge}
            maxValue={localFilters.maxAge}
            onMinChange={(value) => setField("minAge", value)}
            onMaxChange={(value) => setField("maxAge", value)}
            placeholder={t('years')}
          />
          <NumberSection
            title="Tid (min)"
            minValue={localFilters.minTime}
            maxValue={localFilters.maxTime}
            onMinChange={(value) => setField("minTime", value)}
            onMaxChange={(value) => setField("maxTime", value)}
            placeholder="Minuter"
          />
        </div>

        <SheetFooter className="sticky bottom-0 mt-6 flex flex-col gap-3 border-t border-border/50 bg-card/95 pt-4 backdrop-blur sm:flex-row sm:justify-between sm:space-x-3 sm:space-y-0">
          <Button variant="outline" onClick={onClearAll} className="w-full sm:w-auto">
            {t("filter.clearAll")}
          </Button>
          <Button onClick={handleApply} className="w-full shadow-lg shadow-primary/20 sm:w-auto">
            {t("filter.apply")} {activeCount > 0 ? `(${activeCount})` : ""}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

type FilterSectionProps<T extends string> = {
  title: string;
  options: Option<T>[];
  selected: T[];
  onToggle: (value: T) => void;
  emptyLabel?: string;
};

function FilterSection<T extends string>({ title, options, selected, onToggle, emptyLabel }: FilterSectionProps<T>) {
  return (
    <div className="space-y-3 pt-5 first:pt-0">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {options.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel || "Inga alternativ"}</p>
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
                    ? "bg-primary/15 text-primary ring-1 ring-primary/30 shadow-sm"
                    : "bg-muted/70 text-foreground hover:bg-muted"
                )}
              >
                {active && (
                  <svg className="mr-1.5 inline-block h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
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
  minValue: number | null;
  maxValue: number | null;
  onMinChange: (value: number | null) => void;
  onMaxChange: (value: number | null) => void;
  placeholder?: string;
};

function NumberSection({ title, minValue, maxValue, onMinChange, onMaxChange, placeholder }: NumberSectionProps) {
  const parseValue = (val: string) => {
    if (val === "") return null;
    const parsed = Number(val);
    return Number.isNaN(parsed) ? null : parsed;
  };

  return (
    <div className="space-y-3 pt-5 first:pt-0">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Min</Label>
          <Input
            type="number"
            inputMode="numeric"
            value={minValue ?? ""}
            onChange={(e) => onMinChange(parseValue(e.target.value))}
            placeholder={placeholder}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Max</Label>
          <Input
            type="number"
            inputMode="numeric"
            value={maxValue ?? ""}
            onChange={(e) => onMaxChange(parseValue(e.target.value))}
            placeholder={placeholder}
          />
        </div>
      </div>
    </div>
  );
}
