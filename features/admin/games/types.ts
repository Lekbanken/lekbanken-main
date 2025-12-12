'use client';

import type { Database } from '@/types/supabase';

export type GameRow = Database['public']['Tables']['games']['Row'];

export type GameWithRelations = GameRow & {
  owner?: { id: string; name: string | null } | null;
  product?: { id: string; name: string | null } | null;
  main_purpose?: { id: string; name: string | null } | null;
};

export type GameFormValues = {
  name: string;
  short_description: string;
  description: string;
  main_purpose_id: string;
  product_id: string | null;
  owner_tenant_id: string | null;
  category: string | null;
  energy_level: Database['public']['Enums']['energy_level_enum'] | null;
  location_type: Database['public']['Enums']['location_type_enum'] | null;
  time_estimate_min: number | null;
  min_players: number | null;
  max_players: number | null;
  age_min: number | null;
  age_max: number | null;
  status: Database['public']['Enums']['game_status_enum'];
};

export type SelectOption = {
  value: string;
  label: string;
};

export type ImportableGame = Partial<GameFormValues> & {
  name: string;
  short_description: string;
  main_purpose_id: string;
};
