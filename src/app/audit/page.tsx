"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, limit, orderBy, query, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { recordAudit } from "@/lib/audit";

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

function escapeCsv(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const snapshot = await getDocs(
          query(collection(db, "auditLogs"), orderBy("createdAt", "desc"), limit(500))
        );
        if (!active) return;
        setLogs(snapshot.docs.map((item) => {
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
        }));
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

  const modules = useMemo(
    () => ["all", ...Array.from(new Set(logs.map((log) => log.module).filter(Boolean) as string[])).sort()],
    [logs]
  );
  const actions = useMemo(
    () => ["all", ...Array.from(new Set(logs.map((log) => log.action).filter(Boolean) as string[])).sort()],
    [logs]
  );

  const filteredLogs = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return logs.filter((log) => {
      const searchable = [log.action, log.module, log.userName, log.role, log.recordId, log.description]
        .filter(Boolean).join(" ").toLowerCase();
      return (!needle || searchable.includes(needle))
        && (moduleFilter === "all" || log.module === moduleFilter)
        && (actionFilter === "all" || log.action === actionFilter);
    });
  }, [logs, search, moduleFilter, actionFilter]);

  function exportCsv() {
    const rows = [
      ["Time", "Action", "Module", "User", "Role", "Record ID", "Description"],
      ...filteredLogs.map((log) => [
        formatDate(log.createdAt), log.action ?? "", log.module ?? "", log.userName ?? "",
        log.role ?? "", log.recordId ?? "", log.description ?? "",
      ]),
    ];
    const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    void recordAudit({
      action: "export",
      module: "audit",
      description: `Exported ${filteredLogs.length} audit log records to CSV.`,
      metadata: { count: filteredLogs.length },
    });
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <a href="/" className="text-sm font-semibold text-blue-600">← Dashboard</a>
            <h1 className="mt-2 text-2xl font-bold">Audit Log</h1>
            <p className="mt-1 text-sm text-slate-500">Administrative record of important actions in the system.</p>
          </div>
          <button onClick={exportCsv} disabled={!filteredLogs.length} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
            Export CSV
          </button>
        </div>

        <div className="mb-5 grid gap-3 rounded-2xl bg-white p-4 shadow-sm md:grid-cols-3">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search user, action, module, record…" className="rounded-lg border px-3 py-2 text-sm" />
          <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} className="rounded-lg border px-3 py-2 text-sm">
            {modules.map((item) => <option key={item} value={item}>{item === "all" ? "All modules" : item}</option>)}
          </select>
          <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="rounded-lg border px-3 py-2 text-sm">
            {actions.map((item) => <option key={item} value={item}>{item === "all" ? "All actions" : item}</option>)}
          </select>
        </div>

        {loading && <div className="rounded-2xl bg-white p-6 shadow-sm">Loading audit logs…</div>}
        {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        {!loading && !error && (
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="flex items-center justify-between border-b bg-slate-50 px-5 py-3 text-xs text-slate-500">
              <span>Showing {filteredLogs.length} of {logs.length} loaded records</span>
              <span>Newest first · maximum 500 loaded</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Time</th><th className="px-5 py-3">Action</th><th className="px-5 py-3">Module</th>
                    <th className="px-5 py-3">User</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="border-b last:border-0">
                      <td className="whitespace-nowrap px-5 py-4 text-slate-500">{formatDate(log.createdAt)}</td>
                      <td className="px-5 py-4 font-semibold">{log.action ?? "—"}</td>
                      <td className="px-5 py-4">{log.module ?? "—"}</td>
                      <td className="px-5 py-4">{log.userName ?? "—"}</td>
                      <td className="px-5 py-4">{log.role ?? "—"}</td>
                      <td className="px-5 py-4">{log.description ?? "—"}</td>
                    </tr>
                  ))}
                  {filteredLogs.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-500">No matching audit events.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
