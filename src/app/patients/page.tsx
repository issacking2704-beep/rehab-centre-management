"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  onSnapshot,
  query,
  updateDoc,
  doc,
} from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";

import { auth, db } from "@/lib/firebase";
import { hasPermission, UserRole } from "@/lib/permissions";
import { makePatientId, Patient, PATIENTS_COLLECTION } from "@/lib/patient";

const emptyForm: Omit<Patient, "id" | "createdAt"> = {
  name: "",
  age: "",
  gender: "",
  phone: "",
  address: "",
  emergencyContact: "",
  admissionDate: "",
  dischargeDate: "",
  diagnosis: "",
  therapist: "",
  room: "",
  notes: "",
  isDeleted: false,
};

export default function PatientsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [selected, setSelected] = useState<Patient | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [view, setView] = useState<"active" | "discharged" | "all">("active");

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        window.location.replace("/login");
        return;
      }

      try {
        const { getDoc } = await import("firebase/firestore");
        const snapshot = await getDoc(doc(db, "users", firebaseUser.uid));
        const profile = snapshot.data();
        if (!profile?.role) {
          window.location.replace("/login");
          return;
        }
        setRole(profile.role as UserRole);
      } catch {
        setError("Unable to load your staff profile.");
      }
    });
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, PATIENTS_COLLECTION));
    return onSnapshot(
      q,
      (snapshot) => {
        const next = snapshot.docs
          .map((item) => ({ firestoreId: item.id, ...item.data() } as Patient))
           .filter((patient) => patient.isDeleted !== true)
          .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
        setPatients(next);
        setLoading(false);
      },
      (snapshotError) => {
        console.error(snapshotError);
        setError("Unable to load patients. Check Firebase permissions.");
        setLoading(false);
      }
    );
  }, [user]);

  const canEdit = role ? hasPermission(role, "patients") : false;

  const filtered = useMemo(() => {
    const visible = patients.filter((patient) => view === "all" || (view === "discharged" ? patient.status === "Discharged" : patient.status !== "Discharged"));
    const q = search.trim().toLowerCase();
    if (!q) return visible;
    return visible.filter((patient) =>
      [patient.id, patient.name, patient.phone, patient.diagnosis, patient.therapist, patient.room]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [patients, search]);

  function openNew() {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setShowForm(true);
  }

  function openEdit(patient: Patient) {
    setEditing(patient);
    setForm({ ...emptyForm, ...patient });
    setError("");
    setShowForm(true);
  }

  async function savePatient() {
    if (!canEdit || !form.name.trim()) {
      setError("Patient name is required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const now = new Date().toISOString();
      if (editing) {
        await updateDoc(doc(db, PATIENTS_COLLECTION, editing.firestoreId || editing.id), {
          ...form,
          name: form.name.trim(),
          updatedAt: now,
          isDeleted: false,
          status: form.dischargeDate ? "Discharged" : (editing.status || "Active"),
        });
      } else {
        const id = makePatientId(patients.map((patient) => patient.id));
        await addDoc(collection(db, PATIENTS_COLLECTION), {
          ...form,
          id,
          name: form.name.trim(),
          createdAt: now,
          updatedAt: now,
          isDeleted: false,
          status: form.dischargeDate ? "Discharged" : "Active",
        });
      }
      setShowForm(false);
      setEditing(null);
      setForm(emptyForm);
    } catch (saveError) {
      console.error(saveError);
      setError("Could not save the patient. Check Firebase permissions.");
    } finally {
      setSaving(false);
    }
  }

  async function discharge(patient: Patient) {
    if (!canEdit || patient.status === "Discharged") return;
    if (!window.confirm(`Discharge ${patient.name}?`)) return;
    try {
      const date = new Date().toISOString().slice(0, 10);
      await updateDoc(doc(db, PATIENTS_COLLECTION, patient.firestoreId || patient.id), { status: "Discharged", dischargeDate: date, updatedAt: new Date().toISOString() });
      setSelected(null);
    } catch (e) { console.error(e); setError("Unable to discharge the patient."); }
  }

  async function softDelete(patient: Patient) {
    if (!canEdit) return;
    if (!window.confirm(`Move ${patient.name} to Deleted Patients?`)) return;

    try {
      await updateDoc(doc(db, PATIENTS_COLLECTION, patient.firestoreId || patient.id), {
        isDeleted: true,
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setSelected(null);
    } catch (deleteError) {
      console.error(deleteError);
      setError("Unable to delete the patient record.");
    }
  }

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-500">Loading patients…</main>;
  }

  if (!user || !role) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-500">Checking access…</main>;
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b bg-white px-5 py-5 shadow-sm sm:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-600">Clinical Records</p>
            <h1 className="text-2xl font-bold">Patient Management</h1>
            <p className="mt-1 text-sm text-slate-500">Live Firestore records • {patients.length} active patients</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex rounded-xl border bg-white p-1"><button onClick={() => setView("active")} className={`rounded-lg px-3 py-2 text-xs font-semibold ${view === "active" ? "bg-blue-600 text-white" : ""}`}>Active</button><button onClick={() => setView("discharged")} className={`rounded-lg px-3 py-2 text-xs font-semibold ${view === "discharged" ? "bg-blue-600 text-white" : ""}`}>Discharged</button><button onClick={() => setView("all")} className={`rounded-lg px-3 py-2 text-xs font-semibold ${view === "all" ? "bg-blue-600 text-white" : ""}`}>All</button></div>
            <a href="/" className="rounded-xl border px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">← Dashboard</a>
            {canEdit && <button onClick={openNew} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">＋ Add Patient</button>}
          </div>
        </div>
      </header>

      <div className="space-y-5 p-5 sm:p-8">
        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, patient ID, phone, diagnosis, therapist or room…"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </section>

        <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="border-b px-5 py-4">
            <h2 className="font-bold">Active Patients</h2>
            <p className="text-sm text-slate-500">Deleted records are hidden here and available under Deleted Patients.</p>
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-4">Patient</th>
                  <th className="px-5 py-4">Contact</th>
                  <th className="px-5 py-4">Diagnosis</th>
                  <th className="px-5 py-4">Room</th>
                  <th className="px-5 py-4">Admission</th>
                  <th className="px-5 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((patient) => (
                  <tr key={patient.id} className="border-t hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <button onClick={() => setSelected(patient)} className="text-left">
                        <p className="font-bold hover:text-blue-600">{patient.name}</p>
                        <p className="text-xs text-slate-500">{patient.id} • {patient.age || "—"} yrs • {patient.gender || "—"}</p>
                      </button>
                    </td>
                    <td className="px-5 py-4">{patient.phone || "—"}</td>
                    <td className="px-5 py-4">{patient.diagnosis || "—"}</td>
                    <td className="px-5 py-4">{patient.room || "—"}</td>
                    <td className="px-5 py-4">{formatDate(patient.admissionDate)}</td>
                    <td className="px-5 py-4">
                      {canEdit && <div className="flex gap-2"><button onClick={() => openEdit(patient)} className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">Edit</button>{patient.status !== "Discharged" && <button onClick={() => discharge(patient)} className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">Discharge</button>}<button onClick={() => softDelete(patient)} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">Delete</button></div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 p-4 md:hidden">
            {filtered.map((patient) => (
              <article key={patient.id} className="rounded-xl border p-4">
                <button onClick={() => setSelected(patient)} className="text-left">
                  <p className="font-bold">{patient.name}</p>
                  <p className="text-xs text-slate-500">{patient.id} • {patient.age || "—"} yrs • {patient.gender || "—"}</p>
                </button>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <Info label="Phone" value={patient.phone || "—"} />
                  <Info label="Room" value={patient.room || "—"} />
                  <Info label="Diagnosis" value={patient.diagnosis || "—"} />
                  <Info label="Admission" value={formatDate(patient.admissionDate)} />
                </div>
                {canEdit && <div className="mt-3 flex gap-2"><button onClick={() => openEdit(patient)} className="flex-1 rounded-xl bg-blue-50 py-2 text-sm font-semibold text-blue-700">Edit</button>{patient.status !== "Discharged" && <button onClick={() => discharge(patient)} className="flex-1 rounded-xl bg-amber-50 py-2 text-sm font-semibold text-amber-700">Discharge</button>}<button onClick={() => softDelete(patient)} className="flex-1 rounded-xl bg-red-50 py-2 text-sm font-semibold text-red-700">Delete</button></div>}
              </article>
            ))}
          </div>

          {filtered.length === 0 && <div className="p-12 text-center text-sm text-slate-500">No active patients found.</div>}
        </section>
      </div>

      {showForm && (
        <Modal title={editing ? "Edit Patient" : "Add Patient"} onClose={() => setShowForm(false)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} required />
            <Field label="Age" value={form.age} onChange={(value) => setForm({ ...form, age: value })} type="number" />
            <Field label="Gender" value={form.gender} onChange={(value) => setForm({ ...form, gender: value })} placeholder="Male / Female / Other" />
            <Field label="Phone" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} type="tel" />
            <Field label="Emergency contact" value={form.emergencyContact} onChange={(value) => setForm({ ...form, emergencyContact: value })} type="tel" />
            <Field label="Room / Bed" value={form.room} onChange={(value) => setForm({ ...form, room: value })} />
            <Field label="Admission date" value={form.admissionDate} onChange={(value) => setForm({ ...form, admissionDate: value })} type="date" />
            <Field label="Discharge date" value={form.dischargeDate} onChange={(value) => setForm({ ...form, dischargeDate: value })} type="date" />
            <Field label="Diagnosis" value={form.diagnosis} onChange={(value) => setForm({ ...form, diagnosis: value })} />
            <Field label="Doctor / Therapist" value={form.therapist} onChange={(value) => setForm({ ...form, therapist: value })} />
          </div>
          <label className="mt-4 block text-sm font-semibold">Address<textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="mt-2 min-h-20 w-full rounded-xl border p-3 outline-none focus:border-blue-500" /></label>
          <label className="mt-4 block text-sm font-semibold">Notes<textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-2 min-h-24 w-full rounded-xl border p-3 outline-none focus:border-blue-500" /></label>
          <div className="mt-5 flex justify-end gap-2"><button onClick={() => setShowForm(false)} className="rounded-xl border px-5 py-2.5 font-semibold">Cancel</button><button disabled={saving} onClick={savePatient} className="rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Save Patient"}</button></div>
        </Modal>
      )}

      {selected && (
        <Modal title={selected.name} onClose={() => setSelected(null)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Info label="Patient ID" value={selected.id} /><Info label="Age / Gender" value={`${selected.age || "—"} / ${selected.gender || "—"}`} />
            <Info label="Phone" value={selected.phone || "—"} /><Info label="Emergency" value={selected.emergencyContact || "—"} />
            <Info label="Room / Bed" value={selected.room || "—"} /><Info label="Doctor / Therapist" value={selected.therapist || "—"} />
            <Info label="Admission" value={formatDate(selected.admissionDate)} /><Info label="Discharge" value={formatDate(selected.dischargeDate)} />
          </div>
          <div className="mt-4 rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-slate-500">Diagnosis</p><p className="mt-1 text-sm">{selected.diagnosis || "Not recorded"}</p></div>
          <div className="mt-3 rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-slate-500">Notes</p><p className="mt-1 whitespace-pre-wrap text-sm">{selected.notes || "No notes"}</p></div>
          {canEdit && <div className="mt-5 flex justify-end gap-2">{selected.status !== "Discharged" && <button onClick={() => discharge(selected)} className="rounded-xl bg-amber-500 px-5 py-2.5 font-semibold text-white">Discharge</button>}<button onClick={() => { setSelected(null); openEdit(selected); }} className="rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white">Edit</button><button onClick={() => softDelete(selected)} className="rounded-xl bg-red-600 px-5 py-2.5 font-semibold text-white">Move to Deleted</button></div>}
        </Modal>
      )}
    </main>
  );
}

function Field({ label, value, onChange, type = "text", placeholder, required }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; required?: boolean }) {
  return <label className="block text-sm font-semibold">{label}{required && " *"}<input required={required} type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 break-words text-sm font-semibold">{value}</p></div>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl"><div className="sticky top-0 flex items-center justify-between border-b bg-white px-5 py-4"><h2 className="text-xl font-bold">{title}</h2><button onClick={onClose} className="rounded-lg px-3 py-2 text-xl hover:bg-slate-100">×</button></div><div className="p-5">{children}</div></div></div>;
}

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
