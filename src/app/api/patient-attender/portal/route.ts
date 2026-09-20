import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

function response(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

async function requireAttender(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) throw new Error("Missing authentication token.");
  const decoded = await adminAuth.verifyIdToken(authorization.substring(7).trim());
  const userSnapshot = await adminDb.collection("users").doc(decoded.uid).get();
  const userData = userSnapshot.data();
  if (!userSnapshot.exists || userData?.role !== "patient_attender") {
    throw new Error("Patient Attender access is required.");
  }
  if (userData?.active === false) throw new Error("This account is disabled.");
  return { uid: decoded.uid, userData };
}

function serializeDate(value: any): string {
  if (!value) return "";
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return typeof value === "string" ? value : "";
}

export async function GET(request: NextRequest) {
  try {
    const { uid, userData } = await requireAttender(request);
    const assignedIds = Array.isArray(userData.assignedPatientIds)
      ? [...new Set(userData.assignedPatientIds.map(String))]
      : [];

    const patientSnapshot = await adminDb.collection("patients").get();
    const assignedSet = new Set(assignedIds);

    // Resolve both canonical patient IDs (RC-00001) and legacy Firestore IDs.
    const patients = patientSnapshot.docs
      .filter((snapshot) => snapshot.exists && snapshot.data()?.isDeleted !== true)
      .filter((snapshot) => {
        const data = snapshot.data() || {};
        return assignedSet.has(snapshot.id) || assignedSet.has(String(data.id || ""));
      })
      .map((snapshot) => {
        const data = snapshot.data() || {};
        return {
          id: String(data.id || snapshot.id),
          firestoreId: snapshot.id,
          name: data.name || "",
          age: data.age || "",
          gender: data.gender || "",
          phone: data.phone || "",
          emergencyContact: data.emergencyContact || "",
          admissionDate: data.admissionDate || "",
          diagnosis: data.diagnosis || "",
          therapist: data.therapist || "",
          room: data.room || "",
          notes: data.notes || "",
        };
      });

    if (!assignedIds.length) {
      return NextResponse.json({
        success: true,
        attender: { uid, name: userData.name || "Patient Attender" },
        patients: [],
        vitals: [],
      });
    }

    const allowedFirestoreIds = new Set(patients.map((patient) => patient.firestoreId));
    const allowedPatientIds = new Set(patients.map((patient) => patient.id));

    const vitalSnapshots = await adminDb.collection("vitals").get();
    const vitals = vitalSnapshots.docs
      .map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }))
      .filter((vital: any) => {
        const patientId = String(vital.patientId || "");
        return allowedPatientIds.has(patientId) || allowedFirestoreIds.has(patientId);
      })
      .map((vital: any) => ({
        id: vital.id,
        patientId: String(vital.patientId || ""),
        patientName: vital.patientName || "",
        date: vital.date || "",
        time: vital.time || "",
        bloodPressure: vital.bloodPressure || "",
        pulse: vital.pulse || "",
        temperature: vital.temperature || "",
        spo2: vital.spo2 || "",
        respiratoryRate: vital.respiratoryRate || "",
        weight: vital.weight || "",
        notes: vital.notes || "",
        createdAt: serializeDate(vital.createdAt),
      }))
      .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));

    return NextResponse.json({
      success: true,
      attender: { uid, name: userData.name || "Patient Attender" },
      patients,
      vitals,
    });
  } catch (error: any) {
    console.error("GET /api/patient-attender/portal:", error);
    const message = error?.message || "Unable to load your assigned patients.";
    return response(message, message.includes("access") || message.includes("authentication") ? 401 : 403);
  }
}
