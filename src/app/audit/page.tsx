"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, limit, orderBy, query, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

type AuditLog = {
  id: string;
  action?: string;
  module?: string;
  recordId?: string;
  description?: string;
  userName?: string;
  role?: string;
  createdAt?: Timestamp | null;
};

function formatDate(value?: Timestamp | null) {
  if (!value) return "Pending…";
  const date = value.toDate();
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-IN");
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const snapshot = await getDocs(
          query(collection(db, "auditLogs"), orderBy("createdAt", "desc"), limit(500))
        );
        if (!active) return;
        setLogs(
          snapshot.docs.map((item) => {
            const data = item.data();
            return {
              id: item.id,
              action: typeof data.action === "string" ? data.action : undefined,
              module: typeof data.module === "string" ? data.module : undefined,
              recordId: typeof data.recordId === "string" ? data.recordId : undefined,
              description: typeof data.description === "string" ? data.description : undefined,
              userName: typeof data.userName === "string" ? data.userName : undefined,
              role: typeof data.role === "string" ? data.role : undefined,
              createdAt: data.createdAt instanceof Timestamp ? data.createdAt : null,
            };
          })
        );
      } catch (loadError) {
        console.error("Failed to load audit logs:", loadError);
        if (active) setError("Unable to load audit logs. Check your account permissions and Firestore rules.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => { active = false; };
  }, []);

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <a href="/" className="text-sm font-semibold text-blue-600">← Dashboard</a>
          <h1 className="mt-2 text-2xl font-bold">Audit Log</h1>
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
