import { UserAdminItem } from "./types";

const baseMockUsers: UserAdminItem[] = [
  {
    id: "mock-1",
    name: "Alex Berg",
    email: "alex.berg@lekbanken.test",
    roles: ["organisation_admin"],
    organisationName: "Lekbanken",
    status: "active",
    createdAt: "2024-10-12T09:00:00Z",
    lastActiveAt: "2024-12-01T10:24:00Z",
  },
  {
    id: "mock-2",
    name: "Maja Lind",
    email: "maja.lind@lekbanken.test",
    roles: ["admin"],
    organisationName: "Lekbanken",
    status: "active",
    createdAt: "2024-11-02T12:15:00Z",
    lastActiveAt: "2024-12-02T08:12:00Z",
  },
  {
    id: "mock-3",
    name: "Sara Holm",
    email: "sara.holm@lekbanken.test",
    roles: ["member"],
    organisationName: "Lekbanken",
    status: "invited",
    createdAt: "2024-11-20T14:30:00Z",
    lastActiveAt: null,
  },
  {
    id: "mock-4",
    name: "Johan Ek",
    email: "johan.ek@lekbanken.test",
    roles: ["user"],
    organisationName: "Lekbanken",
    status: "inactive",
    createdAt: "2024-09-08T10:45:00Z",
    lastActiveAt: "2024-10-15T18:35:00Z",
  },
  {
    id: "mock-5",
    name: "Demo Admin",
    email: "demo.admin@lekbanken.test",
    roles: ["system_admin", "product_admin"],
    organisationName: "Lekbanken",
    status: "active",
    createdAt: "2024-08-18T07:10:00Z",
    lastActiveAt: "2024-11-29T09:00:00Z",
  },
];

export function createMockUsers(organisationName?: string): UserAdminItem[] {
  return baseMockUsers.map((user) => ({
    ...user,
    organisationName: organisationName ?? user.organisationName,
  }));
}
