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

type ErrorCategory = "firebase_admin_credentials" | "authentication" | "permissions" | "firestore" | "validation" | "server";

type ApiError = {
  category: ErrorCategory;
  message: string;
  status: number;
  code?: string;
};

function errorResponse(error: ApiError | string, status = 400) {
  if (typeof error === "string") {
    return NextResponse.json({ success: false, error }, { status });
  }

  return NextResponse.json(
    {
      success: false,
      error: error.message,
      category: error.category,
      ...(error.code ? { code: error.code } : {}),
    },
    { status: error.status }
  );
}

function getErrorCode(error: unknown): string {
  if (!error || typeof error !== "object") return "";
  const value = (error as { code?: unknown }).code;
  return typeof value === "string" ? value : typeof value === "number" ? String(value) : "";
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  return "Unknown server error.";
}

function classifyError(error: unknown, fallbackMessage: string): ApiError {
  const code = getErrorCode(error);
  const rawMessage = getErrorMessage(error);
  const message = rawMessage.toLowerCase();

  // Never return private key material or other credential contents to the browser.
  if (
    message.includes("missing firebase admin environment variables") ||
    message.includes("private key") ||
    message.includes("service account") ||
    message.includes("credential") ||
    code === "app/invalid-credential" ||
    code === "app/invalid-argument"
  ) {
    return {
      category: "firebase_admin_credentials",
      status: 500,
      code: code || "firebase_admin_credentials",
      message:
        "Firebase Admin credentials are not configured correctly on the server. Check FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in the Vercel environment variables, then redeploy.",
    };
  }

  if (
    message.includes("missing authentication token") ||
    message.includes("invalid authentication header") ||
    code === "auth/id-token-expired" ||
    code === "auth/id-token-revoked" ||
    code === "auth/argument-error" ||
    code === "auth/invalid-id-token"
  ) {
    return {
      category: "authentication",
      status: 401,
      code: code || "authentication_error",
      message:
        code === "auth/id-token-expired"
          ? "Your Firebase login session has expired. Please sign in again."
          : code === "auth/id-token-revoked"
            ? "Your Firebase login session was revoked. Please sign in again."
            : "Authentication failed. Please sign in again and retry.",
    };
  }

  if (
    message.includes("permission") ||
    code === "permission-denied" ||
    code === "7" ||
    code === "auth/insufficient-permission"
  ) {
    return {
      category: "permissions",
      status: 403,
      code: code || "permission_denied",
      message: "You do not have permission to manage staff. Your Firestore/server account role must be super_admin, admin, or sub_admin.",
    };
  }

  if (
    code === "5" ||
    code === "not-found" ||
    code === "14" ||
    code === "unavailable" ||
    message.includes("firestore") ||
    message.includes("failed to connect") ||
    message.includes("could not reach")
  ) {
    return {
      category: "firestore",
      status: 500,
      code: code || "firestore_error",
      message:
        "Firestore could not complete the staff request. Check that the Firebase Admin service account has access to Firestore and that the Firestore database is enabled.",
    };
  }

  return {
    category: "server",
    status: 500,
    code: code || "internal_server_error",
    message: fallbackMessage,
  };
}

function validationError(message: string, status = 400) {
  return errorResponse({ category: "validation", status, code: "validation_error", message });
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
  } catch (error) {
    console.error("GET /api/staff:", error);
    const apiError = classifyError(error, "Failed to load staff from the server.");
    return errorResponse(apiError);
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

    if (!name) return validationError("Staff name is required.");
    if (!CREATABLE_ROLES.includes(role)) return validationError("Invalid staff role.");
    if (manager.role === "sub_admin" && role === "admin") return errorResponse({ category: "permissions", status: 403, code: "role_creation_forbidden", message: "Sub Admins cannot create Admin accounts." });

    if (role !== "patient_attender") {
      if (!email) return validationError("Staff email is required.");
      if (!password) return validationError("Staff password is required.");
      if (password.length < 6) return validationError("Password must contain at least 6 characters.");
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
      try {
        await adminAuth.deleteUser(userRecord.uid);
      } catch (cleanupError) {
        console.error("Failed to cleanup Auth user:", cleanupError);
      }
      if (passkeyHash) {
        try {
          await adminDb.collection(PATIENT_ATTENDER_PASSKEY_COLLECTION).doc(passkeyHash).delete();
        } catch {}
      }
      throw firestoreError;
    }

    return NextResponse.json(
      {
        success: true,
        message: role === "patient_attender" ? "Patient Attender created. Save the generated passkey securely." : "Staff account created successfully.",
        passkey: passkey || undefined,
        staff: { uid: userRecord.uid, name, email, phone, role, active: true, assignedPatientIds },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/staff:", error);
    const code = getErrorCode(error);
    if (code === "auth/email-already-exists") {
      return errorResponse({ category: "validation", status: 409, code, message: "An account with this email already exists." });
    }
    const apiError = classifyError(error, "Failed to create the staff account on the server.");
    return errorResponse(apiError);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireStaffManager(request);
    const body = await request.json();
    const uid = String(body.uid || "").trim();
    const active = Boolean(body.active);
    if (!uid) return validationError("Staff UID is required.");

    const staffRef = adminDb.collection("users").doc(uid);
    const staffDoc = await staffRef.get();
    if (!staffDoc.exists) return errorResponse({ category: "firestore", status: 404, code: "staff_not_found", message: "Staff account not found." });
    const staffData = staffDoc.data() || {};
    if (staffData.role === "super_admin") return errorResponse({ category: "permissions", status: 403, code: "super_admin_protected", message: "The Super Admin account cannot be disabled." });

    await adminAuth.updateUser(uid, { disabled: !active });
    await staffRef.update({ active });

    if (staffData.role === "patient_attender" && staffData.passkeyHash) {
      await adminDb.collection(PATIENT_ATTENDER_PASSKEY_COLLECTION).doc(staffData.passkeyHash).update({ active });
    }

    return NextResponse.json({ success: true, message: active ? "Staff account enabled." : "Staff account disabled." });
  } catch (error) {
    console.error("PATCH /api/staff:", error);
    const apiError = classifyError(error, "Failed to update the staff account on the server.");
    return errorResponse(apiError);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireStaffManager(request);
    const body = await request.json();
    const uid = String(body.uid || "").trim();
    if (!uid) return validationError("Staff UID is required.");

    const staffRef = adminDb.collection("users").doc(uid);
    const staffDoc = await staffRef.get();
    if (!staffDoc.exists) return errorResponse({ category: "firestore", status: 404, code: "staff_not_found", message: "Staff account not found." });
    const staffData = staffDoc.data() || {};
    if (staffData.role === "super_admin") return errorResponse({ category: "permissions", status: 403, code: "super_admin_protected", message: "The Super Admin account cannot be deleted." });

    await adminAuth.deleteUser(uid);
    if (staffData.passkeyHash) {
      await adminDb.collection(PATIENT_ATTENDER_PASSKEY_COLLECTION).doc(staffData.passkeyHash).delete();
    }
    await staffRef.delete();
    return NextResponse.json({ success: true, message: "Staff account deleted." });
  } catch (error) {
    console.error("DELETE /api/staff:", error);
    const apiError = classifyError(error, "Failed to delete the staff account on the server.");
    return errorResponse(apiError);
  }
}
