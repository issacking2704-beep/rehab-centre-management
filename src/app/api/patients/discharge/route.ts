import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { recordServerAudit } from "@/lib/audit-server";

export const runtime = "nodejs";

const OPERATING_ROLES = new Set(["super_admin", "admin", "sub_admin", "reception", "staff"]);

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization") || "";
    if (!authorization.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }

    const token = authorization.slice("Bearer ".length).trim();
    if (!token) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }

    const decoded = await getAdminAuth().verifyIdToken(token);
    const profileSnap = await getAdminDb().collection("users").doc(decoded.uid).get();
    const profile = profileSnap.data();
    const role = typeof profile?.role === "string" ? profile.role : "";

    if (!OPERATING_ROLES.has(role)) {
      return NextResponse.json({ success: false, error: "You do not have permission to discharge patients." }, { status: 403 });
    }

    const body = await request.json();
    const firestoreId = typeof body?.firestoreId === "string" ? body.firestoreId.trim() : "";
    const patientId = typeof body?.patientId === "string" ? body.patientId.trim() : "";
    const patientName = typeof body?.patientName === "string" ? body.patientName.trim() : "";

    if (!firestoreId) {
      return NextResponse.json({ success: false, error: "Missing Firestore patient document ID." }, { status: 400 });
    }

    const patientRef = getAdminDb().collection("patients").doc(firestoreId);
    const patientSnap = await patientRef.get();

    if (!patientSnap.exists) {
      return NextResponse.json({ success: false, error: "Patient record was not found." }, { status: 404 });
    }

    const dischargeDate = new Date().toISOString().slice(0, 10);
    await patientRef.update({
      status: "Discharged",
      dischargeDate,
      updatedAt: new Date().toISOString(),
    });

    await recordServerAudit({
      action: "update",
      module: "patients",
      recordId: firestoreId,
      description: `Discharged patient ${patientName || patientId || firestoreId}.`,
      userId: decoded.uid,
      userName: typeof profile?.name === "string" ? profile.name : decoded.email || decoded.uid,
      role,
      metadata: { patientId: patientId || null, dischargeDate },
    });

    return NextResponse.json({ success: true, dischargeDate });
  } catch (error) {
    console.error("Patient discharge API failed:", error);
    const message = error instanceof Error ? error.message : "Unable to discharge the patient.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
