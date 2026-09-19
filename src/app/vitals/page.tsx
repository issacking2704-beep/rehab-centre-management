"use client";

import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";

type Patient = { id: string; name?: string; isDeleted?: boolean };
type Vital = {
  id: string;
  patientId: string;
  patientName: string;
  date: string;
  time: string;
  bloodPressure: string;
  pulse: string;
  temperature: string;
  spo2: string;
  respiratoryRate: string;
  weight: string;
  notes: string;
  createdAt?: string;
  updatedAt?: string;
};

const emptyForm = {
  patientId: "",
  date: new Date().toISOString().slice(0, 10),
  time: new Date().toTimeString().slice(0, 5),
  bloodPressure: "",
  pulse: "",
  temperature: "",
  spo2: "",
  respiratoryRate: "",
  weight: "",
  notes: "",
};

export default function VitalsPage() {
  const [user, setUser] = useState<unknown>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [records, setRecords] = useState<Vital[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [selected, setSelected] = useState<Vital | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => onAuthStateChanged(auth, (currentUser) => {
    setUser(currentUser);
    if (!currentUser) window.location.replace("/login");
  }), []);

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user]);

  async function load() {
    try {
      setLoading(true);
      setError("");
      const [patientSnapshot, vitalSnapshot] = await Promise.all([
        getDocs(collection(db, "patients")),
        getDocs(collection(db, "vitals")),
      ]);
      setPatients(patientSnapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Patient)).filter((p) => p.isDeleted !== true));
      setRecords(vitalSnapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Vital)).sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`)));
    } catch (e) {
      console.error(e);
      setError("Unable to load vitals. Check Firebase permissions.");
    } finally {
      setLoading(false);
    }
  }

  function openAddForm() {
    setEditingId("");
    setSelected(null);
    setForm({ ...emptyForm, date: selectedDate || emptyForm.date });
    setShowForm(true);
    setError("");
  }

  function openEditForm(record: Vital) {
    setEditingId(record.id);
    setSelected(null);
    setForm({
      patientId: record.patientId,
      date: record.date,
      time: record.time,
      bloodPressure: record.bloodPressure || "",
      pulse: record.pulse || "",
      temperature: record.temperature || "",
      spo2: record.spo2 || "",
      respiratoryRate: record.respiratoryRate || "",
      weight: record.weight || "",
      notes: record.notes || "",
    });
    setShowForm(true);
  }

  async function saveVitals() {
    const patient = patients.find((item) => item.id === form.patientId);
    if (!patient) return setError("Please select a patient.");
    setSaving(true);
    setError("");
    try {
      const payload = {
        patientId: patient.id,
        patientName: patient.name || "Unnamed Patient",
        date: form.date,
        time: form.time,
        bloodPressure: form.bloodPressure.trim(),
        pulse: form.pulse.trim(),
        temperature: form.temperature.trim(),
        spo2: form.spo2.trim(),
        respiratoryRate: form.respiratoryRate.trim(),
        weight: form.weight.trim(),
        notes: form.notes.trim(),
        updatedAt: new Date().toISOString(),
      };
      if (editingId) {
        await updateDoc(doc(db, "vitals", editingId), payload);
        setRecords((items) => items.map((item) => item.id === editingId ? { ...item, ...payload } : item));
      } else {
        const createdAt = new Date().toISOString();
        const created = await addDoc(collection(db, "vitals"), { ...payload, createdAt });
        setRecords((items) => [{ ...payload, createdAt, id: created.id } as Vital, ...items]);
      }
      setShowForm(false);
      setEditingId("");
    } catch (e) {
      console.error(e);
      setError("Unable to save vitals. Check Firebase permissions.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteVitals(record: Vital) {
    if (!window.confirm(`Delete vitals for ${record.patientName} on ${formatDate(record.date)}?`)) return;
    try {
      await deleteDoc(doc(db, "vitals", record.id));
      setRecords((items) => items.filter((item) => item.id !== record.id));
      setSelected(null);
    } catch (e) {
      console.error(e);
      setError("Unable to delete the vitals record.");
    }
  }

  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((record) =>
      (!selectedDate || record.date === selectedDate) &&
      (!q || `${record.patientName} ${record.patientId} ${record.notes}`.toLowerCase().includes(q))
    );
  }, [records, selectedDate, search]);

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-500">Loading vitals…</main>;
  if (!user) return null;

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b bg-white px-6 py-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-sm font-semibold text-blue-600">Clinical Records</p><h1 className="text-2xl font-bold">Patient Vitals</h1><p className="text-sm text-slate-500">Record and review patient vital signs.</p></div>
          <div className="flex gap-2"><a href="/" className="rounded-xl border px-4 py-2.5 text-sm font-semibold">← Dashboard</a><button onClick={openAddForm} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">＋ Add Vitals</button></div>
        </div>
      </header>
      <div className="space-y-5 p-6">
        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        <section className="grid gap-4 sm:grid-cols-3">
          <Stat title="Total Records" value={records.length} />
          <Stat title="Today's Records" value={records.filter((r) => r.date === new Date().toISOString().slice(0, 10)).length} />
          <Stat title="Patients" value={patients.length} />
        </section>
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-[1fr_220px]"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search patient or notes…" className="rounded-xl border p-3 outline-none focus:border-blue-500" /><input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="rounded-xl border p-3" /></div>
        </section>
        {showForm && <section className="rounded-2xl bg-white p-6 shadow-sm"><h2 className="text-lg font-bold">{editingId ? "Edit Vitals" : "Record Vitals"}</h2><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><label className="text-sm font-semibold">Patient<select value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })} className="mt-2 w-full rounded-xl border p-3"><option value="">Select patient</option>{patients.map((p) => <option key={p.id} value={p.id}>{p.name || "Unnamed"} — {p.id}</option>)}</select></label><Field label="Date" value={form.date} onChange={(v) => setForm({ ...form, date: v })} type="date" /><Field label="Time" value={form.time} onChange={(v) => setForm({ ...form, time: v })} type="time" /><Field label="Blood Pressure" value={form.bloodPressure} onChange={(v) => setForm({ ...form, bloodPressure: v })} placeholder="120/80 mmHg" /><Field label="Pulse" value={form.pulse} onChange={(v) => setForm({ ...form, pulse: v })} placeholder="72 bpm" /><Field label="Temperature" value={form.temperature} onChange={(v) => setForm({ ...form, temperature: v })} placeholder="98.6 °F" /><Field label="SpO₂" value={form.spo2} onChange={(v) => setForm({ ...form, spo2: v })} placeholder="98 %" /><Field label="Respiratory Rate" value={form.respiratoryRate} onChange={(v) => setForm({ ...form, respiratoryRate: v })} placeholder="16 /min" /><Field label="Weight" value={form.weight} onChange={(v) => setForm({ ...form, weight: v })} placeholder="65 kg" /><label className="text-sm font-semibold sm:col-span-2 lg:col-span-3">Clinical Notes<textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={4} className="mt-2 w-full rounded-xl border p-3" /></label></div><div className="mt-5 flex justify-end gap-2"><button onClick={() => setShowForm(false)} className="rounded-xl border px-5 py-2.5 font-semibold">Cancel</button><button disabled={saving} onClick={saveVitals} className="rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white">{saving ? "Saving…" : "Save Vitals"}</button></div></section>}
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm"><div className="border-b p-5"><h2 className="font-bold">Vitals History</h2><p className="text-sm text-slate-500">{filteredRecords.length} record{filteredRecords.length === 1 ? "" : "s"}</p></div><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Patient</th><th className="px-5 py-3">Date/Time</th><th className="px-5 py-3">BP</th><th className="px-5 py-3">Pulse</th><th className="px-5 py-3">Temp</th><th className="px-5 py-3">SpO₂</th><th className="px-5 py-3">Actions</th></tr></thead><tbody>{filteredRecords.map((record) => <tr key={record.id} className="border-t"><td className="px-5 py-3"><button onClick={() => setSelected(record)} className="text-left font-semibold hover:text-blue-600">{record.patientName}<span className="block text-xs font-normal text-slate-500">{record.patientId}</span></button></td><td className="px-5 py-3">{formatDate(record.date)}<span className="block text-xs text-slate-500">{record.time}</span></td><td className="px-5 py-3">{record.bloodPressure || "—"}</td><td className="px-5 py-3">{record.pulse || "—"}</td><td className="px-5 py-3">{record.temperature || "—"}</td><td className="px-5 py-3">{record.spo2 || "—"}</td><td className="px-5 py-3"><button onClick={() => openEditForm(record)} className="mr-2 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">Edit</button><button onClick={() => deleteVitals(record)} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">Delete</button></td></tr>)}</tbody></table></div>{filteredRecords.length === 0 && <div className="p-12 text-center text-sm text-slate-500">No vitals records found.</div>}</section>
      </div>
      {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white p-6"><div className="flex justify-between"><div><p className="text-xs font-bold uppercase text-blue-600">Vitals Record</p><h2 className="text-xl font-bold">{selected.patientName}</h2></div><button onClick={() => setSelected(null)} className="text-xl">×</button></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><Info label="Date" value={formatDate(selected.date)} /><Info label="Time" value={selected.time || "—"} /><Info label="Blood Pressure" value={selected.bloodPressure || "—"} /><Info label="Pulse" value={selected.pulse || "—"} /><Info label="Temperature" value={selected.temperature || "—"} /><Info label="SpO₂" value={selected.spo2 || "—"} /><Info label="Respiratory Rate" value={selected.respiratoryRate || "—"} /><Info label="Weight" value={selected.weight || "—"} /></div><div className="mt-4 rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-slate-500">Notes</p><p className="mt-1 whitespace-pre-wrap text-sm">{selected.notes || "No notes"}</p></div><div className="mt-5 flex justify-end gap-2"><button onClick={() => openEditForm(selected)} className="rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white">Edit</button><button onClick={() => deleteVitals(selected)} className="rounded-xl bg-red-50 px-5 py-2.5 font-semibold text-red-700">Delete</button></div></div></div>}
    </main>
  );
}

function Field({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return <label className="text-sm font-semibold">{label}<input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="mt-2 w-full rounded-xl border p-3 outline-none focus:border-blue-500" /></label>;
}
function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>;
}
function Stat({ title, value }: { title: string; value: number }) {
  return <div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{title}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>;
}
function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
