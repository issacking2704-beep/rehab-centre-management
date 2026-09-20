import { addDoc, collection, doc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "login"
  | "logout"
  | "upload"
  | "download"
  | "export"
  | "restore";

export type AuditInput = {
  action: AuditAction;
  module: string;
  recordId?: string;
  description: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export async function recordAudit(input: AuditInput) {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const userSnapshot = await getDoc(doc(db, "users", currentUser.uid));
    const role = typeof userSnapshot.data()?.role === "string" ? userSnapshot.data()?.role : "";

    await addDoc(collection(db, "auditLogs"), {
      action: input.action,
      module: input.module,
      recordId: input.recordId ?? null,
      description: input.description,
      metadata: input.metadata ?? {},
      userId: currentUser.uid,
      userName: currentUser.displayName ?? currentUser.email ?? "User",
      role,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    // Audit logging must never break the business operation that triggered it.
    console.error("Audit log failed:", error);
  }
}
