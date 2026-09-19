"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";

type AuditLog = {
  id: string;
  action?: string;
  module?: string;
  recordId?: string;
  description?: string;
  userName?: string;
  role?: string;
  createdAt?: { toDate?: () => Date } | string | null;
};

function formatDate(value: AuditLog["createdAt"]) {
  if (!value) return "—";
  if (typeof value === "string") return new Date(value).toLocaleString("en-IN");
  if (typeof value === "object" && value.toDate) return value.toDate().toLocaleString("en-IN");
  return "—";
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const snapshot = await getDocs(
          query(collection(db, "auditLogs"), orderBy("createdAt", "desc"), limit(500))
        );
        setLogs(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as AuditLog)));
      } catch (err) {
        console.error("Failed to load audit logs:", err);
        setError("Unable to load audit logs. Check your account permissions and Firestore rules.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Audit Log</h1>
          <p className="mt-1 text-sm text-slate-500">Administrative record of important actions in the system.</p>
        </div>
        {loading && <div className="rounded-2xl bg-white p-6 shadow-sm">Loading audit logs…</div>}
        {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        {!loading && !error && (
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Time</th>
                    <th className="px-5 py-3">Action</th>
                    <th className="px-5 py-3">Module</th>
                    <th className="px-5 py-3">User</th>
                    <th className="px-5 py-3">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b last:border-0">
                      <td className="whitespace-nowrap px-5 py-4 text-slate-500">{formatDate(log.createdAt)}</td>
                      <td className="px-5 py-4 font-semibold">{log.action ?? "—"}</td>
                      <td className="px-5 py-4">{log.module ?? "—"}</td>
                      <td className="px-5 py-4">{log.userName ?? "—"}</td>
                      <td className="px-5 py-4">{log.description ?? "—"}</td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-500">No audit events recorded yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
