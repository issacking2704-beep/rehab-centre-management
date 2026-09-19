import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "login"
  | "upload"
  | "download"
  | "restore";

type AuditInput = {
  action: AuditAction;
  module: string;
  recordId?: string;
  description: string;
  userId?: string;
  userName?: string;
  role?: string;
};

export async function recordAudit(input: AuditInput) {
  try {
    const currentUser = auth.currentUser;
    await addDoc(collection(db, "auditLogs"), {
      ...input,
      userId: input.userId ?? currentUser?.uid ?? null,
      userName: input.userName ?? currentUser?.displayName ?? currentUser?.email ?? "User",
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Audit log failed:", error);
  }
}
