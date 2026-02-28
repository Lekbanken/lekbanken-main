export type CategoryAdminRow = {
  id: string;
  slug: string;
  name: string;
  description_short: string | null;
  icon_key: string | null;
  sort_order: number;
  is_public: boolean;
  bundle_product_id: string | null;
  created_at: string;
  updated_at: string;
  metadata: unknown;
  product_count: number;
};

export type CreateCategoryInput = {
  slug?: string;
  name: string;
  description_short?: string | null;
  icon_key?: string | null;
  sort_order?: number;
  is_public?: boolean;
  bundle_product_id?: string | null;
};

export type SyncBundleResult = {
  added_count: number;
  removed_count: number;
  total_count: number;
};
