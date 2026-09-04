import { createHash, randomBytes } from "crypto";

export const PATIENT_ATTENDER_PASSKEY_COLLECTION = "patientAttenderPasskeys";

export function generatePatientAttenderPasskey(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(12);
  let value = "";

  for (let index = 0; index < 12; index += 1) {
    value += alphabet[bytes[index] % alphabet.length];
  }

  return `PA-${value.slice(0, 4)}-${value.slice(4, 8)}-${value.slice(8)}`;
}

export function normalizePatientAttenderPasskey(value: string): string {
  return String(value || "").trim().toUpperCase().replace(/\s+/g, "");
}

export function hashPatientAttenderPasskey(value: string): string {
  return createHash("sha256")
    .update(normalizePatientAttenderPasskey(value))
    .digest("hex");
}
