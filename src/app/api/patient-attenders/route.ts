import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { recordServerAudit } from "@/lib/audit-server";
import {
  generatePatientAttenderPasskey,
  hashPatientAttenderPasskey,
  PATIENT_ATTENDER_PASSKEY_COLLECTION,
} from "@/lib/patient-attender";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

async function requireManager(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) throw new Error("Missing authentication token.");
  const decoded = await adminAuth.verifyIdToken(authorization.substring(7).trim());
  const snapshot = await adminDb.collection("users").doc(decoded.uid).get();
  const role = snapshot.data()?.role;
  if (!snapshot.exists || !["super_admin", "admin", "sub_admin"].includes(String(role))) {
    throw new Error("You do not have permission to manage Patient Attenders.");
  }
  return { uid: decoded.uid, role: String(role) };
}

function serializeDate(value: any): string {
  if (!value) return "";
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return typeof value === "string" ? value : "";
}

export async function GET(request: NextRequest) {
  try {
    await requireManager(request);

    const [staffSnapshot, patientSnapshot] = await Promise.all([
      adminDb.collection("users").where("role", "==", "patient_attender").get(),
      adminDb.collection("patients").get(),
    ]);

    const attenders = staffSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        uid: doc.id,
        name: data.name || "",
        email: data.email || "",
        phone: data.phone || "",
        active: data.active !== false,
        assignedPatientIds: Array.isArray(data.assignedPatientIds) ? data.assignedPatientIds : [],
        passkeyLast4: data.passkeyLast4 || "",
        passkeyCreatedAt: serializeDate(data.passkeyCreatedAt),
        passkeyLastUsedAt: serializeDate(data.passkeyLastUsedAt),
      };
    });

    const patients = patientSnapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((patient: any) => patient.isDeleted !== true)
      .map((patient: any) => ({
        id: patient.id,
        name: patient.name || "",
        phone: patient.phone || "",
        room: patient.room || "",
        diagnosis: patient.diagnosis || "",
        admissionDate: patient.admissionDate || "",
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ success: true, attenders, patients });
  } catch (error: any) {
    console.error("GET /api/patient-attenders:", error);
    const message = error?.message || "Failed to load Patient Attenders.";
    return errorResponse(message, message.includes("permission") ? 403 : 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const manager = await requireManager(request);
    const body = await request.json();
    const uid = String(body.uid || "").trim();
    const assignedPatientIds: string[] = Array.isArray(body.assignedPatientIds)
      ? body.assignedPatientIds.map((id: unknown) => String(id).trim()).filter(Boolean)
      : [];
    const uniquePatientIds = [...new Set(assignedPatientIds)];

    if (!uid) return errorResponse("Patient Attender UID is required.");

    const staffRef = adminDb.collection("users").doc(uid);
    const staffSnapshot = await staffRef.get();
    if (!staffSnapshot.exists || staffSnapshot.data()?.role !== "patient_attender") {
      return errorResponse("Patient Attender account not found.", 404);
    }

    const validPatientIds = new Set<string>();
    if (uniquePatientIds.length) {
      const snapshots = await Promise.all(
        uniquePatientIds.map((id: string) => adminDb.collection("patients").doc(String(id)).get())
      );
      snapshots.forEach((snapshot) => {
        if (snapshot.exists && snapshot.data()?.isDeleted !== true) validPatientIds.add(snapshot.id);
      });
    }

    const cleanIds = uniquePatientIds.filter((id: string) => validPatientIds.has(id));
    await staffRef.update({ assignedPatientIds: cleanIds, updatedAt: new Date() });

    // Read the document back immediately so the UI only reports success when
    // Firestore actually persisted the assignment list.
    const verifySnapshot = await staffRef.get();
    const savedIds = Array.isArray(verifySnapshot.data()?.assignedPatientIds)
      ? verifySnapshot.data()?.assignedPatientIds.map((id: unknown) => String(id))
      : [];
    const sameIds = savedIds.length === cleanIds.length && cleanIds.every((id) => savedIds.includes(id));
    if (!sameIds) {
      return errorResponse("Assignments could not be verified after saving. Please retry.", 500);
    }

    await recordServerAudit({ action: "update", module: "patient-attenders", recordId: uid, description: "Updated Patient Attender patient assignments.", userId: manager.uid, role: manager.role, metadata: { assignedCount: savedIds.length } });

    return NextResponse.json({ success: true, assignedPatientIds: savedIds, assignedCount: savedIds.length, message: "Patient assignments updated." });
  } catch (error: any) {
    console.error("PATCH /api/patient-attenders:", error);
    const message = error?.message || "Failed to update assignments.";
    return errorResponse(message, message.includes("permission") ? 403 : 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const manager = await requireManager(request);
    const body = await request.json();
    const uid = String(body.uid || "").trim();
    if (!uid) return errorResponse("Patient Attender UID is required.");

    const staffRef = adminDb.collection("users").doc(uid);
    const staffSnapshot = await staffRef.get();
    if (!staffSnapshot.exists || staffSnapshot.data()?.role !== "patient_attender") {
      return errorResponse("Patient Attender account not found.", 404);
    }

    const passkey = generatePatientAttenderPasskey();
    const hash = hashPatientAttenderPasskey(passkey);
    const existing = await adminDb.collection(PATIENT_ATTENDER_PASSKEY_COLLECTION).doc(String(hash)).get();
    if (existing.exists) return errorResponse("Passkey collision. Please try again.", 409);

    const oldHash = staffSnapshot.data()?.passkeyHash;
    const batch = adminDb.batch();
    if (oldHash) batch.delete(adminDb.collection(PATIENT_ATTENDER_PASSKEY_COLLECTION).doc(String(oldHash)));
    batch.set(adminDb.collection(PATIENT_ATTENDER_PASSKEY_COLLECTION).doc(String(hash)), {
      uid,
      active: staffSnapshot.data()?.active !== false,
      createdAt: new Date(),
    });
    batch.update(staffRef, {
      passkeyHash: hash,
      passkeyLast4: passkey.slice(-4),
      passkeyCreatedAt: new Date(),
      passkeyLastUsedAt: null,
    });
    await batch.commit();
    await recordServerAudit({ action: "update", module: "patient-attenders", recordId: uid, description: "Regenerated Patient Attender passkey.", userId: manager.uid, role: manager.role });

    return NextResponse.json({ success: true, passkey, message: "A new Patient Attender passkey was generated." });
  } catch (error: any) {
    console.error("POST /api/patient-attenders:", error);
    const message = error?.message || "Failed to regenerate passkey.";
    return errorResponse(message, message.includes("permission") ? 403 : 500);
  }
}
