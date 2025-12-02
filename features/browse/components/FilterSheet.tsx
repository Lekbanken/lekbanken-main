import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { BrowseFilters, EnergyLevel, Environment, GroupSize } from "../types";

type Option<T extends string> = { label: string; value: T };

const ageOptions: Option<string>[] = [
  { label: "4-6 år", value: "4-6" },
  { label: "7-9 år", value: "7-9" },
  { label: "10-12 år", value: "10-12" },
  { label: "13+ år", value: "13+" },
];

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
  { label: "Både", value: "either" },
];

const purposeOptions: Option<string>[] = [
  { label: "Uppvärmning", value: "uppvärmning" },
  { label: "Samarbete", value: "samarbete" },
  { label: "Fokus", value: "fokus" },
  { label: "Trygghet", value: "trygghet" },
];

type FilterSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: BrowseFilters;
  onApply: (filters: BrowseFilters) => void;
  onClearAll: () => void;
};

export function FilterSheet({ open, onOpenChange, filters, onApply, onClearAll }: FilterSheetProps) {
  const [localFilters, setLocalFilters] = useState<BrowseFilters>(filters);

  const activeCount = useMemo(() => {
    const { ages, groupSizes, energyLevels, environments, purposes } = localFilters;
    return ages.length + groupSizes.length + energyLevels.length + environments.length + purposes.length;
  }, [localFilters]);

  const toggleValue = <T extends string>(key: keyof BrowseFilters, value: T) => {
    setLocalFilters((prev) => {
      const current = prev[key] as T[];
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      return { ...prev, [key]: next };
    });
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
          <SheetTitle className="text-lg">Filter</SheetTitle>
          <p className="text-sm text-muted-foreground">Välj ålder, energi, gruppstorlek m.m.</p>
        </SheetHeader>

        <div className="mt-5 space-y-5 divide-y divide-border/40">
          <FilterSection
            title="Ålder"
            options={ageOptions}
            selected={localFilters.ages}
            onToggle={(value) => toggleValue("ages", value)}
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
            title="Miljö"
            options={environmentOptions}
            selected={localFilters.environments}
            onToggle={(value) => toggleValue("environments", value)}
          />
          <FilterSection
            title="Syfte"
            options={purposeOptions}
            selected={localFilters.purposes}
            onToggle={(value) => toggleValue("purposes", value)}
          />
        </div>

        <SheetFooter className="sticky bottom-0 mt-6 flex flex-col gap-3 border-t border-border/50 bg-card/95 pt-4 backdrop-blur sm:flex-row sm:justify-between sm:space-x-3 sm:space-y-0">
          <Button variant="outline" onClick={onClearAll} className="w-full sm:w-auto">
            Rensa alla
          </Button>
          <Button onClick={handleApply} className="w-full shadow-lg shadow-primary/20 sm:w-auto">
            Använd filter {activeCount > 0 ? `(${activeCount})` : ""}
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
};

function FilterSection<T extends string>({ title, options, selected, onToggle }: FilterSectionProps<T>) {
  return (
    <div className="space-y-3 pt-5 first:pt-0">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onToggle(option.value)}
              aria-pressed={active}
              className={`rounded-full px-3.5 py-2 text-sm font-medium transition-all active:scale-95 ${
                active
                  ? "bg-primary/15 text-primary ring-1 ring-primary/30 shadow-sm"
                  : "bg-muted/70 text-foreground hover:bg-muted"
              }`}
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
    </div>
  );
}
