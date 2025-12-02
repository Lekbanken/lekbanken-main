import { OrganisationAdminItem } from "./types";

export const mockOrganisations: OrganisationAdminItem[] = [
  {
    id: "org-1",
    name: "Lekbanken",
    contactName: "Camilla As",
    contactEmail: "camilla@lekbanken.test",
    contactPhone: "+46 70 123 45 67",
    status: "active",
    membersCount: 2847,
    subscriptionPlan: "Enterprise",
    createdAt: "2024-01-15T10:00:00Z",
  },
  {
    id: "org-2",
    name: "Sunrise Schools",
    contactName: "Oskar Berg",
    contactEmail: "oskar@sunrise.sch",
    contactPhone: "+46 73 456 78 90",
    status: "active",
    membersCount: 420,
    subscriptionPlan: "Business",
    createdAt: "2024-04-12T12:30:00Z",
  },
  {
    id: "org-3",
    name: "Nordic Play Lab",
    contactName: "Karin Dahl",
    contactEmail: "karin@nordicplay.se",
    status: "inactive",
    membersCount: 85,
    subscriptionPlan: "Starter",
    createdAt: "2023-11-02T08:20:00Z",
  },
  {
    id: "org-4",
    name: "Demo Org",
    contactEmail: "demo@lekbanken.test",
    status: "active",
    membersCount: 32,
    subscriptionPlan: "Sandbox",
    createdAt: "2024-09-01T14:00:00Z",
  },
];

export function createMockOrganisation(name: string, contactEmail: string): OrganisationAdminItem {
  return {
    id: `org-${Date.now()}`,
    name,
    contactEmail,
    status: "active",
    membersCount: 0,
    createdAt: new Date().toISOString(),
  };
}
