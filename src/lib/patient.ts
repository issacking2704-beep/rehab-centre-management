export type Patient = {
  id: string;
  name: string;
  age: string;
  gender: string;
  phone: string;
  address: string;
  emergencyContact: string;
  admissionDate: string;
  dischargeDate: string;
  diagnosis: string;
  therapist: string;
  room: string;
  notes: string;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string;
  isDeleted?: boolean;
};

export const PATIENTS_COLLECTION = "patients";

export function makePatientId(existingIds: string[]): string {
  const max = existingIds.reduce((highest, id) => {
    const match = id.match(/^RC-(\d+)$/i);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);

  return `RC-${String(max + 1).padStart(5, "0")}`;
}
