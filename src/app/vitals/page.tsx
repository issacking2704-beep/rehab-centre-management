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
        updatedAt: new Date().toISOString(),
      });

      setRecords((current) =>
        current.map((record) =>
          record.id === editingId
            ? { ...record, ...form, patientId: patient.id, patientName: patient.name }
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
