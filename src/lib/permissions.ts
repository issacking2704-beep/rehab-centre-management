export type UserRole =
  | "super_admin"
  | "admin"
  | "sub_admin"
  | "patient_attender";

export const permissions: Record<UserRole, string[]> = {
  super_admin: [
    "dashboard",
    "patients",
    "staff",
    "attendance",
    "vitals",
    "billing",
    "invoices",
    "letterhead",
    "reports",
    "settings",
    "deleted_patients",
  ],

  admin: [
    "dashboard",
    "patients",
    "staff",
    "attendance",
    "vitals",
    "billing",
    "invoices",
    "letterhead",
    "reports",
  ],

  sub_admin: [
    "dashboard",
    "patients",
    "vitals",
    "attendance",
  ],

  patient_attender: [
    "dashboard",
    "patients",
    "vitals",
    "attendance",
  ],
};

export function hasPermission(
  role: UserRole,
  permission: string
): boolean {
  return permissions[role]?.includes(permission) ?? false;
}