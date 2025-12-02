import type { ReactNode } from "react";

export type OverviewMetric = {
  id: string;
  label: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down" | "flat";
  iconGradient?: string;
  icon?: ReactNode;
};

export type QuickLinkItem = {
  id: string;
  label: string;
  description?: string;
  href: string;
  iconGradient?: string;
  icon?: ReactNode;
};

export type ActivityItem = {
  id: string;
  type: "user_created" | "organisation_created" | "product_updated" | "achievement_created" | "license_updated" | "other";
  message: string;
  createdAt: string;
  status?: "info" | "success" | "warning";
  icon?: ReactNode;
};
