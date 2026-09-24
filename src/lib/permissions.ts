export type StaffRoleName = "OWNER" | "MUCOMA" | "FRONT_DESK";

export type Capability =
  | "dashboard.view"
  | "pos.use"
  | "orders.create"
  | "orders.dispatch"
  | "orders.settle"
  | "rooms.manage"
  | "products.manage"
  | "stock.manage"
  | "kitchen.view"
  | "kitchen.update"
  | "users.manage"
  | "access.manage"
  | "audit.view";

export const capabilityCatalog: Capability[] = [
  "dashboard.view",
  "pos.use",
  "orders.create",
  "orders.dispatch",
  "orders.settle",
  "rooms.manage",
  "products.manage",
  "stock.manage",
  "kitchen.view",
  "kitchen.update",
  "users.manage",
  "access.manage",
  "audit.view",
];

export const roleLabels: Record<StaffRoleName, string> = {
  OWNER: "Owner",
  MUCOMA: "Mucoma",
  FRONT_DESK: "Front Desk",
};

const roleCapabilities: Record<StaffRoleName, Capability[]> = {
  OWNER: [
    "dashboard.view",
    "pos.use",
    "orders.create",
    "orders.dispatch",
    "orders.settle",
    "rooms.manage",
    "products.manage",
    "stock.manage",
    "kitchen.view",
    "kitchen.update",
    "users.manage",
    "access.manage",
    "audit.view",
  ],
  FRONT_DESK: [
    "dashboard.view",
    "pos.use",
    "orders.create",
    "orders.dispatch",
    "orders.settle",
    "rooms.manage",
    "products.manage",
    "stock.manage",
    "kitchen.view",
  ],
  MUCOMA: ["kitchen.view", "kitchen.update"],
};

export function hasCapability(role: StaffRoleName, capability: Capability) {
  return roleCapabilities[role].includes(capability);
}
