"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

type Row = Record<string, unknown> & { id: string };

const reportCards = [
  { key: "patients", title: "Patient Report", description: "Registration, admission, discharge and diagnosis records.", icon: "👥" },
  { key: "vitals", title: "Vitals Report", description: "Patient vitals history and clinical observations.", icon: "❤️" },
  { key: "attendance", title: "Attendance Report", description: "Staff attendance, status and check-in/out records.", icon: "🕐" },
  { key: "payments", title: "Payments Report", description: "Bills, collections and outstanding balances.", icon: "💳" },
];

export default function ReportsPage() {
  const [data, setData] = useState<Record<string, Row[]>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState("patients");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const collections = ["patients", "vitals", "attendance", "payments"];
        const snapshots = await Promise.all(collections.map((name) => getDocs(collection(db, name))));
        if (!active) return;
        const next: Record<string, Row[]> = {};
        collections.forEach((name, index) => {
          next[name] = snapshots[index].docs.map((item) => ({ id: item.id, ...item.data() } as Row));
        });
        setData(next);
      } catch (e) {
        console.error(e);
        if (active) setError("Unable to load reports. Check Firebase permissions.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  const rows = useMemo(() => {
    const source = data[selected] || [];
    const q = search.trim().toLowerCase();
    if (!q) return source;
    return source.filter((row) => JSON.stringify(row).toLowerCase().includes(q));
  }, [data, selected, search]);

  function exportCsv() {
    const source = rows;
    if (!source.length) return;
    const keys = Array.from(new Set(source.flatMap((row) => Object.keys(row)))).filter((key) => key !== "id");
    const escape = (value: unknown) => '"' + String(value ?? "").replaceAll('"', '""') + '"';
    const csv = [keys.join(","), ...source.map((row) => keys.map((key) => escape(row[key])).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = selected + "-report.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const counts = Object.fromEntries(reportCards.map((card) => [card.key, data[card.key]?.length || 0]));

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-7xl p-6 sm:p-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-600">Analytics & Reports</p>
            <h1 className="text-3xl font-bold">Reports Centre</h1>
            <p className="mt-1 text-sm text-slate-500">Live reports generated from Firestore records.</p>
          </div>
          <Link href="/" className="rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">← Dashboard</Link>
        </div>

        {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        {loading && <div className="mb-5 rounded-xl bg-blue-50 p-4 text-sm text-blue-700">Loading live reports…</div>}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {reportCards.map((card) => (
            <button key={card.key} type="button" onClick={() => setSelected(card.key)} className={`rounded-2xl bg-white p-5 text-left shadow-sm transition hover:shadow-md ${selected === card.key ? "ring-2 ring-blue-500" : ""}`}>
              <div className="flex items-center justify-between"><span className="text-2xl">{card.icon}</span><span className="text-2xl font-bold">{counts[card.key]}</span></div>
              <h2 className="mt-3 font-bold">{card.title}</h2>
              <p className="mt-1 text-sm text-slate-500">{card.description}</p>
            </button>
          ))}
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="font-bold">{reportCards.find((card) => card.key === selected)?.title}</h2><p className="text-sm text-slate-500">{rows.length} matching records</p></div>
            <div className="flex gap-2">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search report…" className="rounded-xl border px-4 py-2.5 outline-none focus:border-blue-500" />
              <button type="button" onClick={exportCsv} className="rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white">Export CSV</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">ID</th><th className="px-5 py-3">Name / Record</th><th className="px-5 py-3">Date</th><th className="px-5 py-3">Details</th></tr></thead>
              <tbody>
                {rows.slice(0, 200).map((row) => {
                  const name = String(row.name ?? row.patientName ?? row.staffName ?? row.billNo ?? row.service ?? row.id);
                  const date = String(row.date ?? row.admissionDate ?? row.createdAt ?? "—");
                  const details = Object.entries(row).filter(([key]) => !["id","name","patientName","staffName","billNo","service","date","admissionDate","createdAt"].includes(key)).slice(0, 4).map(([key,value]) => `${key}: ${String(value ?? "—")}`).join(" • ");
                  return <tr key={row.id} className="border-t"><td className="px-5 py-3 font-mono text-xs">{row.id}</td><td className="px-5 py-3 font-semibold">{name}</td><td className="px-5 py-3">{date}</td><td className="px-5 py-3 text-slate-500">{details || "—"}</td></tr>;
                })}
              </tbody>
            </table>
          </div>
          {!rows.length && <div className="p-12 text-center text-sm text-slate-500">No records found.</div>}
          {rows.length > 200 && <p className="border-t p-4 text-center text-xs text-slate-500">Showing first 200 records. Use search or CSV export for the complete filtered dataset.</p>}
        </section>

        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="font-bold">Patient Files & Diagnostics</h2>
          <p className="mt-1 text-sm text-slate-500">Manage uploaded diagnostic reports, scans, prescriptions and supporting files.</p>
          <Link href="/reports/patient-files" className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">Open Patient Files</Link>
        </section>
      </div>
    </main>
  );
}
