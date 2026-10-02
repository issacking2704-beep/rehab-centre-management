import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { recordServerAudit } from "@/lib/audit-server";

export async function POST(request: NextRequest) {
  try {
    const header = request.headers.get("authorization") || "";
    if (!header.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const token = header.slice("Bearer ".length);
    const decoded = await getAdminAuth().verifyIdToken(token);
    const profile = (await getAdminDb().collection("users").doc(decoded.uid).get()).data();
    const role = profile?.role;

    if (!["super_admin", "admin"].includes(role)) {
      return NextResponse.json({ error: "You do not have permission to change branding settings." }, { status: 403 });
    }

    const body = await request.json();
    const settings = body?.settings;
    if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
      return NextResponse.json({ error: "Invalid branding settings." }, { status: 400 });
    }

    await getAdminDb().collection("settings").doc("branding").set(settings, { merge: true });
    await recordServerAudit({ action: "update", module: "settings", recordId: "branding", description: "Updated centre branding and appearance settings.", userId: decoded.uid, userName: typeof profile?.name === "string" ? profile.name : undefined, role });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Branding settings API error", error);
    return NextResponse.json({ error: "Unable to save branding settings." }, { status: 500 });
  }
}
