import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import {
  generatePatientAttenderPasskey,
  hashPatientAttenderPasskey,
  PATIENT_ATTENDER_PASSKEY_COLLECTION,
} from "@/lib/patient-attender";

export const runtime = "nodejs";

type StaffRole = "admin" | "sub_admin" | "patient_attender" | "super_admin";
const STAFF_ROLES: StaffRole[] = ["admin", "sub_admin", "patient_attender", "super_admin"];
const CREATABLE_ROLES: StaffRole[] = ["admin", "sub_admin", "patient_attender"];

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

async function getAuthenticatedUser(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (!authorization) throw new Error("Missing authentication token.");
  if (!authorization.startsWith("Bearer ")) throw new Error("Invalid authentication header.");
  const token = authorization.substring(7).trim();
  if (!token) throw new Error("Missing authentication token.");
  return adminAuth.verifyIdToken(token);
}

async function requireStaffManager(request: NextRequest) {
  const decodedToken = await getAuthenticatedUser(request);
  const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
  if (!userDoc.exists) throw new Error("Your user profile was not found.");
  const role = userDoc.data()?.role;
  if (role !== "super_admin" && role !== "admin" && role !== "sub_admin") {
    throw new Error("You do not have permission to manage staff.");
  }
  return { uid: decodedToken.uid, role: role as StaffRole };
}

function serializeDate(value: any): string {
  if (!value) return "";
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return typeof value === "string" ? value : "";
}

export async function GET(request: NextRequest) {
  try {
    await requireStaffManager(request);
    const snapshot = await adminDb.collection("users").get();
    const staff = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          uid: doc.id,
          name: data.name || "",
          email: data.email || "",
          role: data.role || "",
          phone: data.phone || "",
          active: data.active !== false,
          createdAt: serializeDate(data.createdAt),
          assignedPatientIds: Array.isArray(data.assignedPatientIds) ? data.assignedPatientIds : [],
          passkeyLast4: data.passkeyLast4 || "",
          passkeyCreatedAt: serializeDate(data.passkeyCreatedAt),
          passkeyLastUsedAt: serializeDate(data.passkeyLastUsedAt),
        };
      })
      .filter((person) => STAFF_ROLES.includes(person.role as StaffRole));
    return NextResponse.json({ success: true, staff });
  } catch (error: any) {
    console.error("GET /api/staff:", error);
    const message = error?.message || "Failed to load staff.";
    const status = message.includes("authentication") ? 401 : message.includes("permission") ? 403 : 500;
    return errorResponse(message, status);
  }
}

export async function POST(request: NextRequest) {
  try {
    const manager = await requireStaffManager(request);
    const body = await request.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const phone = String(body.phone || "").trim();
    const role = body.role as StaffRole;
    const assignedPatientIds = Array.isArray(body.assignedPatientIds)
      ? [...new Set(body.assignedPatientIds.map((id: unknown) => String(id).trim()).filter(Boolean))]
      : [];

    if (!name) return errorResponse("Staff name is required.");
    if (!CREATABLE_ROLES.includes(role)) return errorResponse("Invalid staff role.");
    if (manager.role === "sub_admin" && role === "admin") return errorResponse("Sub Admins cannot create Admin accounts.", 403);

    if (role !== "patient_attender") {
      if (!email) return errorResponse("Staff email is required.");
      if (!password) return errorResponse("Staff password is required.");
      if (password.length < 6) return errorResponse("Password must contain at least 6 characters.");
    }

    if (role === "patient_attender" && assignedPatientIds.length) {
      const checks = await Promise.all(assignedPatientIds.map((id) => adminDb.collection("patients").doc(id).get()));
      const valid = checks.filter((doc) => doc.exists && doc.data()?.isDeleted !== true).map((doc) => doc.id);
      assignedPatientIds.splice(0, assignedPatientIds.length, ...valid);
    }

    const authData: { displayName: string; disabled: boolean; email?: string; password?: string } = {
      displayName: name,
      disabled: false,
    };
    if (email) authData.email = email;
    if (password) authData.password = password;

    const userRecord = await adminAuth.createUser(authData);
    let passkey = "";
    let passkeyHash = "";

    try {
      const userData: Record<string, any> = {
        uid: userRecord.uid,
        name,
        email,
        phone,
        role,
        active: true,
        assignedPatientIds: role === "patient_attender" ? assignedPatientIds : [],
        createdAt: new Date(),
      };

      if (role === "patient_attender") {
        passkey = generatePatientAttenderPasskey();
        passkeyHash = hashPatientAttenderPasskey(passkey);
        userData.passkeyHash = passkeyHash;
        userData.passkeyLast4 = passkey.slice(-4);
        userData.passkeyCreatedAt = new Date();
        userData.passkeyLastUsedAt = null;
        await adminDb.collection(PATIENT_ATTENDER_PASSKEY_COLLECTION).doc(passkeyHash).set({
          uid: userRecord.uid,
          active: true,
          createdAt: new Date(),
        });
      }

      await adminDb.collection("users").doc(userRecord.uid).set(userData);
    } catch (firestoreError) {
      try { await adminAuth.deleteUser(userRecord.uid); } catch (cleanupError) { console.error("Failed to cleanup Auth user:", cleanupError); }
      if (passkeyHash) {
        try { await adminDb.collection(PATIENT_ATTENDER_PASSKEY_COLLECTION).doc(passkeyHash).delete(); } catch {}
      }
      throw firestoreError;
    }

    return NextResponse.json({
      success: true,
      message: role === "patient_attender" ? "Patient Attender created. Save the generated passkey securely." : "Staff account created successfully.",
      passkey: passkey || undefined,
      staff: { uid: userRecord.uid, name, email, phone, role, active: true, assignedPatientIds },
    }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/staff:", error);
    if (error?.code === "auth/email-already-exists") return errorResponse("An account with this email already exists.", 409);
    const message = error?.message || "Failed to create staff account.";
    const status = message.includes("authentication") ? 401 : message.includes("permission") || message.includes("cannot create") ? 403 : 500;
    return errorResponse(message, status);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireStaffManager(request);
    const body = await request.json();
    const uid = String(body.uid || "").trim();
    const active = Boolean(body.active);
    if (!uid) return errorResponse("Staff UID is required.");

    const staffRef = adminDb.collection("users").doc(uid);
    const staffDoc = await staffRef.get();
    if (!staffDoc.exists) return errorResponse("Staff account not found.", 404);
    const staffData = staffDoc.data() || {};
    if (staffData.role === "super_admin") return errorResponse("The Super Admin account cannot be disabled.", 403);

    await adminAuth.updateUser(uid, { disabled: !active });
    await staffRef.update({ active });

    if (staffData.role === "patient_attender" && staffData.passkeyHash) {
      await adminDb.collection(PATIENT_ATTENDER_PASSKEY_COLLECTION).doc(staffData.passkeyHash).update({ active });
    }

    return NextResponse.json({ success: true, message: active ? "Staff account enabled." : "Staff account disabled." });
  } catch (error: any) {
    console.error("PATCH /api/staff:", error);
    const message = error?.message || "Failed to update staff.";
    const status = message.includes("authentication") ? 401 : message.includes("permission") ? 403 : 500;
    return errorResponse(message, status);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireStaffManager(request);
    const body = await request.json();
    const uid = String(body.uid || "").trim();
    if (!uid) return errorResponse("Staff UID is required.");

    const staffRef = adminDb.collection("users").doc(uid);
    const staffDoc = await staffRef.get();
    if (!staffDoc.exists) return errorResponse("Staff account not found.", 404);
    const staffData = staffDoc.data() || {};
    if (staffData.role === "super_admin") return errorResponse("The Super Admin account cannot be deleted.", 403);

    await adminAuth.deleteUser(uid);
    if (staffData.passkeyHash) {
      await adminDb.collection(PATIENT_ATTENDER_PASSKEY_COLLECTION).doc(staffData.passkeyHash).delete();
    }
    await staffRef.delete();
    return NextResponse.json({ success: true, message: "Staff account deleted." });
  } catch (error: any) {
    console.error("DELETE /api/staff:", error);
    const message = error?.message || "Failed to delete staff.";
    const status = message.includes("authentication") ? 401 : message.includes("permission") ? 403 : 500;
    return errorResponse(message, status);
  }
}
