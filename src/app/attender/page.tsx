"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

type Patient = {
  id: string;
  name: string;
  age: string;
  gender: string;
  phone: string;
  emergencyContact: string;
  admissionDate: string;
  diagnosis: string;
  therapist: string;
  room: string;
  notes: string;
};

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
};

function vitalStatus(vital: Vital): "Normal" | "Warning" | "Critical" {
  const spo2 = Number.parseFloat(vital.spo2);
  const pulse = Number.parseFloat(vital.pulse);
  const temperature = Number.parseFloat(vital.temperature);

  if ((Number.isFinite(spo2) && spo2 < 90) || (Number.isFinite(pulse) && (pulse < 45 || pulse > 130))) return "Critical";
  if ((Number.isFinite(spo2) && spo2 < 94) || (Number.isFinite(pulse) && (pulse < 55 || pulse > 110)) || (Number.isFinite(temperature) && (temperature < 96 || temperature > 100.4))) return "Warning";
  return "Normal";
}

export default function PatientAttenderPortal() {
  const [user, setUser] = useState<User | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [vitals, setVitals] = useState<Vital[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  useEffect(() => {
    return onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        window.location.replace("/login");
        return;
      }
      await loadPortal(currentUser);
    });
  }, []);

  async function loadPortal(currentUser: User) {
    try {
      setLoading(true);
      setError("");
      const token = await currentUser.getIdToken(true);
      const response = await fetch("/api/patient-attender/portal", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load your patients.");
      setPatients(Array.isArray(data.patients) ? data.patients : []);
      setVitals(Array.isArray(data.vitals) ? data.vitals : []);
      setSelectedId((current) => current || data.patients?.[0]?.id || "");
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (loadError: any) {
      console.error(loadError);
      setError(loadError?.message || "Unable to load assigned patients.");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await signOut(auth);
    window.location.replace("/login");
  }

  const selectedPatient = patients.find((patient) => patient.id === selectedId) || null;
  const patientVitals = useMemo(() => vitals.filter((vital) => vital.patientId === selectedId), [vitals, selectedId]);
  const latestVital = patientVitals[0] || null;
  const alerts = patientVitals.filter((vital) => vitalStatus(vital) !== "Normal").slice(0, 10);

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-500">Loading your assigned patients…</main>;

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-2xl">🏥</div>
            <div>
              <h1 className="text-xl font-bold">Patient Attender Portal</h1>
              <p className="text-sm text-slate-500">{user?.displayName || "Assigned care view"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => user && loadPortal(user)} className="rounded-xl border px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">↻ Refresh</button>
            <button onClick={logout} className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50">Logout</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 p-5 sm:p-8">
        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">⚠️ {error}</div>}

        <section className="rounded-2xl bg-blue-600 p-6 text-white shadow-lg">
          <p className="text-sm text-blue-100">Restricted clinical access</p>
          <h2 className="mt-1 text-2xl font-bold">Your Assigned Patients</h2>
          <p className="mt-2 text-sm text-blue-100">You can view only patients assigned to your account. Patient editing, staff management, billing and other administrative tools are unavailable.</p>
          {lastUpdated && <p className="mt-3 text-xs text-blue-100">Last refreshed: {lastUpdated}</p>}
        </section>

        {patients.length === 0 ? (
          <section className="rounded-2xl bg-white p-12 text-center shadow-sm">
            <div className="text-5xl">👤</div>
            <h2 className="mt-4 text-xl font-bold">No patients assigned</h2>
            <p className="mt-2 text-sm text-slate-500">Please ask an Admin or Sub Admin to assign a patient to your account.</p>
          </section>
        ) : (
          <>
            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <label className="mb-2 block text-sm font-semibold">Select assigned patient</label>
              <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-blue-500">
                {patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.name} — {patient.id}{patient.room ? ` — Room ${patient.room}` : ""}</option>)}
              </select>
            </section>

            {selectedPatient && (
              <section className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-blue-600">Patient profile</p>
                    <h2 className="mt-1 text-2xl font-bold">{selectedPatient.name}</h2>
                    <p className="mt-1 text-sm text-slate-500">{selectedPatient.id} • {selectedPatient.age || "—"} yrs • {selectedPatient.gender || "—"}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm"><span className="font-semibold">Room:</span> {selectedPatient.room || "—"}</div>
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Info label="Phone" value={selectedPatient.phone || "—"} />
                  <Info label="Emergency" value={selectedPatient.emergencyContact || "—"} />
                  <Info label="Admission" value={selectedPatient.admissionDate || "—"} />
                  <Info label="Therapist" value={selectedPatient.therapist || "—"} />
                </div>
                <div className="mt-4 rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-slate-500">Diagnosis</p><p className="mt-1 text-sm">{selectedPatient.diagnosis || "Not recorded"}</p></div>
                {selectedPatient.notes && <div className="mt-3 rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-slate-500">Care notes</p><p className="mt-1 whitespace-pre-wrap text-sm">{selectedPatient.notes}</p></div>}
              </section>
            )}

            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat title="Assigned" value={patients.length} icon="👥" />
              <Stat title="Vital records" value={patientVitals.length} icon="❤️" />
              <Stat title="Alerts" value={alerts.length} icon="⚠️" />
              <Stat title="Latest status" value={latestVital ? vitalStatus(latestVital) : "No data"} icon="📋" />
            </section>

            {alerts.length > 0 && <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><h2 className="font-bold text-amber-900">⚠️ Vitals requiring attention</h2><div className="mt-4 space-y-2">{alerts.map((vital) => <div key={vital.id} className="rounded-xl border border-amber-200 bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">{vital.date} {vital.time}</p><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">{vitalStatus(vital)}</span></div><p className="mt-2 text-sm text-slate-700">BP {vital.bloodPressure || "—"} • Pulse {vital.pulse || "—"} • SpO₂ {vital.spo2 || "—"} • Temp {vital.temperature || "—"}</p></div>)}</div></section>}

            <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
              <div className="border-b p-5"><h2 className="font-bold">Vitals History</h2><p className="mt-1 text-sm text-slate-500">Read-only records for the selected patient.</p></div>
              {patientVitals.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">No vitals have been synced for this patient yet.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-4">Date / Time</th><th className="px-5 py-4">BP</th><th className="px-5 py-4">Pulse</th><th className="px-5 py-4">SpO₂</th><th className="px-5 py-4">Temp</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Notes</th></tr></thead><tbody>{patientVitals.map((vital) => <tr key={vital.id} className="border-t"><td className="px-5 py-4">{vital.date} {vital.time}</td><td className="px-5 py-4">{vital.bloodPressure || "—"}</td><td className="px-5 py-4">{vital.pulse || "—"}</td><td className="px-5 py-4">{vital.spo2 || "—"}</td><td className="px-5 py-4">{vital.temperature || "—"}</td><td className="px-5 py-4"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{vitalStatus(vital)}</span></td><td className="px-5 py-4">{vital.notes || "—"}</td></tr>)}</tbody></table></div>}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-slate-100 bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div>;
}

function Stat({ title, value, icon }: { title: string; value: string | number; icon: string }) {
  return <div className="rounded-2xl bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-500">{title}</p><p className="mt-2 text-2xl font-bold">{value}</p></div><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl">{icon}</div></div></div>;
}
