export type StaffAccessProfile = { role?: unknown; permissions?: unknown } | null | undefined;

export function normalizeStaffRole(role: unknown): string {
  return typeof role === "string" ? role.trim().toLowerCase() : "";
}

export function normalizeStaffPermissions(permissions: unknown): string[] {
  if (!Array.isArray(permissions)) return [];
  return permissions
    .filter((permission): permission is string => typeof permission === "string")
    .map((permission) => permission.trim().toLowerCase())
    .filter(Boolean);
}

export function hasStaffPermission(profile: StaffAccessProfile, permission: string): boolean {
  return normalizeStaffPermissions(profile?.permissions).includes(permission.trim().toLowerCase());
}

export function canManageStaff(profile: StaffAccessProfile): boolean {
  return ["owner", "admin"].includes(normalizeStaffRole(profile?.role)) ||
    hasStaffPermission(profile, "staff.manage");
}

export function canUseStaffOperations(profile: StaffAccessProfile): boolean {
  return canManageStaff(profile);
}


const POS_PERMISSIONS = [
  "pos.access",
  "pos.view",
  "pos.sell",
  "pos.manage_catalogue",
  "pos.manage_tables",
  "pos.kitchen",
  "pos.payments",
  "pos.refund",
  "pos.shifts",
  "pos.reports",
] as const;

export type PosPermission = (typeof POS_PERMISSIONS)[number];

/** POS access is independent of restaurant/customer permissions. */
export function hasPosPermission(profile: StaffAccessProfile, permission: PosPermission): boolean {
  const role = normalizeStaffRole(profile?.role);
  if (role === "owner" || role === "admin") return true;
  const permissions = normalizeStaffPermissions(profile?.permissions);
  return permissions.includes("pos.access") && permissions.includes(permission);
}

export function canAccessPos(profile: StaffAccessProfile): boolean {
  const role = normalizeStaffRole(profile?.role);
  return role === "owner" || role === "admin" ||
    normalizeStaffPermissions(profile?.permissions).includes("pos.access");
}

export function canUsePosTerminal(profile: StaffAccessProfile): boolean {
  return canAccessPos(profile) && hasPosPermission(profile, "pos.sell");
}
