export type OperationalRole = "OWNER" | "RECEPTIONIST" | "WAITER" | "MUCOMA";

export function getConfiguredRole(): OperationalRole {
  const value = process.env.UMUGANO_ROLE?.toUpperCase();

  if (value === "ADMIN" || value === "OWNER") return "OWNER";
  if (value === "RECEPTIONIST") return "RECEPTIONIST";
  if (value === "WAITER") return "WAITER";
  if (value === "MUCOMA") return "MUCOMA";

  // The current deployment has no authentication/session layer yet. Receptionist
  // is the safe operational default while the full-access team is active.
  return "RECEPTIONIST";
}

export function canManageCatalog(role: OperationalRole) {
  return role === "OWNER" || role === "RECEPTIONIST" || role === "WAITER";
}

export function canOperatePos(role: OperationalRole) {
  return role !== "MUCOMA";
}

export const roleLabels: Record<OperationalRole, string> = {
  OWNER: "Owner",
  RECEPTIONIST: "Receptionist",
  WAITER: "Waiter",
  MUCOMA: "Mucoma",
};
