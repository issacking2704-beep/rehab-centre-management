"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { hasPermission, UserRole } from "@/lib/permissions";

type Patient = { id: string; name?: string; phone?: string; room?: string; diagnosis?: string; isDeleted?: boolean };
type Staff = { uid: string; name: string; role: string; active: boolean; assignedPatientIds?: string[] };
type Bill = {
  id: string; billNo: string; patientId: string; patientName: string;
  service: string; amount: number; paid: number; balance: number;
  paymentMethod: string; date: string; status: "Paid" | "Partial" | "Pending";
  assignedStaffIds?: string[]; assignedStaffNames?: string[]; createdBy?: string; createdByName?: string;
};

const money = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);

export default function BillsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [assignedOnly, setAssignedOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [patientId, setPatientId] = useState("");
  const [service, setService] = useState("");
  const [amount, setAmount] = useState("");
  const [paid, setPaid] = useState("");
  const [method, setMethod] = useState("UPI");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const canManage = role ? hasPermission(role, "billing") : false;

  useEffect(() => onAuthStateChanged(auth, async (u) => {
    setUser(u);
    if (!u) { window.location.replace("/login"); return; }
    try {
      const snap = await getDoc(doc(db, "users", u.uid));
      const r = snap.data()?.role as UserRole | undefined;
      if (!r) { window.location.replace("/login"); return; }
      setRole(r);
    } catch { setError("Unable to verify your account role."); }
  }), []);

  useEffect(() => {
    if (!user || !role) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [p, b] = await Promise.all([
          getDocs(collection(db, "patients")),
          getDocs(query(collection(db, "payments"), orderBy("createdAt", "desc"))),
        ]);
        if (cancelled) return;
        setPatients(p.docs.map(d => ({ id: d.id, ...d.data() } as Patient)).filter(x => x.isDeleted !== true));
        setBills(b.docs.map(d => ({ id: d.id, ...d.data() } as Bill)));
        try {
          const token = await user.getIdToken(true);
          const res = await fetch("/api/staff", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.staff)) setStaff(data.staff as Staff[]);
          }
        } catch { /* staff assignment enrichment is optional */ }
      } catch (e) {
        console.error(e);
        setError("Unable to load bills. Check Firebase permissions.");
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [user, role]);

  const assignments = useMemo(() => {
    const map = new Map<string, Staff[]>();
    for (const person of staff) {
      for (const id of person.assignedPatientIds || []) {
        const current = map.get(id) || [];
        current.push(person);
        map.set(id, current);
      }
    }
    return map;
  }, [staff]);

  const visiblePatients = useMemo(() => {
    const q = search.trim().toLowerCase();
    return patients.filter(p => {
      const assigned = (assignments.get(p.id) || []).length > 0;
      if (assignedOnly && !assigned) return false;
      return !q || `${p.id} ${p.name || ""} ${p.phone || ""} ${p.room || ""} ${p.diagnosis || ""}`.toLowerCase().includes(q);
    });
  }, [patients, assignments, assignedOnly, search]);

  const selectedPatient = patients.find(p => p.id === patientId);
  const selectedStaff = patientId ? assignments.get(patientId) || [] : [];

  function resetForm() {
    setPatientId(""); setService(""); setAmount(""); setPaid(""); setMethod("UPI");
    setDate(new Date().toISOString().slice(0, 10)); setShowForm(false);
  }

  async function createBill() {
    if (!canManage || !selectedPatient || !service.trim()) { setError("Select a patient and enter a service/description."); return; }
    const total = Number(amount) || 0;
    const payment = Number(paid) || 0;
    if (total <= 0 || payment < 0 || payment > total) { setError("Enter a valid bill amount and payment."); return; }
    setSaving(true); setError(""); setMessage("");
    try {
      const nextNo = `BILL-${String(bills.length + 1).padStart(4, "0")}`;
      const balance = total - payment;
      const status = payment >= total ? "Paid" : payment > 0 ? "Partial" : "Pending";
      const record = {
        billNo: nextNo, patientId: selectedPatient.id, patientName: selectedPatient.name || "Unnamed patient",
        service: service.trim(), amount: total, paid: payment, balance, paymentMethod: method, date,
        status, assignedStaffIds: selectedStaff.map(s => s.uid), assignedStaffNames: selectedStaff.map(s => s.name),
        createdBy: user?.uid || "", createdByName: user?.displayName || user?.email || "Admin",
        createdAt: serverTimestamp(),
      };
      const ref = await addDoc(collection(db, "payments"), record);
      setBills(current => [{ id: ref.id, ...record, createdAt: undefined } as unknown as Bill, ...current]);
      setMessage(`${nextNo} generated for ${selectedPatient.name || "patient"}.`);
      resetForm();
    } catch (e) {
      console.error(e); setError("Could not generate the bill. Check your account permissions.");
    } finally { setSaving(false); }
  }

  async function removeBill(id: string) {
    if (!canManage || !window.confirm("Delete this bill?")) return;
    try { await deleteDoc(doc(db, "payments", id)); setBills(b => b.filter(x => x.id !== id)); }
    catch { setError("Unable to delete this bill."); }
  }

  if (!user || !role) return <main className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-500">Checking access…</main>;

  const total = bills.reduce((s, b) => s + Number(b.amount || 0), 0);
  const collected = bills.reduce((s, b) => s + Number(b.paid || 0), 0);

  return <main className="min-h-screen bg-slate-100 text-slate-900">
    <header className="border-b bg-white px-6 py-5 shadow-sm">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div><p className="text-sm font-semibold text-blue-600">Administration • Billing</p><h1 className="text-2xl font-bold">Patient Bills</h1><p className="text-sm text-slate-500">Generate and track bills for patients, including patients assigned to Patient Attenders.</p></div>
        <div className="flex gap-2"><a href="/payments" className="rounded-xl border px-4 py-3 text-sm font-semibold">Payments</a>{canManage && <button onClick={() => { setShowForm(true); setError(""); }} className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white">＋ Generate Bill</button>}</div>
      </div>
    </header>
    <div className="mx-auto max-w-7xl space-y-5 p-6">
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {message && <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">✓ {message}</div>}
      <div className="grid gap-4 md:grid-cols-4">
        <Stat title="Bills" value={String(bills.length)} /><Stat title="Billed" value={money(total)} /><Stat title="Collected" value={money(collected)} /><Stat title="Outstanding" value={money(Math.max(0, total-collected))} />
      </div>
      {showForm && canManage && <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-bold">Generate Patient Bill</h2><p className="text-sm text-slate-500">The bill records the assigned Patient Attender(s) at the time it is generated.</p></div><button onClick={resetForm} className="rounded-lg border px-3 py-2">✕</button></div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <label className="block text-sm font-semibold lg:col-span-2">Patient<select value={patientId} onChange={e => setPatientId(e.target.value)} className="mt-2 w-full rounded-xl border p-3"><option value="">Select patient…</option>{visiblePatients.map(p => <option key={p.id} value={p.id}>{p.name || "Unnamed"} — {p.id}{p.room ? ` • Room ${p.room}` : ""}</option>)}</select></label>
          <label className="flex items-center gap-3 rounded-xl border p-3 text-sm font-semibold"><input type="checkbox" checked={assignedOnly} onChange={e => setAssignedOnly(e.target.checked)} /> Assigned patients only</label>
          <Field label="Service / Description" value={service} onChange={setService} />
          <Field label="Bill Amount" value={amount} onChange={setAmount} type="number" />
          <Field label="Amount Paid" value={paid} onChange={setPaid} type="number" />
          <label className="block text-sm font-semibold">Payment Method<select value={method} onChange={e => setMethod(e.target.value)} className="mt-2 w-full rounded-xl border p-3"><option>Cash</option><option>UPI</option><option>Card</option><option>Bank Transfer</option><option>Other</option></select></label>
          <Field label="Bill Date" value={date} onChange={setDate} type="date" />
          <div className="rounded-xl bg-slate-50 p-4 text-sm"><p className="font-semibold">Assigned Patient Attenders</p>{selectedStaff.length ? selectedStaff.map(s => <p key={s.uid} className="mt-1 text-slate-700">{s.name}</p>) : <p className="mt-1 text-slate-400">No Patient Attender assignment found.</p>}</div>
        </div>
        <div className="mt-5 flex justify-end"><button disabled={saving} onClick={createBill} className="rounded-xl bg-green-600 px-6 py-3 font-semibold text-white disabled:opacity-50">{saving ? "Generating…" : "✓ Generate Bill"}</button></div>
      </section>}
      <section className="rounded-2xl bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b p-5 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="font-bold">Generated Bills</h2><p className="text-sm text-slate-500">Admin-generated billing records</p></div><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patient, bill or service…" className="rounded-xl border px-4 py-3 lg:w-96" /></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-4">Bill</th><th className="px-5 py-4">Patient</th><th className="px-5 py-4">Assigned To</th><th className="px-5 py-4">Service</th><th className="px-5 py-4 text-right">Amount</th><th className="px-5 py-4 text-right">Balance</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Action</th></tr></thead><tbody>{bills.filter(b => !search.trim() || `${b.billNo} ${b.patientName} ${b.service}`.toLowerCase().includes(search.toLowerCase())).map(b => <tr key={b.id} className="border-t"><td className="px-5 py-4 font-bold">{b.billNo}<p className="text-xs font-normal text-slate-400">{b.date}</p></td><td className="px-5 py-4"><p className="font-semibold">{b.patientName}</p><p className="text-xs text-slate-500">{b.patientId}</p></td><td className="px-5 py-4">{b.assignedStaffNames?.length ? b.assignedStaffNames.join(", ") : <span className="text-slate-400">Unassigned</span>}</td><td className="px-5 py-4">{b.service}</td><td className="px-5 py-4 text-right font-semibold">{money(b.amount)}</td><td className="px-5 py-4 text-right">{money(b.balance ?? Math.max(0, b.amount-b.paid))}</td><td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${b.status === "Paid" ? "bg-green-100 text-green-700" : b.status === "Partial" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{b.status}</span></td><td className="px-5 py-4"><button onClick={() => removeBill(b.id)} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">Delete</button></td></tr>)}</tbody></table></div>
      </section>
    </div>
  </main>;
}

function Field({ label, value, onChange, type="text" }: { label:string; value:string; onChange:(v:string)=>void; type?:string }) {
  return <label className="block text-sm font-semibold">{label}<input type={type} value={value} onChange={e=>onChange(e.target.value)} className="mt-2 w-full rounded-xl border p-3" /></label>;
}
function Stat({title,value}:{title:string;value:string}) { return <div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{title}</p><p className="mt-1 text-xl font-bold">{value}</p></div>; }
