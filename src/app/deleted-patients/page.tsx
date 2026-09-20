"use client";

import { useEffect, useMemo, useState } from "react";
import { arrayRemove, collection, deleteDoc, doc, getDocs, onSnapshot, query, updateDoc, where, writeBatch } from "firebase/firestore";
import { deleteObject, ref } from "firebase/storage";
import { onAuthStateChanged, User } from "firebase/auth";

import { auth, db, storage } from "@/lib/firebase";
import { isSuperAdmin, UserRole } from "@/lib/permissions";
import { Patient, PATIENTS_COLLECTION } from "@/lib/patient";

export default function DeletedPatientsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
    return onSnapshot(q, (snapshot) => {
      const deleted = snapshot.docs
        .map((item) => ({ firestoreId: item.id, ...item.data() } as Patient))
        .filter((patient) => patient.isDeleted === true)
        .sort((a, b) => (b.deletedAt || "").localeCompare(a.deletedAt || ""));
      setPatients(deleted);
      setLoading(false);
    }, () => {
      setError("Unable to load deleted records. Check Firebase permissions.");
      setLoading(false);
    });
  }, [user]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter((patient) => [patient.id, patient.name, patient.phone, patient.diagnosis, patient.therapist, patient.room].join(" ").toLowerCase().includes(q));
  }, [patients, search]);

  async function restore(patient: Patient) {
    if (!role || !isSuperAdmin(role) && !["admin", "sub_admin"].includes(role)) return;
    if (!window.confirm(`Restore ${patient.name} to active patients?`)) return;
    try {
      await updateDoc(doc(db, PATIENTS_COLLECTION, patient.firestoreId || patient.id), { isDeleted: false, deletedAt: null, updatedAt: new Date().toISOString() });
      setSelected(null);
    } catch (restoreError) {
      console.error(restoreError);
      setError("Unable to restore this patient.");
    }
  }

  async function permanentDelete(patient: Patient) {
    if (!role || !isSuperAdmin(role)) return;
    if (!window.confirm(`Permanently delete ${patient.name}? This will remove the patient and linked clinical, billing, document and assignment records. This cannot be undone.`)) return;
    try {
      const collections = ["vitals", "payments", "invoices", "bills", "patientFiles", "reports", "documents"];
      for (const name of collections) {
        const snap = await getDocs(query(collection(db, name), where("patientId", "==", patient.id)));
        for (const item of snap.docs) {
          const data = item.data() as { storagePath?: string };
          if (name === "patientFiles" && data.storagePath) {
            try { await deleteObject(ref(storage, data.storagePath)); } catch {}
          }
          await deleteDoc(item.ref);
        }
      }
      const usersSnap = await getDocs(collection(db, "users"));
      await Promise.all(usersSnap.docs.filter((u) => {
        const ids = u.data().assignedPatientIds;
        return Array.isArray(ids) && ids.includes(patient.id);
      }).map((u) => updateDoc(u.ref, { assignedPatientIds: arrayRemove(patient.id) })));
      await deleteDoc(doc(db, PATIENTS_COLLECTION, patient.firestoreId || patient.id));
      setSelected(null);
    } catch (deleteError) {
      console.error(deleteError);
      setError("Permanent deletion was denied or failed. No further records were removed after the failed operation.");
    }
  }

  async function emptyTrash() {
    if (!role || !isSuperAdmin(role) || patients.length === 0) return;
    if (!window.confirm(`Permanently delete all ${patients.length} deleted patient records? This cannot be undone.`)) return;
    try {
      const snapshot = await getDocs(collection(db, PATIENTS_COLLECTION));
      await Promise.all(snapshot.docs.filter((item) => item.data().isDeleted === true).map((item) => deleteDoc(item.ref)));
      setSelected(null);
    } catch (deleteError) {
      console.error(deleteError);
      setError("Unable to empty deleted records.");
    }
  }

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-500">Loading deleted records…</main>;
  if (!user || !role) return <main className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-500">Checking access…</main>;

  const canRestore = role === "super_admin" || role === "admin" || role === "sub_admin";
  const canPermanentDelete = role === "super_admin";

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b bg-white px-5 py-5 shadow-sm sm:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div><p className="text-sm font-semibold text-red-600">Recycle Bin</p><h1 className="text-2xl font-bold">Deleted Patients</h1><p className="mt-1 text-sm text-slate-500">Soft-deleted records are retained here. Permanent deletion is restricted to Super Admin.</p></div>
          <div className="flex flex-wrap gap-2"><a href="/patients" className="rounded-xl border px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">← Patients</a>{canPermanentDelete && patients.length > 0 && <button onClick={emptyTrash} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700">Empty Trash</button>}</div>
        </div>
      </header>

      <div className="space-y-5 p-5 sm:p-8">
        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        <section className="grid gap-4 sm:grid-cols-2"><div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm font-semibold text-slate-500">Deleted records</p><p className="mt-2 text-3xl font-bold">{patients.length}</p></div><div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm font-semibold text-slate-500">Showing</p><p className="mt-2 text-3xl font-bold">{filtered.length}</p></div></section>
        <section className="rounded-2xl bg-white p-4 shadow-sm"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search deleted patients…" className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></section>

        <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="hidden overflow-x-auto md:block"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-4">Patient</th><th className="px-5 py-4">Diagnosis</th><th className="px-5 py-4">Room</th><th className="px-5 py-4">Deleted</th><th className="px-5 py-4">Actions</th></tr></thead><tbody>{filtered.map((patient) => <tr key={patient.id} className="border-t hover:bg-slate-50"><td className="px-5 py-4"><button onClick={() => setSelected(patient)} className="text-left"><p className="font-bold hover:text-blue-600">{patient.name}</p><p className="text-xs text-slate-500">{patient.id} • {patient.phone || "No phone"}</p></button></td><td className="px-5 py-4">{patient.diagnosis || "—"}</td><td className="px-5 py-4">{patient.room || "—"}</td><td className="px-5 py-4">{formatDateTime(patient.deletedAt)}</td><td className="px-5 py-4"><div className="flex gap-2">{canRestore && <button onClick={() => restore(patient)} className="rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">Restore</button>}{canPermanentDelete && <button onClick={() => permanentDelete(patient)} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">Delete Forever</button>}</div></td></tr>)}</tbody></table></div>
          <div className="grid gap-3 p-4 md:hidden">{filtered.map((patient) => <article key={patient.id} className="rounded-xl border p-4"><div className="flex items-start justify-between"><button onClick={() => setSelected(patient)} className="text-left"><p className="font-bold">{patient.name}</p><p className="text-xs text-slate-500">{patient.id}</p></button><span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">Deleted</span></div><div className="mt-3 grid grid-cols-2 gap-2"><Info label="Diagnosis" value={patient.diagnosis || "—"}/><Info label="Room" value={patient.room || "—"}/><Info label="Deleted" value={formatDateTime(patient.deletedAt)}/><Info label="Phone" value={patient.phone || "—"}/></div><div className="mt-3 flex gap-2">{canRestore && <button onClick={() => restore(patient)} className="flex-1 rounded-xl bg-green-50 py-2 text-sm font-semibold text-green-700">Restore</button>}{canPermanentDelete && <button onClick={() => permanentDelete(patient)} className="flex-1 rounded-xl bg-red-50 py-2 text-sm font-semibold text-red-700">Delete Forever</button>}</div></article>)}</div>
          {filtered.length === 0 && <div className="p-12 text-center text-sm text-slate-500">No deleted patient records found.</div>}
        </section>
      </div>

      {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b px-5 py-4"><div><p className="text-xs font-bold uppercase text-red-600">Deleted patient</p><h2 className="text-xl font-bold">{selected.name}</h2></div><button onClick={() => setSelected(null)} className="rounded-lg px-3 py-2 text-xl hover:bg-slate-100">×</button></div><div className="space-y-4 p-5"><div className="grid gap-3 sm:grid-cols-2"><Info label="Patient ID" value={selected.id}/><Info label="Age / Gender" value={`${selected.age || "—"} / ${selected.gender || "—"}`}/><Info label="Phone" value={selected.phone || "—"}/><Info label="Emergency" value={selected.emergencyContact || "—"}/><Info label="Room" value={selected.room || "—"}/><Info label="Therapist" value={selected.therapist || "—"}/><Info label="Admission" value={formatDate(selected.admissionDate)}/><Info label="Deleted" value={formatDateTime(selected.deletedAt)}/></div><Info label="Diagnosis" value={selected.diagnosis || "Not recorded"}/><Info label="Notes" value={selected.notes || "No notes"}/><div className="flex justify-end gap-2">{canRestore && <button onClick={() => restore(selected)} className="rounded-xl bg-green-600 px-5 py-2.5 font-semibold text-white">Restore</button>}{canPermanentDelete && <button onClick={() => permanentDelete(selected)} className="rounded-xl bg-red-600 px-5 py-2.5 font-semibold text-white">Delete Forever</button>}</div></div></div></div>}
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 break-words text-sm font-semibold">{value}</p></div>; }
function formatDate(value?: string) { if (!value) return "—"; const date = new Date(`${value}T00:00:00`); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
function formatDateTime(value?: string) { if (!value) return "—"; const date = new Date(value); return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
