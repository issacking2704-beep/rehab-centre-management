import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";

export async function recordServerAudit(input: {
  action: string;
  module: string;
  recordId?: string;
  description: string;
  userId: string;
  userName?: string;
  role: string;
  metadata?: Record<string, string | number | boolean | null>;
}) {
  try {
    await adminDb.collection("auditLogs").add({
      action: input.action,
      module: input.module,
      recordId: input.recordId ?? null,
      description: input.description,
      userId: input.userId,
      userName: input.userName ?? input.userId,
      role: input.role,
      metadata: input.metadata ?? {},
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error("Server audit log failed:", error);
  }
}
