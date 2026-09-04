export type UserRole =
  | "super_admin"
  | "admin"
  | "doctor"
  | "staff"
  | "accounts"
  | "reception"
  | "viewer"
  | "sub_admin"
  | "patient_attender";

export const permissions: Record<UserRole, string[]> = {
  super_admin: ["dashboard", "patients", "staff", "attendance", "vitals", "billing", "invoices", "letterhead", "documents", "reports", "settings", "deleted_patients"],
  admin: ["dashboard", "patients", "staff", "attendance", "vitals", "billing", "invoices", "letterhead", "documents", "reports"],
  doctor: ["dashboard", "patients", "vitals", "reports", "documents"],
  staff: ["dashboard", "patients", "attendance", "vitals", "documents"],
  accounts: ["dashboard", "patients", "billing", "invoices", "reports", "documents"],
  reception: ["dashboard", "patients", "attendance", "billing", "invoices", "documents"],
  viewer: ["dashboard", "patients", "vitals", "reports"],
  sub_admin: ["dashboard", "patients", "vitals", "attendance"],
  patient_attender: ["dashboard", "attender_portal"],
};

export const roleLabels: Record<UserRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  doctor: "Doctor",
  staff: "Staff",
  accounts: "Accounts",
  reception: "Reception",
  viewer: "Viewer",
  sub_admin: "Sub Admin",
  patient_attender: "Patient Attender",
};

export function hasPermission(role: UserRole, permission: string): boolean {
  return permissions[role]?.includes(permission) ?? false;
}

export function isSuperAdmin(role: UserRole): boolean {
  return role === "super_admin";
}
