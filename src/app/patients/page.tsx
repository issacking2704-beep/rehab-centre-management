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
};

const STORAGE_KEY = "rehab-centre-patients";

const emptyPatient: Omit<Patient, "id" | "createdAt"> = {
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
};

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(
    null
  );

  const [selectedPatient, setSelectedPatient] =
    useState<Patient | null>(null);

  const [form, setForm] =
    useState(emptyPatient);

  /* ================= LOAD DATA ================= */

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved) {
        setPatients(JSON.parse(saved));
      }
    } catch (error) {
      console.error(
        "Unable to load patient data",
        error
      );
    }

    setLoaded(true);
  }, []);

  /* ================= SAVE DATA ================= */

  useEffect(() => {
    if (!loaded) return;

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(patients)
      );
    } catch (error) {
      console.error(
        "Unable to save patient data",
        error
      );
    }
  }, [patients, loaded]);

  /* ================= FILTER ================= */

  const filteredPatients = useMemo(() => {
    const query = search
      .toLowerCase()
      .trim();

    return patients.filter((patient) => {
      const matchesSearch =
        !query ||
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
          .includes(query);

      const matchesGender =
        genderFilter === "All" ||
        patient.gender === genderFilter;

      return (
        matchesSearch &&
        matchesGender
      );
    });
  }, [patients, search, genderFilter]);

  /* ================= FORM ================= */

  function updateField(
    field: keyof typeof emptyPatient,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function openAddForm() {
    setEditingId(null);
    setForm(emptyPatient);
    setShowForm(true);
    setSelectedPatient(null);
  }

  function openEditForm(patient: Patient) {
    setEditingId(patient.id);

    setForm({
      name: patient.name,
      age: patient.age,
      gender: patient.gender,
      phone: patient.phone,
      address: patient.address,
      emergencyContact:
        patient.emergencyContact,
      admissionDate:
        patient.admissionDate,
      dischargeDate:
        patient.dischargeDate,
      diagnosis: patient.diagnosis,
      therapist: patient.therapist,
      room: patient.room,
      notes: patient.notes,
    });

    setShowForm(true);
    setSelectedPatient(null);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyPatient);
  }

  /* ================= ADD / UPDATE ================= */

  function savePatient() {
    if (!form.name.trim()) {
      alert("Please enter the patient name.");
      return;
    }

    if (!form.age.trim()) {
      alert("Please enter the patient age.");
      return;
    }

    if (!form.gender) {
      alert("Please select gender.");
      return;
    }

    if (editingId) {
      setPatients((current) =>
        current.map((patient) =>
          patient.id === editingId
            ? {
                ...patient,
                ...form,
              }
            : patient
        )
      );

      closeForm();
      return;
    }

    const patientNumber =
      patients.length + 1;

    const newPatient: Patient = {
      id: `RC-${String(
        patientNumber
      ).padStart(4, "0")}`,

      ...form,

      createdAt:
        new Date().toISOString(),
    };

    setPatients((current) => [
      newPatient,
      ...current,
    ]);

    closeForm();
  }

  /* ================= DELETE ================= */

  function deletePatient(patient: Patient) {
    const confirmed = window.confirm(
      `Move ${patient.name} to Deleted Patients?`
    );

    if (!confirmed) return;

    const deleted = {
      ...patient,
      deletedAt:
        new Date().toISOString(),
    };

    const existingDeleted =
      JSON.parse(
        localStorage.getItem(
          "rehab-centre-deleted-patients"
        ) || "[]"
      );

    localStorage.setItem(
      "rehab-centre-deleted-patients",
      JSON.stringify([
        deleted,
        ...existingDeleted,
      ])
    );

    setPatients((current) =>
      current.filter(
        (item) =>
          item.id !== patient.id
      )
    );

    setSelectedPatient(null);
  }

  /* ================= UI ================= */

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      {/* HEADER */}

      <header className="border-b bg-white px-6 py-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-3xl">
                🧑‍⚕️
              </span>

              <div>
                <h1 className="text-2xl font-bold">
                  Patient Management
                </h1>

                <p className="text-sm text-slate-500">
                  Manage patient records, admissions,
                  rehabilitation information and notes.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/deleted-patients"
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-slate-50"
            >
              🗑️ Deleted Patients
            </a>

            <button
              type="button"
              onClick={openAddForm}
              className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
            >
              + Add Patient
            </button>
          </div>
        </div>
      </header>

      <div className="space-y-6 p-6">
        {/* STATISTICS */}

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            icon="👥"
            title="Total Patients"
            value={patients.length}
          />

          <StatCard
            icon="🟢"
            title="Active Patients"
            value={
              patients.filter(
                (patient) =>
                  !patient.dischargeDate
              ).length
            }
          />

          <StatCard
            icon="🏠"
            title="Rooms Occupied"
            value={
              new Set(
                patients
                  .filter(
                    (patient) =>
                      patient.room
                  )
                  .map(
                    (patient) =>
                      patient.room
                  )
              ).size
            }
          />
        </div>

        {/* SEARCH */}

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <span className="absolute left-4 top-3.5">
                🔍
              </span>

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search by patient name, ID, phone, diagnosis, therapist or room..."
                className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 outline-none focus:border-blue-500"
              />
            </div>

            <select
              value={genderFilter}
              onChange={(event) =>
                setGenderFilter(
                  event.target.value
                )
              }
              className="rounded-xl border border-slate-200 px-4 py-3 outline-none"
            >
              <option value="All">
                All Genders
              </option>

              <option value="Male">
                Male
              </option>

              <option value="Female">
                Female
              </option>

              <option value="Other">
                Other
              </option>
            </select>
          </div>
        </section>

        {/* ADD / EDIT FORM */}

        {showForm && (
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  {editingId
                    ? "Edit Patient"
                    : "Register New Patient"}
                </h2>

                <p className="text-sm text-slate-500">
                  Enter the patient's information below.
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

            {/* BASIC INFORMATION */}

            <FormSection title="Basic Information">
              <Field
                label="Patient Name *"
                value={form.name}
                onChange={(value) =>
                  updateField(
                    "name",
                    value
                  )
                }
                placeholder="Full name"
              />

              <Field
                label="Age *"
                value={form.age}
                onChange={(value) =>
                  updateField(
                    "age",
                    value
                  )
                }
                type="number"
                placeholder="Age"
              />

              <SelectField
                label="Gender *"
                value={form.gender}
                onChange={(value) =>
                  updateField(
                    "gender",
                    value
                  )
                }
                options={[
                  "Male",
                  "Female",
                  "Other",
                ]}
              />

              <Field
                label="Phone"
                value={form.phone}
                onChange={(value) =>
                  updateField(
                    "phone",
                    value
                  )
                }
                placeholder="+91 XXXXX XXXXX"
              />

              <Field
                label="Emergency Contact"
                value={
                  form.emergencyContact
                }
                onChange={(value) =>
                  updateField(
                    "emergencyContact",
                    value
                  )
                }
                placeholder="Emergency contact number"
              />

              <Field
                label="Room / Bed"
                value={form.room}
                onChange={(value) =>
                  updateField(
                    "room",
                    value
                  )
                }
                placeholder="Room / Bed number"
              />
            </FormSection>

            {/* ADDRESS */}

            <FormSection title="Address">
              <div className="md:col-span-2 lg:col-span-3">
                <TextArea
                  label="Patient Address"
                  value={form.address}
                  onChange={(value) =>
                    updateField(
                      "address",
                      value
                    )
                  }
                  placeholder="Complete address"
                />
              </div>
            </FormSection>

            {/* REHABILITATION */}

            <FormSection title="Rehabilitation Information">
              <Field
                label="Admission Date"
                value={
                  form.admissionDate
                }
                onChange={(value) =>
                  updateField(
                    "admissionDate",
                    value
                  )
                }
                type="date"
              />

              <Field
                label="Discharge Date"
                value={
                  form.dischargeDate
                }
                onChange={(value) =>
                  updateField(
                    "dischargeDate",
                    value
                  )
                }
                type="date"
              />

              <Field
                label="Diagnosis / Condition"
                value={
                  form.diagnosis
                }
                onChange={(value) =>
                  updateField(
                    "diagnosis",
                    value
                  )
                }
                placeholder="Diagnosis / condition"
              />

              <Field
                label="Assigned Therapist"
                value={
                  form.therapist
                }
                onChange={(value) =>
                  updateField(
                    "therapist",
                    value
                  )
                }
                placeholder="Therapist name"
              />
            </FormSection>

            {/* NOTES */}

            <FormSection title="Clinical / General Notes">
              <div className="md:col-span-2 lg:col-span-3">
                <TextArea
                  label="Notes"
                  value={form.notes}
                  onChange={(value) =>
                    updateField(
                      "notes",
                      value
                    )
                  }
                  placeholder="General rehabilitation notes..."
                  rows={5}
                />
              </div>
            </FormSection>

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
                onClick={savePatient}
                className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
              >
                {editingId
                  ? "Save Changes"
                  : "Register Patient"}
              </button>
            </div>
          </section>
        )}

        {/* PATIENT LIST */}

        <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="border-b px-6 py-5">
            <h2 className="text-lg font-bold">
              Patient Records
            </h2>

            <p className="text-sm text-slate-500">
              Showing{" "}
              {filteredPatients.length}{" "}
              of {patients.length} patients
            </p>
          </div>

          {/* DESKTOP */}

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
                    Therapist
                  </th>

                  <th className="px-6 py-4">
                    Room
                  </th>

                  <th className="px-6 py-4">
                    Admission
                  </th>

                  <th className="px-6 py-4">
                    Status
                  </th>

                  <th className="px-6 py-4">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredPatients.map(
                  (patient) => (
                    <PatientRow
                      key={patient.id}
                      patient={patient}
                      onView={() =>
                        setSelectedPatient(
                          patient
                        )
                      }
                      onEdit={() =>
                        openEditForm(
                          patient
                        )
                      }
                      onDelete={() =>
                        deletePatient(
                          patient
                        )
                      }
                    />
                  )
                )}
              </tbody>
            </table>
          </div>

          {/* MOBILE */}

          <div className="space-y-4 p-4 lg:hidden">
            {filteredPatients.map(
              (patient) => (
                <PatientCard
                  key={patient.id}
                  patient={patient}
                  onView={() =>
                    setSelectedPatient(
                      patient
                    )
                  }
                  onEdit={() =>
                    openEditForm(
                      patient
                    )
                  }
                  onDelete={() =>
                    deletePatient(
                      patient
                    )
                  }
                />
              )
            )}
          </div>

          {filteredPatients.length ===
            0 && (
            <div className="p-12 text-center">
              <div className="text-5xl">
                👥
              </div>

              <h3 className="mt-4 text-lg font-bold">
                No patients found
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Add a patient or change your
                search.
              </p>

              <button
                type="button"
                onClick={openAddForm}
                className="mt-5 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white"
              >
                + Add First Patient
              </button>
            </div>
          )}
        </section>
      </div>

      {/* PATIENT PROFILE MODAL */}

      {selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b bg-white px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase text-blue-600">
                  Patient Profile
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
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <InfoBox
                  label="Age"
                  value={
                    selectedPatient.age
                  }
                />

                <InfoBox
                  label="Gender"
                  value={
                    selectedPatient.gender
                  }
                />

                <InfoBox
                  label="Phone"
                  value={
                    selectedPatient.phone ||
                    "—"
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
                    selectedPatient.room ||
                    "—"
                  }
                />

                <InfoBox
                  label="Therapist"
                  value={
                    selectedPatient.therapist ||
                    "—"
                  }
                />

                <InfoBox
                  label="Admission Date"
                  value={
                    selectedPatient.admissionDate
                      ? formatDate(
                          selectedPatient.admissionDate
                        )
                      : "—"
                  }
                />

                <InfoBox
                  label="Discharge Date"
                  value={
                    selectedPatient.dischargeDate
                      ? formatDate(
                          selectedPatient.dischargeDate
                        )
                      : "Not discharged"
                  }
                />

                <InfoBox
                  label="Diagnosis"
                  value={
                    selectedPatient.diagnosis ||
                    "—"
                  }
                />
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

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() =>
                    openEditForm(
                      selectedPatient
                    )
                  }
                  className="rounded-xl border border-slate-200 px-5 py-3 font-semibold"
                >
                  ✏️ Edit
                </button>

                <button
                  type="button"
                  onClick={() =>
                    deletePatient(
                      selectedPatient
                    )
                  }
                  className="rounded-xl bg-red-50 px-5 py-3 font-semibold text-red-600"
                >
                  🗑️ Delete Patient
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* ================= COMPONENTS ================= */

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
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-500">
          {title}
        </p>

        <span className="text-2xl">
          {icon}
        </span>
      </div>

      <p className="mt-3 text-3xl font-bold">
        {value}
      </p>
    </div>
  );
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <h3 className="mb-4 border-b pb-2 text-sm font-bold uppercase tracking-wide text-blue-700">
        {title}
      </h3>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
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
        min={
          type === "number"
            ? "0"
            : undefined
        }
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-blue-500"
      >
        <option value="">
          Select
        </option>

        {options.map((option) => (
          <option
            key={option}
            value={option}
          >
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold">
        {label}
      </label>

      <textarea
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      />
    </div>
  );
}

function PatientRow({
  patient,
  onView,
  onEdit,
  onDelete,
}: {
  patient: Patient;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const active =
    !patient.dischargeDate;

  return (
    <tr className="border-b last:border-0 hover:bg-slate-50">
      <td className="px-6 py-4">
        <button
          type="button"
          onClick={onView}
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
        {patient.therapist || "—"}
      </td>

      <td className="px-6 py-4 text-sm">
        {patient.room || "—"}
      </td>

      <td className="px-6 py-4 text-sm">
        {patient.admissionDate
          ? formatDate(
              patient.admissionDate
            )
          : "—"}
      </td>

      <td className="px-6 py-4">
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            active
              ? "bg-green-50 text-green-700"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {active
            ? "Active"
            : "Discharged"}
        </span>
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

function PatientCard({
  patient,
  onView,
  onEdit,
  onDelete,
}: {
  patient: Patient;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const active =
    !patient.dischargeDate;

  return (
    <div className="rounded-2xl border p-4">
      <div className="flex items-start justify-between">
        <div>
          <button
            type="button"
            onClick={onView}
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

        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            active
              ? "bg-green-50 text-green-700"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {active
            ? "Active"
            : "Discharged"}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <InfoBox
          label="Age / Gender"
          value={`${patient.age} / ${patient.gender}`}
        />

        <InfoBox
          label="Room"
          value={
            patient.room || "—"
          }
        />

        <InfoBox
          label="Diagnosis"
          value={
            patient.diagnosis || "—"
          }
        />

        <InfoBox
          label="Therapist"
          value={
            patient.therapist || "—"
          }
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

function formatDate(value: string) {
  if (!value) return "—";

  const date = new Date(
    `${value}T00:00:00`
  );

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}