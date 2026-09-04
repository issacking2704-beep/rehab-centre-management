"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

type Role = "admin" | "sub_admin" | "patient_attender" | "super_admin";
type Staff = { uid: string; name: string; email: string; role: Role | string; phone: string; active: boolean; assignedPatientIds?: string[]; passkeyLast4?: string; passkeyCreatedAt?: string };
type Patient = { id: string; name: string; room?: string; diagnosis?: string };

export default function StaffPage() {
  const [user, setUser] = useState<User | null>(null);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showPasskey, setShowPasskey] = useState("");
  const [assigning, setAssigning] = useState<Staff | null>(null);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Role>("patient_attender");
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);

  useEffect(() => onAuthStateChanged(auth, (currentUser) => {
    setUser(currentUser);
    if (!currentUser) window.location.replace("/login");
  }), []);

  useEffect(() => { if (user) load(); }, [user]);

  async function authFetch(url: string, options: RequestInit = {}) {
    if (!user) throw new Error("You must be logged in.");
    const token = await user.getIdToken(true);
    const response = await fetch(url, { ...options, headers: { ...(options.headers || {}), Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Request failed.");
    return data;
  }

  async function load() {
    try {
      setLoading(true); setError("");
      const [staffData, attenderData] = await Promise.all([authFetch("/api/staff"), authFetch("/api/patient-attenders")]);
      setStaff(Array.isArray(staffData.staff) ? staffData.staff : []);
      setPatients(Array.isArray(attenderData.patients) ? attenderData.patients : []);
    } catch (err: any) { setError(err?.message || "Failed to load staff."); } finally { setLoading(false); }
  }

  async function addStaff(event: FormEvent) {
    event.preventDefault();
    try {
      setSaving(true); setError(""); setMessage(""); setShowPasskey("");
      const data = await authFetch("/api/staff", { method: "POST", body: JSON.stringify({ name, email, password, phone, role, assignedPatientIds: role === "patient_attender" ? selectedPatients : [] }) });
      setMessage(data.message || "Staff account created.");
      if (data.passkey) setShowPasskey(data.passkey);
      setName(""); setEmail(""); setPassword(""); setPhone(""); setSelectedPatients([]); setRole("patient_attender"); setShowAdd(false);
      await load();
    } catch (err: any) { setError(err?.message || "Failed to create staff account."); } finally { setSaving(false); }
  }

  async function toggle(person: Staff) {
    try { setError(""); setMessage(""); const data = await authFetch("/api/staff", { method: "PATCH", body: JSON.stringify({ uid: person.uid, active: !person.active }) }); setMessage(data.message); await load(); }
    catch (err: any) { setError(err?.message || "Failed to update account."); }
  }

  async function remove(person: Staff) {
    if (!window.confirm(`Delete ${person.name}? This cannot be undone.`)) return;
    try { setError(""); setMessage(""); const data = await authFetch("/api/staff", { method: "DELETE", body: JSON.stringify({ uid: person.uid }) }); setMessage(data.message); await load(); }
    catch (err: any) { setError(err?.message || "Failed to delete account."); }
  }

  function openAssign(person: Staff) { setAssigning(person); setSelectedPatients(person.assignedPatientIds || []); setError(""); }

  async function saveAssignments() {
    if (!assigning) return;
    try { setSaving(true); setError(""); const data = await authFetch("/api/patient-attenders", { method: "PATCH", body: JSON.stringify({ uid: assigning.uid, assignedPatientIds: selectedPatients }) }); setMessage(data.message); setAssigning(null); await load(); }
    catch (err: any) { setError(err?.message || "Failed to update assignments."); } finally { setSaving(false); }
  }

  async function regenerate(person: Staff) {
    if (!window.confirm(`Generate a new passkey for ${person.name}? The old passkey will stop working.`)) return;
    try { setError(""); setMessage(""); const data = await authFetch("/api/patient-attenders", { method: "POST", body: JSON.stringify({ uid: person.uid }) }); setShowPasskey(data.passkey || ""); setMessage(data.message); await load(); }
    catch (err: any) { setError(err?.message || "Failed to regenerate passkey."); }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staff.filter((person) => !q || `${person.name} ${person.email} ${person.phone}`.toLowerCase().includes(q));
  }, [staff, search]);

  if (!user || loading) return <main className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-500">Loading staff management…</main>;

  return <main className="min-h-screen bg-slate-100 text-slate-900">
    <header className="border-b bg-white shadow-sm"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-5"><div><p className="text-sm font-semibold text-blue-600">Administration</p><h1 className="text-2xl font-bold">Doctors & Staff</h1><p className="text-sm text-slate-500">Manage accounts, Patient Attender passkeys and patient assignments.</p></div><button onClick={() => { setShowAdd(true); setError(""); setMessage(""); setShowPasskey(""); }} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700">＋ Add Staff</button></div></header>
    <div className="mx-auto max-w-7xl space-y-5 p-6">
      {message && <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">✅ {message}</div>}
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">⚠️ {error}</div>}
      {showPasskey && <section className="rounded-2xl border border-blue-200 bg-blue-50 p-6"><p className="text-sm font-semibold text-blue-800">🔐 Patient Attender passkey</p><p className="mt-1 text-xs text-blue-700">Show/copy this once and give it securely to the Patient Attender. The full passkey is not stored in the UI.</p><div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center"><code className="rounded-xl bg-white px-5 py-4 text-lg font-bold tracking-widest text-slate-900 shadow-sm">{showPasskey}</code><button onClick={() => navigator.clipboard?.writeText(showPasskey)} className="rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-semibold text-blue-700">Copy</button><button onClick={() => setShowPasskey("")} className="rounded-xl border px-4 py-3 text-sm font-semibold">Close</button></div></section>}
      <section className="rounded-2xl bg-white p-5 shadow-sm"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search staff…" className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-blue-500" /></section>
      <section className="overflow-hidden rounded-2xl bg-white shadow-sm"><div className="border-b p-5"><h2 className="font-bold">Staff Accounts</h2><p className="mt-1 text-sm text-slate-500">{filtered.length} account{filtered.length === 1 ? "" : "s"}</p></div><div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-4">Staff</th><th className="px-5 py-4">Role</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Patient Attender Access</th><th className="px-5 py-4">Actions</th></tr></thead><tbody>{filtered.map((person) => <tr key={person.uid} className="border-t"><td className="px-5 py-4"><p className="font-bold">{person.name}</p><p className="text-xs text-slate-500">{person.email || "No email"} {person.phone ? `• ${person.phone}` : ""}</p></td><td className="px-5 py-4"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{person.role.replaceAll("_", " ")}</span></td><td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${person.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{person.active ? "Active" : "Disabled"}</span></td><td className="px-5 py-4">{person.role === "patient_attender" ? <div><p className="font-semibold">{person.assignedPatientIds?.length || 0} assigned</p><p className="text-xs text-slate-500">Passkey ••••{person.passkeyLast4 || "----"}</p><div className="mt-2 flex gap-2"><button onClick={() => openAssign(person)} className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">Assign Patients</button><button onClick={() => regenerate(person)} className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">New Passkey</button></div></div> : <span className="text-slate-400">—</span>}</td><td className="px-5 py-4"><div className="flex gap-2"><button onClick={() => toggle(person)} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold">{person.active ? "Disable" : "Enable"}</button>{person.role !== "super_admin" && <button onClick={() => remove(person)} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">Delete</button>}</div></td></tr>)}</tbody></table></div></section>
    </div>

    {showAdd && <Modal title="Add Staff" onClose={() => setShowAdd(false)}><form onSubmit={addStaff} className="space-y-4"><Field label="Full name" value={name} onChange={setName} required /><Field label="Phone" value={phone} onChange={setPhone} type="tel" /><label className="block text-sm font-semibold">Role<select value={role} onChange={(e) => setRole(e.target.value as Role)} className="mt-2 w-full rounded-xl border p-3"><option value="patient_attender">Patient Attender</option><option value="sub_admin">Sub Admin</option><option value="admin">Admin</option></select></label>{role === "patient_attender" ? <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">A secure passkey will be generated automatically. Email and password are optional for Patient Attender accounts.</div> : <><Field label="Email" value={email} onChange={setEmail} type="email" required /><Field label="Password" value={password} onChange={setPassword} type="password" required /></>}{role === "patient_attender" && <div><label className="block text-sm font-semibold">Initial patient assignments</label><div className="mt-2 max-h-48 space-y-2 overflow-auto rounded-xl border p-3">{patients.length ? patients.map((patient) => <label key={patient.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-slate-50"><input type="checkbox" checked={selectedPatients.includes(patient.id)} onChange={(e) => setSelectedPatients((current) => e.target.checked ? [...current, patient.id] : current.filter((id) => id !== patient.id))} /><span><span className="font-semibold">{patient.name}</span><span className="ml-2 text-xs text-slate-500">{patient.id}{patient.room ? ` • Room ${patient.room}` : ""}</span></span></label>) : <p className="text-sm text-slate-500">No active patients available.</p>}</div></div>}<div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setShowAdd(false)} className="rounded-xl border px-5 py-2.5 font-semibold">Cancel</button><button disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white disabled:opacity-50">{saving ? "Creating…" : "Create Account"}</button></div></form></Modal>}

    {assigning && <Modal title={`Assign Patients — ${assigning.name}`} onClose={() => setAssigning(null)}><p className="text-sm text-slate-500">Only the selected patients will be visible after this attender signs in with their passkey.</p><div className="mt-4 max-h-72 space-y-2 overflow-auto rounded-xl border p-3">{patients.map((patient) => <label key={patient.id} className="flex items-center gap-3 rounded-lg p-3 hover:bg-slate-50"><input type="checkbox" checked={selectedPatients.includes(patient.id)} onChange={(e) => setSelectedPatients((current) => e.target.checked ? [...current, patient.id] : current.filter((id) => id !== patient.id))} /><span><span className="font-semibold">{patient.name}</span><span className="ml-2 text-xs text-slate-500">{patient.id}{patient.room ? ` • Room ${patient.room}` : ""}</span></span></label>)}</div><div className="mt-5 flex justify-end gap-2"><button onClick={() => setAssigning(null)} className="rounded-xl border px-5 py-2.5 font-semibold">Cancel</button><button disabled={saving} onClick={saveAssignments} className="rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white">{saving ? "Saving…" : "Save Assignments"}</button></div></Modal>}
  </main>;
}

function Field({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) { return <label className="block text-sm font-semibold">{label}<input required={required} type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-2 w-full rounded-xl border p-3 outline-none focus:border-blue-500" /></label>; }
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) { return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><h2 className="text-xl font-bold">{title}</h2><button onClick={onClose} className="rounded-lg px-3 py-2 text-xl hover:bg-slate-100">✕</button></div><div className="mt-5">{children}</div></div></div>; }
