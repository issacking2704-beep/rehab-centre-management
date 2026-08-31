"use client";

import { useEffect, useMemo, useState } from "react";

type Patient = {
  id: string;
  name: string;
  age: string;
  gender: string;
  phone: string;
  address: string;
  emergencyContact: string;
  admissionDate: string;
  dischargeDate: string;
  diagnosis: string;
  therapist: string;
  room: string;
  notes: string;
  createdAt: string;
  deletedAt?: string;
};

const DELETED_KEY = "rehab-centre-deleted-patients";
const PATIENTS_KEY = "rehab-centre-patients";

export default function DeletedPatientsPage() {
  const [deletedPatients, setDeletedPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] =
    useState<Patient | null>(null);
  const [loaded, setLoaded] = useState(false);

  /* ================= LOAD ================= */

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DELETED_KEY);

      if (saved) {
        setDeletedPatients(JSON.parse(saved));
      }
    } catch (error) {
      console.error("Unable to load deleted patients", error);
    }

    setLoaded(true);
  }, []);

  /* ================= SAVE ================= */

  useEffect(() => {
    if (!loaded) return;

    localStorage.setItem(
      DELETED_KEY,
      JSON.stringify(deletedPatients)
    );
  }, [deletedPatients, loaded]);

  /* ================= SEARCH ================= */

  const filteredPatients = useMemo(() => {
    const query = search.toLowerCase().trim();

    if (!query) {
      return deletedPatients;
    }

    return deletedPatients.filter((patient) =>
      [
        patient.id,
        patient.name,
        patient.phone,
        patient.diagnosis,
        patient.therapist,
        patient.room,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [deletedPatients, search]);

  /* ================= RESTORE ================= */

  function restorePatient(patient: Patient) {
    const confirmed = window.confirm(
      `Restore ${patient.name} to active patient records?`
    );

    if (!confirmed) return;

    try {
      const existingPatients: Patient[] = JSON.parse(
        localStorage.getItem(PATIENTS_KEY) || "[]"
      );

      const restoredPatient: Patient = {
        ...patient,
      };

      delete restoredPatient.deletedAt;

      localStorage.setItem(
        PATIENTS_KEY,
        JSON.stringify([
          restoredPatient,
          ...existingPatients,
        ])
      );

      setDeletedPatients((current) =>
        current.filter(
          (item) => item.id !== patient.id
        )
      );

      setSelectedPatient(null);

      alert(`${patient.name} has been restored.`);
    } catch (error) {
      console.error("Unable to restore patient", error);
      alert("Unable to restore patient.");
    }
  }

  /* ================= PERMANENT DELETE ================= */

  function permanentlyDeletePatient(patient: Patient) {
    const confirmed = window.confirm(
      `PERMANENTLY delete ${patient.name}?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    setDeletedPatients((current) =>
      current.filter(
        (item) => item.id !== patient.id
      )
    );

    setSelectedPatient(null);
  }

  /* ================= DELETE ALL ================= */

  function permanentlyDeleteAll() {
    if (deletedPatients.length === 0) return;

    const confirmed = window.confirm(
      `Permanently delete all ${deletedPatients.length} deleted patient records?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    setDeletedPatients([]);
    setSelectedPatient(null);
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      {/* HEADER */}

      <header className="border-b bg-white px-6 py-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🗑️</span>

            <div>
              <h1 className="text-2xl font-bold">
                Deleted Patients
              </h1>

              <p className="text-sm text-slate-500">
                Manage deleted patient records and restore
                them when required.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/patients"
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold hover:bg-slate-50"
            >
              ← Patient Management
            </a>

            {deletedPatients.length > 0 && (
              <button
                type="button"
                onClick={permanentlyDeleteAll}
                className="rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700"
              >
                🗑️ Empty Deleted Records
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="space-y-6 p-6">
        {/* STAT CARD */}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  Deleted Records
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {deletedPatients.length}
                </p>
              </div>

              <div className="text-4xl">🗑️</div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  Currently Displayed
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {filteredPatients.length}
                </p>
              </div>

              <div className="text-4xl">🔎</div>
            </div>
          </div>
        </div>

        {/* SEARCH */}

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="relative">
            <span className="absolute left-4 top-3.5">
              🔍
            </span>

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search deleted patients by name, ID, phone, diagnosis, therapist or room..."
              className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </section>

        {/* TABLE */}

        <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="border-b px-6 py-5">
            <h2 className="text-lg font-bold">
              Deleted Patient Records
            </h2>

            <p className="text-sm text-slate-500">
              Deleted records are kept separately from
              active patients.
            </p>
          </div>

          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <th className="px-6 py-4">
                    Patient
                  </th>

                  <th className="px-6 py-4">
                    Contact
                  </th>

                  <th className="px-6 py-4">
                    Diagnosis
                  </th>

                  <th className="px-6 py-4">
                    Room
                  </th>

                  <th className="px-6 py-4">
                    Deleted
                  </th>

                  <th className="px-6 py-4">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredPatients.map((patient) => (
                  <tr
                    key={patient.id}
                    className="border-b last:border-0 hover:bg-slate-50"
                  >
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedPatient(patient)
                        }
                        className="text-left"
                      >
                        <p className="font-bold hover:text-blue-600">
                          {patient.name}
                        </p>

                        <p className="text-xs text-slate-500">
                          {patient.id} • {patient.age} yrs •{" "}
                          {patient.gender}
                        </p>
                      </button>
                    </td>

                    <td className="px-6 py-4 text-sm">
                      {patient.phone || "—"}
                    </td>

                    <td className="px-6 py-4 text-sm">
                      {patient.diagnosis || "—"}
                    </td>

                    <td className="px-6 py-4 text-sm">
                      {patient.room || "—"}
                    </td>

                    <td className="px-6 py-4 text-sm">
                      {formatDateTime(
                        patient.deletedAt
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedPatient(patient)
                          }
                          className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-600"
                        >
                          View
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            restorePatient(patient)
                          }
                          className="rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-700"
                        >
                          ♻️ Restore
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            permanentlyDeletePatient(
                              patient
                            )
                          }
                          className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600"
                        >
                          Delete Forever
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE */}

          <div className="space-y-4 p-4 lg:hidden">
            {filteredPatients.map((patient) => (
              <div
                key={patient.id}
                className="rounded-2xl border p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedPatient(patient)
                      }
                      className="text-left"
                    >
                      <p className="font-bold">
                        {patient.name}
                      </p>

                      <p className="text-xs text-slate-500">
                        {patient.id}
                      </p>
                    </button>
                  </div>

                  <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-600">
                    Deleted
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <InfoBox
                    label="Age / Gender"
                    value={`${patient.age} / ${patient.gender}`}
                  />

                  <InfoBox
                    label="Room"
                    value={patient.room || "—"}
                  />

                  <InfoBox
                    label="Diagnosis"
                    value={
                      patient.diagnosis || "—"
                    }
                  />

                  <InfoBox
                    label="Deleted"
                    value={formatDateTime(
                      patient.deletedAt
                    )}
                  />
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedPatient(patient)
                    }
                    className="flex-1 rounded-xl bg-blue-50 py-2 text-sm font-semibold text-blue-600"
                  >
                    View
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      restorePatient(patient)
                    }
                    className="flex-1 rounded-xl bg-green-50 py-2 text-sm font-semibold text-green-700"
                  >
                    ♻️ Restore
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    permanentlyDeletePatient(
                      patient
                    )
                  }
                  className="mt-2 w-full rounded-xl bg-red-50 py-2 text-sm font-semibold text-red-600"
                >
                  Delete Forever
                </button>
              </div>
            ))}
          </div>

          {/* EMPTY STATE */}

          {filteredPatients.length === 0 && (
            <div className="p-12 text-center">
              <div className="text-6xl">🗑️</div>

              <h3 className="mt-4 text-lg font-bold">
                {search
                  ? "No matching records"
                  : "No deleted patients"}
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                {search
                  ? "Try a different search."
                  : "Deleted patient records will appear here."}
              </p>

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="mt-5 rounded-xl bg-slate-100 px-5 py-3 text-sm font-semibold"
                >
                  Clear Search
                </button>
              )}
            </div>
          )}
        </section>
      </div>

      {/* PATIENT DETAILS MODAL */}

      {selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b bg-white px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase text-red-600">
                  Deleted Patient
                </p>

                <h2 className="text-xl font-bold">
                  {selectedPatient.name}
                </h2>

                <p className="text-sm text-slate-500">
                  {selectedPatient.id}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedPatient(null)
                }
                className="rounded-lg px-3 py-2 text-xl hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6 p-6">
              <div className="rounded-xl bg-red-50 p-4">
                <p className="text-sm font-bold text-red-700">
                  ⚠️ This patient is currently in the
                  deleted records.
                </p>

                <p className="mt-1 text-xs text-red-600">
                  Restoring the patient will return the
                  record to Patient Management.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <InfoBox
                  label="Age"
                  value={selectedPatient.age}
                />

                <InfoBox
                  label="Gender"
                  value={selectedPatient.gender}
                />

                <InfoBox
                  label="Phone"
                  value={
                    selectedPatient.phone || "—"
                  }
                />

                <InfoBox
                  label="Emergency Contact"
                  value={
                    selectedPatient.emergencyContact ||
                    "—"
                  }
                />

                <InfoBox
                  label="Room / Bed"
                  value={
                    selectedPatient.room || "—"
                  }
                />

                <InfoBox
                  label="Therapist"
                  value={
                    selectedPatient.therapist || "—"
                  }
                />

                <InfoBox
                  label="Admission"
                  value={
                    selectedPatient.admissionDate
                      ? formatDate(
                          selectedPatient.admissionDate
                        )
                      : "—"
                  }
                />

                <InfoBox
                  label="Discharge"
                  value={
                    selectedPatient.dischargeDate
                      ? formatDate(
                          selectedPatient.dischargeDate
                        )
                      : "Not recorded"
                  }
                />

                <InfoBox
                  label="Deleted"
                  value={formatDateTime(
                    selectedPatient.deletedAt
                  )}
                />
              </div>

              <div>
                <p className="text-sm font-bold">
                  Diagnosis
                </p>

                <p className="mt-2 rounded-xl bg-slate-50 p-4 text-sm">
                  {selectedPatient.diagnosis ||
                    "No diagnosis recorded."}
                </p>
              </div>

              <div>
                <p className="text-sm font-bold">
                  Address
                </p>

                <p className="mt-2 whitespace-pre-line rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                  {selectedPatient.address ||
                    "No address recorded."}
                </p>
              </div>

              <div>
                <p className="text-sm font-bold">
                  Notes
                </p>

                <p className="mt-2 whitespace-pre-line rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                  {selectedPatient.notes ||
                    "No notes recorded."}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() =>
                    restorePatient(
                      selectedPatient
                    )
                  }
                  className="rounded-xl bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700"
                >
                  ♻️ Restore Patient
                </button>

                <button
                  type="button"
                  onClick={() =>
                    permanentlyDeletePatient(
                      selectedPatient
                    )
                  }
                  className="rounded-xl bg-red-600 px-6 py-3 font-semibold text-white hover:bg-red-700"
                >
                  🗑️ Delete Forever
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* ================= INFO BOX ================= */

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs font-semibold text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold">
        {value}
      </p>
    </div>
  );
}

/* ================= DATE ================= */

function formatDate(value?: string) {
  if (!value) return "—";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* ================= DATE + TIME ================= */

function formatDateTime(value?: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}