import { Capability, ProductAdminItem } from "./types";

const baseCapabilities: Capability[] = [
  { id: "cap-browse-view", key: "browse.view", label: "Browse library", group: "Browse" },
  { id: "cap-browse-filter", key: "browse.filter", label: "Advanced filters", group: "Browse" },
  { id: "cap-play-run", key: "play.run", label: "Run activities", group: "Play" },
  { id: "cap-play-host", key: "play.host", label: "Host live sessions", group: "Play" },
  { id: "cap-planner-create", key: "planner.create", label: "Create plans", group: "Planner" },
  { id: "cap-planner-assign", key: "planner.assign", label: "Assign plans to orgs", group: "Planner" },
  { id: "cap-gamification-earn", key: "gamification.earn", label: "Earn achievements", group: "Gamification" },
  { id: "cap-gamification-manage", key: "gamification.manage", label: "Manage achievements", group: "Gamification" },
  { id: "cap-analytics-view", key: "analytics.view", label: "Analytics dashboard", group: "Analytics" },
  { id: "cap-analytics-export", key: "analytics.export", label: "Export reports", group: "Analytics" },
  { id: "cap-admin-users", key: "admin.users", label: "Manage users", group: "Admin" },
  { id: "cap-admin-orgs", key: "admin.organisations", label: "Manage organisations", group: "Admin" },
];

export const mockProducts: ProductAdminItem[] = [
  {
    id: "prod-core",
    name: "Lekbanken Core",
    category: "platform",
    description: "Base platform capabilities and content access.",
    status: "active",
    capabilities: [
      "browse.view",
      "browse.filter",
      "play.run",
      "planner.create",
      "admin.users",
      "admin.organisations",
    ].map((key) => baseCapabilities.find((c) => c.key === key)!),
    createdAt: "2024-03-10T10:00:00Z",
  },
  {
    id: "prod-gamification",
    name: "Gamification Pro",
    category: "addon",
    description: "Achievements, rewards, and engagement tooling.",
    status: "active",
    capabilities: [
      "gamification.earn",
      "gamification.manage",
      "analytics.view",
    ].map((key) => baseCapabilities.find((c) => c.key === key)!),
    createdAt: "2024-05-02T08:30:00Z",
  },
  {
    id: "prod-analytics",
    name: "Analytics",
    category: "addon",
    description: "Reporting, exports, and usage insights.",
    status: "inactive",
    capabilities: [
      "analytics.view",
      "analytics.export",
    ].map((key) => baseCapabilities.find((c) => c.key === key)!),
    createdAt: "2024-06-15T12:00:00Z",
  },
];

export function getBaseCapabilities(): Capability[] {
  return baseCapabilities;
}
