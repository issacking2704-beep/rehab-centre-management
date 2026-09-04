import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import {
  hashPatientAttenderPasskey,
  PATIENT_ATTENDER_PASSKEY_COLLECTION,
} from "@/lib/patient-attender";

export const runtime = "nodejs";

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const passkey = String(body.passkey || "").trim();

    if (!passkey) {
      return errorResponse("Please enter your Patient Attender passkey.");
    }

    const hash = hashPatientAttenderPasskey(passkey);
    const passkeyRef = adminDb
      .collection(PATIENT_ATTENDER_PASSKEY_COLLECTION)
      .doc(hash);
    const passkeySnapshot = await passkeyRef.get();

    if (!passkeySnapshot.exists) {
      return errorResponse("Invalid passkey.", 401);
    }

    const passkeyData = passkeySnapshot.data();
    const uid = String(passkeyData?.uid || "");

    if (!uid || passkeyData?.active === false) {
      return errorResponse("This passkey is disabled.", 403);
    }

    const userSnapshot = await adminDb.collection("users").doc(uid).get();
    const userData = userSnapshot.data();

    if (!userSnapshot.exists || userData?.role !== "patient_attender") {
      return errorResponse("Patient Attender account not found.", 401);
    }

    if (userData?.active === false) {
      return errorResponse("This Patient Attender account is disabled.", 403);
    }

    await passkeyRef.update({ lastUsedAt: new Date() });

    const customToken = await adminAuth.createCustomToken(uid, {
      role: "patient_attender",
    });

    return NextResponse.json({
      success: true,
      customToken,
      user: {
        uid,
        name: userData?.name || "Patient Attender",
        role: "patient_attender",
      },
    });
  } catch (error: any) {
    console.error("POST /api/patient-attender/login:", error);
    return errorResponse(error?.message || "Unable to sign in with passkey.", 500);
  }
}
