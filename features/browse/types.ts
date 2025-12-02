export type EnergyLevel = "low" | "medium" | "high";
export type Environment = "indoor" | "outdoor" | "either";
export type GroupSize = "small" | "medium" | "large";

export type Game = {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  groupSize: GroupSize;
  ageRange: string;
  energyLevel: EnergyLevel;
  environment: Environment;
  purpose: string;
};

export type BrowseFilters = {
  ages: string[];
  groupSizes: GroupSize[];
  energyLevels: EnergyLevel[];
  environments: Environment[];
  purposes: string[];
};
