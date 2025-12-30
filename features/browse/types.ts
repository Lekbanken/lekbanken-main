export type EnergyLevel = "low" | "medium" | "high";
export type Environment = "indoor" | "outdoor" | "both";
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
  playMode?: "basic" | "facilitated" | "participants" | null;
  imageUrl?: string | null;
  productName?: string | null;
};

export type BrowseFilters = {
  products: string[];
  mainPurposes: string[];
  subPurposes: string[];
  groupSizes: GroupSize[];
  energyLevels: EnergyLevel[];
  environment: Environment | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  minAge: number | null;
  maxAge: number | null;
  minTime: number | null;
  maxTime: number | null;
};

export type SortOption = "relevance" | "newest" | "name" | "duration" | "popular" | "rating";

export type FilterOption = { id: string; name: string | null };

export type FilterOptions = {
  products: FilterOption[];
  mainPurposes: FilterOption[];
  subPurposes: FilterOption[];
};
