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
