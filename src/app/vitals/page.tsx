"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, deleteDoc, doc, getDocs, addDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

type Patient = {
  id: string;
  patientId?: string;
  name: string;
  age?: string;
  gender?: string;
  status?: string;
};

type VitalRecord = {
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

const PATIENT_KEY = "rehab-centre-patients";
const VITALS_KEY = "rehab-centre-vitals";

const emptyForm = {
  patientId: "",
  date: "",
  time: "",
  bloodPressure: "",
  pulse: "",
  temperature: "",
  spo2: "",
  respiratoryRate: "",
  weight: "",
  notes: "",
};

export default function VitalsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [records, setRecords] = useState<VitalRecord[]>([]);

  const [form, setForm] = useState(emptyForm);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  const [selectedRecord, setSelectedRecord] =
    useState<VitalRecord | null>(null);

  const [patientFilter, setPatientFilter] = useState("All");

  const [loaded, setLoaded] = useState(false);

  /* ================= LOAD DATA ================= */

  useEffect(() => {
    async function loadData() {
      try {
        const [patientSnap, vitalsSnap] = await Promise.all([
          getDocs(collection(db, "patients")),
          getDocs(collection(db, "vitals")),
        ]);
        setPatients(patientSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Patient)));
        setRecords(vitalsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as VitalRecord)));
      } catch (error) { console.error("Unable to load vitals data", error); }
    }
    void loadData();

    const now = new Date();

    const date = now.toISOString().split("T")[0];

    const time = now.toTimeString().slice(0, 5);

    setSelectedDate(date);

    setForm((current) => ({
      ...current,
      date,
      time,
    }));

    setLoaded(true);
  }, []);

  /* ================= PATIENT PROFILE INTEGRATION ================= */

  useEffect(() => {
    const patientIdFromUrl = new URLSearchParams(
      window.location.search
    ).get("patientId");

    if (!patientIdFromUrl) return;

    setForm((current) => ({
      ...current,
      patientId: patientIdFromUrl,
    }));

    setPatientFilter(patientIdFromUrl);
  }, []);

  /* ================= SAVE DATA ================= */

  useEffect(() => {
    if (!loaded) return;

    localStorage.setItem(VITALS_KEY, JSON.stringify(records));
  }, [records, loaded]);

  /* ================= FILTER ================= */

  const filteredRecords = useMemo(() => {
    const query = search.toLowerCase().trim();

    return records.filter((record) => {
      const matchesSearch =
        !query ||
        [
          record.patientName,
          record.bloodPressure,
          record.notes,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);

      const matchesDate =
        !selectedDate || record.date === selectedDate;

      const matchesPatient =
        patientFilter === "All" ||
        record.patientId === patientFilter;

      return (
        matchesSearch &&
        matchesDate &&
        matchesPatient
      );
    });
  }, [
    records,
    search,
    selectedDate,
    patientFilter,
  ]);

  /* ================= TODAY ================= */

  const today = new Date()
    .toISOString()
    .split("T")[0];

  const todayRecords = records.filter(
    (record) => record.date === today
  );

  const criticalCount = todayRecords.filter(
    (record) => getVitalStatus(record) === "Critical"
  ).length;

  const warningCount = todayRecords.filter(
    (record) => getVitalStatus(record) === "Warning"
  ).length;

  const normalCount = todayRecords.filter(
    (record) => getVitalStatus(record) === "Normal"
  ).length;

  /* ================= FORM ================= */

  function updateField(
    field: keyof typeof emptyForm,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function openAddForm() {
    const now = new Date();

    setEditingId(null);

    setForm({
      ...emptyForm,
      date: selectedDate || today,
      time: now.toTimeString().slice(0, 5),
    });

    setSelectedRecord(null);
    setShowForm(true);
  }

  function openEditForm(record: VitalRecord) {
    setEditingId(record.id);

    setForm({
      patientId: record.patientId,
      date: record.date,
      time: record.time,
      bloodPressure: record.bloodPressure,
      pulse: record.pulse,
      temperature: record.temperature,
      spo2: record.spo2,
      respiratoryRate: record.respiratoryRate,
      weight: record.weight,
      notes: record.notes,
    });

    setSelectedRecord(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);

    setForm({
      ...emptyForm,
      date: selectedDate || today,
    });
  }

  /* ================= SAVE VITALS ================= */

  async function saveVitals() {
    if (!form.patientId) {
      alert("Please select a patient.");
      return;
    }

    if (!form.date) {
      alert("Please select a date.");
      return;
    }

    const patient = patients.find(
      (item) => item.id === form.patientId
    );

    if (!patient) {
      alert("Patient not found.");
      return;
    }

    if (editingId) {
      await updateDoc(doc(db, "vitals", editingId), {
          record.id === editingId
            ? {
                ...record,
                patientId: patient.id,
                patientName: patient.name,
                date: form.date,
                time: form.time,
                bloodPressure: form.bloodPressure,
                pulse: form.pulse,
                temperature: form.temperature,
                spo2: form.spo2,
                respiratoryRate:
                  form.respiratoryRate,
                weight: form.weight,
                notes: form.notes,
              }
            : record
        )
      );

      closeForm();
      return;
    }

    const newRecord: VitalRecord = {
      id: `VITAL-${Date.now()}`,
      patientId: patient.id,
      patientName: patient.name,
      date: form.date,
      time: form.time,
      bloodPressure: form.bloodPressure,
      pulse: form.pulse,
      temperature: form.temperature,
      spo2: form.spo2,
      respiratoryRate: form.respiratoryRate,
      weight: form.weight,
      notes: form.notes,
    };

    const created = await addDoc(collection(db, "vitals"), { ...newRecord, createdAt: new Date().toISOString() });
    setRecords((current) => [{ ...newRecord, id: created.id }, ...current]);

    closeForm();
  }

  /* ================= DELETE ================= */

  async function deleteVitals(record: VitalRecord) {
    const confirmed = window.confirm(
      `Delete the vitals record for ${record.patientName}?`
    );

    if (!confirmed) return;

    await deleteDoc(doc(db, "vitals", record.id));
    setRecords((current) => current.filter((item) => item.id !== record.id));

    setSelectedRecord(null);
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      {/* HEADER */}

      <header className="border-b bg-white px-6 py-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">❤️</span>

            <div>
              <h1 className="text-2xl font-bold">
                Patient Vitals
              </h1>

              <p className="text-sm text-slate-500">
                Monitor and maintain patient vital-sign records.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <a
              href="/"
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold hover:bg-slate-50"
            >
              ← Dashboard
            </a>

            <button
              type="button"
              onClick={openAddForm}
              disabled={patients.length === 0}
              className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              + Add Vitals
            </button>
          </div>
        </div>
      </header>

      <div className="space-y-6 p-6">
        {/* SUMMARY */}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon="📋"
            title="Today's Records"
            value={todayRecords.length}
          />

          <StatCard
            icon="🟢"
            title="Normal"
            value={normalCount}
          />

          <StatCard
            icon="🟡"
            title="Warning"
            value={warningCount}
          />

          <StatCard
            icon="🔴"
            title="Critical"
            value={criticalCount}
          />
        </div>

        {/* FILTERS */}

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-semibold">
                Date
              </label>

              <input
                type="date"
                value={selectedDate}
                onChange={(event) =>
                  setSelectedDate(event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Patient
              </label>

              <select
                value={patientFilter}
                onChange={(event) =>
                  setPatientFilter(event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 p-3 outline-none"
              >
                <option value="All">
                  All Patients
                </option>

                {patients.map((patient) => (
                  <option
                    key={patient.id}
                    value={patient.id}
                  >
                    {patient.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Search
              </label>

              <div className="relative">
                <span className="absolute left-4 top-3.5">
                  🔍
                </span>

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search patient or notes..."
                  className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </section>

        {/* PATIENT WARNING */}

        {patients.length === 0 && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <h2 className="font-bold text-amber-800">
              No patients found
            </h2>

            <p className="mt-1 text-sm text-amber-700">
              Add a patient first before recording vitals.
            </p>

            <a
              href="/patients"
              className="mt-4 inline-block rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white"
            >
              Go to Patients
            </a>
          </section>
        )}

        {/* FORM */}

        {showForm && (
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  {editingId ? "Edit Vitals" : "Record Patient Vitals"}
                </h2>

                <p className="text-sm text-slate-500">
                  Enter the patient's current measurements.
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg px-3 py-2 text-xl hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* PATIENT */}

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Patient *
                </label>

                <select
                  value={form.patientId}
                  onChange={(event) =>
                    updateField(
                      "patientId",
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-blue-500"
                >
                  <option value="">
                    Select Patient
                  </option>

                  {patients
                    .filter(
                      (patient) =>
                        patient.status !== "Discharged"
                    )
                    .map((patient) => (
                      <option
                        key={patient.id}
                        value={patient.id}
                      >
                        {patient.name}
                        {patient.patientId
                          ? ` — ${patient.patientId}`
                          : ""}
                      </option>
                    ))}
                </select>
              </div>

              <Field
                label="Date *"
                type="date"
                value={form.date}
                onChange={(value) =>
                  updateField("date", value)
                }
              />

              <Field
                label="Time"
                type="time"
                value={form.time}
                onChange={(value) =>
                  updateField("time", value)
                }
              />

              <Field
                label="Blood Pressure"
                value={form.bloodPressure}
                placeholder="e.g. 120/80"
                onChange={(value) =>
                  updateField(
                    "bloodPressure",
                    value
                  )
                }
              />

              <Field
                label="Pulse / Heart Rate"
                value={form.pulse}
                placeholder="e.g. 72 bpm"
                onChange={(value) =>
                  updateField("pulse", value)
                }
              />

              <Field
                label="Temperature"
                value={form.temperature}
                placeholder="e.g. 98.6 °F"
                onChange={(value) =>
                  updateField(
                    "temperature",
                    value
                  )
                }
              />

              <Field
                label="SpO₂"
                value={form.spo2}
                placeholder="e.g. 98 %"
                onChange={(value) =>
                  updateField("spo2", value)
                }
              />

              <Field
                label="Respiratory Rate"
                value={form.respiratoryRate}
                placeholder="e.g. 16 /min"
                onChange={(value) =>
                  updateField(
                    "respiratoryRate",
                    value
                  )
                }
              />

              <Field
                label="Weight"
                value={form.weight}
                placeholder="e.g. 65 kg"
                onChange={(value) =>
                  updateField("weight", value)
                }
              />

              <div className="md:col-span-2 lg:col-span-3">
                <label className="mb-2 block text-sm font-semibold">
                  Clinical Notes
                </label>

                <textarea
                  rows={4}
                  value={form.notes}
                  onChange={(event) =>
                    updateField(
                      "notes",
                      event.target.value
                    )
                  }
                  placeholder="Optional notes..."
                  className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeForm}
                className="rounded-xl border border-slate-200 px-5 py-3 font-semibold"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveVitals}
                className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
              >
                {editingId ? "Save Changes" : "Save Vitals"}
              </button>
            </div>
          </section>
        )}

        {/* TABLE */}

        <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="border-b px-6 py-5">
            <h2 className="text-lg font-bold">
              Vitals History
            </h2>

            <p className="text-sm text-slate-500">
              {selectedDate
                ? formatDate(selectedDate)
                : "All dates"}{" "}
              • {filteredRecords.length} record
              {filteredRecords.length === 1 ? "" : "s"}
            </p>
          </div>

          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <th className="px-6 py-4">Patient</th>
                  <th className="px-6 py-4">BP</th>
                  <th className="px-6 py-4">Pulse</th>
                  <th className="px-6 py-4">Temp</th>
                  <th className="px-6 py-4">SpO₂</th>
                  <th className="px-6 py-4">Resp.</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredRecords.map((record) => (
                  <VitalRow
                    key={record.id}
                    record={record}
                    onView={() =>
                      setSelectedRecord(record)
                    }
                    onEdit={() =>
                      openEditForm(record)
                    }
                    onDelete={() =>
                      deleteVitals(record)
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE / TABLET */}

          <div className="grid gap-4 p-4 lg:hidden">
            {filteredRecords.map((record) => (
              <VitalCard
                key={record.id}
                record={record}
                onView={() =>
                  setSelectedRecord(record)
                }
                onEdit={() =>
                  openEditForm(record)
                }
                onDelete={() =>
                  deleteVitals(record)
                }
              />
            ))}
          </div>

          {filteredRecords.length === 0 && (
            <div className="p-12 text-center">
              <div className="text-6xl">❤️</div>

              <h3 className="mt-4 text-lg font-bold">
                No vitals records
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                No vitals have been recorded for this date.
              </p>

              {patients.length > 0 && (
                <button
                  type="button"
                  onClick={openAddForm}
                  className="mt-5 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white"
                >
                  + Add Vitals
                </button>
              )}
            </div>
          )}
        </section>
      </div>

      {/* DETAILS MODAL */}

      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase text-blue-600">
                  Patient Vitals
                </p>

                <h2 className="text-xl font-bold">
                  {selectedRecord.patientName}
                </h2>

                <p className="text-sm text-slate-500">
                  {formatDate(selectedRecord.date)} •{" "}
                  {selectedRecord.time || "Time not recorded"}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedRecord(null)
                }
                className="rounded-lg px-3 py-2 text-xl hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6 p-6">
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-5">
                <div>
                  <p className="text-sm font-semibold text-slate-500">
                    Overall Reading
                  </p>

                  <p className="mt-1 text-2xl font-bold">
                    {getVitalStatus(selectedRecord)}
                  </p>
                </div>

                <StatusBadge
                  status={getVitalStatus(selectedRecord)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <InfoBox
                  label="Blood Pressure"
                  value={
                    selectedRecord.bloodPressure ||
                    "—"
                  }
                />

                <InfoBox
                  label="Pulse"
                  value={selectedRecord.pulse || "—"}
                />

                <InfoBox
                  label="Temperature"
                  value={
                    selectedRecord.temperature ||
                    "—"
                  }
                />

                <InfoBox
                  label="SpO₂"
                  value={selectedRecord.spo2 || "—"}
                />

                <InfoBox
                  label="Respiratory Rate"
                  value={
                    selectedRecord.respiratoryRate ||
                    "—"
                  }
                />

                <InfoBox
                  label="Weight"
                  value={selectedRecord.weight || "—"}
                />
              </div>

              <div>
                <p className="text-sm font-bold">
                  Clinical Notes
                </p>

                <p className="mt-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                  {selectedRecord.notes ||
                    "No notes recorded."}
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() =>
                    openEditForm(selectedRecord)
                  }
                  className="rounded-xl border border-slate-200 px-5 py-3 font-semibold"
                >
                  ✏️ Edit
                </button>

                <button
                  type="button"
                  onClick={() =>
                    deleteVitals(selectedRecord)
                  }
                  className="rounded-xl bg-red-50 px-5 py-3 font-semibold text-red-600"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* ================= FIELD ================= */

function Field({
  label,
  value,
  placeholder,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold">
        {label}
      </label>

      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      />
    </div>
  );
}

/* ================= STAT ================= */

function StatCard({
  icon,
  title,
  value,
}: {
  icon: string;
  title: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-500">
          {title}
        </p>

        <span className="text-2xl">{icon}</span>
      </div>

      <p className="mt-3 text-3xl font-bold">
        {value}
      </p>
    </div>
  );
}

/* ================= TABLE ROW ================= */

function VitalRow({
  record,
  onView,
  onEdit,
  onDelete,
}: {
  record: VitalRecord;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const status = getVitalStatus(record);

  return (
    <tr className="border-b last:border-0 hover:bg-slate-50">
      <td className="px-6 py-4">
        <button
          type="button"
          onClick={onView}
          className="text-left"
        >
          <p className="font-bold hover:text-blue-600">
            {record.patientName}
          </p>

          <p className="text-xs text-slate-500">
            {record.date} • {record.time}
          </p>
        </button>
      </td>

      <td className="px-6 py-4 text-sm">
        {record.bloodPressure || "—"}
      </td>

      <td className="px-6 py-4 text-sm">
        {record.pulse || "—"}
      </td>

      <td className="px-6 py-4 text-sm">
        {record.temperature || "—"}
      </td>

      <td className="px-6 py-4 text-sm">
        {record.spo2 || "—"}
      </td>

      <td className="px-6 py-4 text-sm">
        {record.respiratoryRate || "—"}
      </td>

      <td className="px-6 py-4">
        <StatusBadge status={status} />
      </td>

      <td className="px-6 py-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onView}
            className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-600"
          >
            View
          </button>

          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold"
          >
            Edit
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

/* ================= MOBILE CARD ================= */

function VitalCard({
  record,
  onView,
  onEdit,
  onDelete,
}: {
  record: VitalRecord;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const status = getVitalStatus(record);

  return (
    <div className="rounded-2xl border p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-bold">
            {record.patientName}
          </p>

          <p className="text-xs text-slate-500">
            {formatDate(record.date)} • {record.time}
          </p>
        </div>

        <StatusBadge status={status} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <InfoBox
          label="BP"
          value={record.bloodPressure || "—"}
        />

        <InfoBox
          label="Pulse"
          value={record.pulse || "—"}
        />

        <InfoBox
          label="Temperature"
          value={record.temperature || "—"}
        />

        <InfoBox
          label="SpO₂"
          value={record.spo2 || "—"}
        />

        <InfoBox
          label="Resp."
          value={record.respiratoryRate || "—"}
        />

        <InfoBox
          label="Weight"
          value={record.weight || "—"}
        />
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onView}
          className="flex-1 rounded-xl bg-blue-50 py-2 text-sm font-semibold text-blue-600"
        >
          View
        </button>

        <button
          type="button"
          onClick={onEdit}
          className="flex-1 rounded-xl bg-slate-100 py-2 text-sm font-semibold"
        >
          Edit
        </button>

        <button
          type="button"
          onClick={onDelete}
          className="rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-600"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}

/* ================= STATUS ================= */

function StatusBadge({
  status,
}: {
  status: "Normal" | "Warning" | "Critical";
}) {
  const styles = {
    Normal: "bg-green-50 text-green-700",
    Warning: "bg-amber-50 text-amber-700",
    Critical: "bg-red-50 text-red-700",
  };

  const icons = {
    Normal: "🟢",
    Warning: "🟡",
    Critical: "🔴",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold ${styles[status]}`}
    >
      {icons[status]} {status}
    </span>
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

/* ================= VITAL STATUS ================= */

/*
 * These are only simple screening flags for the UI.
 * They are NOT a medical diagnosis.
 */

function getVitalStatus(
  record: VitalRecord
): "Normal" | "Warning" | "Critical" {
  let critical = false;
  let warning = false;

  const pulse = parseNumber(record.pulse);
  const spo2 = parseNumber(record.spo2);
  const temperature = parseNumber(record.temperature);
  const respiratory = parseNumber(
    record.respiratoryRate
  );

  if (spo2 !== null) {
    if (spo2 < 90) critical = true;
    else if (spo2 < 94) warning = true;
  }

  if (pulse !== null) {
    if (pulse < 50 || pulse > 120) critical = true;
    else if (pulse < 60 || pulse > 100) warning = true;
  }

  if (temperature !== null) {
    if (temperature >= 103 || temperature < 95)
      critical = true;
    else if (temperature >= 100.4 || temperature < 96)
      warning = true;
  }

  if (respiratory !== null) {
    if (respiratory < 8 || respiratory > 30)
      critical = true;
    else if (respiratory < 12 || respiratory > 20)
      warning = true;
  }

  const bp = parseBloodPressure(record.bloodPressure);

  if (bp) {
    if (
      bp.systolic >= 180 ||
      bp.diastolic >= 120 ||
      bp.systolic < 90
    ) {
      critical = true;
    } else if (
      bp.systolic >= 140 ||
      bp.diastolic >= 90 ||
      bp.systolic < 100
    ) {
      warning = true;
    }
  }

  if (critical) return "Critical";

  if (warning) return "Warning";

  return "Normal";
}

/* ================= NUMBER ================= */

function parseNumber(value: string) {
  if (!value) return null;

  const match = value.match(/-?\d+(\.\d+)?/);

  if (!match) return null;

  const number = Number(match[0]);

  return Number.isFinite(number)
    ? number
    : null;
}

/* ================= BLOOD PRESSURE ================= */

function parseBloodPressure(value: string) {
  if (!value) return null;

  const match = value.match(
    /(\d{2,3})\s*[/]\s*(\d{2,3})/
  );

  if (!match) return null;

  return {
    systolic: Number(match[1]),
    diastolic: Number(match[2]),
  };
}

/* ================= DATE ================= */

function formatDate(value: string) {
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