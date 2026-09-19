"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, deleteDoc, doc, getDocs, addDoc, updateDoc, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

type Staff = {
  id: string;
  employeeId: string;
  name: string;
  role: string;
  status?: string;
};

type AttendanceRecord = {
  id: string;
  staffId: string;
  employeeId: string;
  staffName: string;
  role: string;
  date: string;
  status: "Present" | "Absent" | "Leave" | "Late";
  checkIn: string;
  checkOut: string;
  notes: string;
};

const STAFF_KEY = "rehab-centre-staff";
const ATTENDANCE_KEY = "rehab-centre-attendance";

const emptyForm = {
  staffId: "",
  date: "",
  status: "Present" as
    | "Present"
    | "Absent"
    | "Leave"
    | "Late",
  checkIn: "",
  checkOut: "",
  notes: "",
};

export default function AttendancePage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [records, setRecords] =
    useState<AttendanceRecord[]>([]);

  const [form, setForm] =
    useState(emptyForm);

  const [showForm, setShowForm] =
    useState(false);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [selectedDate, setSelectedDate] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("All");

  const [selectedRecord, setSelectedRecord] =
    useState<AttendanceRecord | null>(null);

  const [loaded, setLoaded] =
    useState(false);

  /* ================= LOAD ================= */

  useEffect(() => {
    async function loadData() {
      try {
        const [staffSnap, attendanceSnap] = await Promise.all([
          getDocs(collection(db, "staff")),
          getDocs(query(collection(db, "attendance"), orderBy("date", "desc"))),
        ]);
        setStaff(staffSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Staff)));
        setRecords(attendanceSnap.docs.map((d) => ({ id: d.id, ...d.data() } as AttendanceRecord)));
      } catch (error) {
        console.error("Unable to load attendance data", error);
      }
    }
    void loadData();

    const today = new Date()
      .toISOString()
      .split("T")[0];

    setSelectedDate(today);

    setForm((current) => ({
      ...current,
      date: today,
    }));

    setLoaded(true);
  }, []);

  /* ================= SAVE ================= */

  useEffect(() => {
    if (!loaded) return;

    localStorage.setItem(
      ATTENDANCE_KEY,
      JSON.stringify(records)
    );
  }, [records, loaded]);

  /* ================= FILTER ================= */

  const filteredRecords = useMemo(() => {
    const query =
      search.toLowerCase().trim();

    return records.filter((record) => {
      const matchesDate =
        !selectedDate ||
        record.date === selectedDate;

      const matchesStatus =
        statusFilter === "All" ||
        record.status === statusFilter;

      const matchesSearch =
        !query ||
        [
          record.staffName,
          record.employeeId,
          record.role,
          record.notes,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);

      return (
        matchesDate &&
        matchesStatus &&
        matchesSearch
      );
    });
  }, [
    records,
    selectedDate,
    statusFilter,
    search,
  ]);

  /* ================= TODAY ================= */

  const today = new Date()
    .toISOString()
    .split("T")[0];

  const todayRecords = records.filter(
    (record) => record.date === today
  );

  const presentToday =
    todayRecords.filter(
      (record) =>
        record.status === "Present"
    ).length;

  const absentToday =
    todayRecords.filter(
      (record) =>
        record.status === "Absent"
    ).length;

  const leaveToday =
    todayRecords.filter(
      (record) =>
        record.status === "Leave"
    ).length;

  const lateToday =
    todayRecords.filter(
      (record) =>
        record.status === "Late"
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
      checkIn: now
        .toTimeString()
        .slice(0, 5),
    });

    setShowForm(true);
    setSelectedRecord(null);
  }

  function openEditForm(
    record: AttendanceRecord
  ) {
    setEditingId(record.id);

    setForm({
      staffId: record.staffId,
      date: record.date,
      status: record.status,
      checkIn: record.checkIn,
      checkOut: record.checkOut,
      notes: record.notes,
    });

    setShowForm(true);
    setSelectedRecord(null);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);

    setForm({
      ...emptyForm,
      date: selectedDate || today,
    });
  }

  /* ================= SAVE ================= */

  async function saveAttendance() {
    if (!form.staffId) {
      alert("Please select a staff member.");
      return;
    }

    if (!form.date) {
      alert("Please select a date.");
      return;
    }

    const member = staff.find(
      (item) => item.id === form.staffId
    );

    if (!member) {
      alert("Staff member not found.");
      return;
    }

    /*
     * Prevent duplicate attendance for the
     * same staff member on the same date.
     */

    const duplicate =
      records.find(
        (record) =>
          record.staffId ===
            form.staffId &&
          record.date === form.date &&
          record.id !== editingId
      );

    if (duplicate) {
      alert(
        `${member.name} already has an attendance record for ${formatDate(
          form.date
        )}. Edit the existing record instead.`
      );
      return;
    }

    if (editingId) {
      const updated = { staffId: member.id, employeeId: member.employeeId, staffName: member.name, role: member.role, date: form.date, status: form.status, checkIn: form.checkIn, checkOut: form.checkOut, notes: form.notes };
      await updateDoc(doc(db, "attendance", editingId), updated);
      setRecords((current) => current.map((record) => record.id === editingId ? { ...record, ...updated } : record));

      closeForm();
      return;
    }

    const newRecord: AttendanceRecord = {
      id: `ATT-${Date.now()}`,
      staffId: member.id,
      employeeId:
        member.employeeId,
      staffName: member.name,
      role: member.role,
      date: form.date,
      status: form.status,
      checkIn: form.checkIn,
      checkOut: form.checkOut,
      notes: form.notes,
    };

    const created = await addDoc(collection(db, "attendance"), { ...newRecord, createdAt: new Date().toISOString() });
    setRecords((current) => [{ ...newRecord, id: created.id }, ...current]);

    closeForm();
  }

  /* ================= DELETE ================= */

  async function deleteAttendance(
    record: AttendanceRecord
  ) {
    const confirmed =
      window.confirm(
        `Delete attendance for ${record.staffName} on ${formatDate(
          record.date
        )}?`
      );

    if (!confirmed) return;

    await deleteDoc(doc(db, "attendance", record.id));
    setRecords((current) => current.filter((item) => item.id !== record.id));

    setSelectedRecord(null);
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      {/* HEADER */}

      <header className="border-b bg-white px-6 py-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">
              🕒
            </span>

            <div>
              <h1 className="text-2xl font-bold">
                Staff Attendance
              </h1>

              <p className="text-sm text-slate-500">
                Track daily attendance, leave and
                working hours.
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
              disabled={staff.length === 0}
              className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              + Mark Attendance
            </button>
          </div>
        </div>
      </header>

      <div className="space-y-6 p-6">
        {/* STATISTICS */}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            icon="👥"
            title="Staff"
            value={staff.length}
          />

          <StatCard
            icon="🟢"
            title="Present"
            value={presentToday}
          />

          <StatCard
            icon="🔴"
            title="Absent"
            value={absentToday}
          />

          <StatCard
            icon="🟡"
            title="Leave"
            value={leaveToday}
          />

          <StatCard
            icon="🕒"
            title="Late"
            value={lateToday}
          />
        </div>

        {/* FILTERS */}

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-semibold">
                Date
              </label>

              <input
                type="date"
                value={selectedDate}
                onChange={(event) =>
                  setSelectedDate(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-blue-500"
              />
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
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search staff..."
                  className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Status
              </label>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-200 p-3 outline-none"
              >
                <option value="All">
                  All Statuses
                </option>

                <option value="Present">
                  Present
                </option>

                <option value="Absent">
                  Absent
                </option>

                <option value="Leave">
                  Leave
                </option>

                <option value="Late">
                  Late
                </option>
              </select>
            </div>
          </div>
        </section>

        {/* FORM */}

        {showForm && (
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  {editingId
                    ? "Edit Attendance"
                    : "Mark Attendance"}
                </h2>

                <p className="text-sm text-slate-500">
                  Record the staff member's attendance
                  for the selected date.
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
              {/* STAFF */}

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Staff Member *
                </label>

                <select
                  value={form.staffId}
                  onChange={(event) =>
                    updateField(
                      "staffId",
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-blue-500"
                >
                  <option value="">
                    Select Staff
                  </option>

                  {staff
                    .filter(
                      (member) =>
                        member.status !==
                        "Inactive"
                    )
                    .map((member) => (
                      <option
                        key={member.id}
                        value={member.id}
                      >
                        {member.name} —{" "}
                        {member.role}
                      </option>
                    ))}
                </select>
              </div>

              {/* DATE */}

              <Field
                label="Date *"
                type="date"
                value={form.date}
                onChange={(value) =>
                  updateField(
                    "date",
                    value
                  )
                }
              />

              {/* STATUS */}

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Attendance Status *
                </label>

                <select
                  value={form.status}
                  onChange={(event) =>
                    updateField(
                      "status",
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-blue-500"
                >
                  <option value="Present">
                    🟢 Present
                  </option>

                  <option value="Absent">
                    🔴 Absent
                  </option>

                  <option value="Leave">
                    🟡 Leave
                  </option>

                  <option value="Late">
                    🕒 Late
                  </option>
                </select>
              </div>

              {/* CHECK IN */}

              <Field
                label="Check-in Time"
                type="time"
                value={form.checkIn}
                onChange={(value) =>
                  updateField(
                    "checkIn",
                    value
                  )
                }
              />

              {/* CHECK OUT */}

              <Field
                label="Check-out Time"
                type="time"
                value={form.checkOut}
                onChange={(value) =>
                  updateField(
                    "checkOut",
                    value
                  )
                }
              />

              {/* NOTES */}

              <div className="md:col-span-2 lg:col-span-3">
                <label className="mb-2 block text-sm font-semibold">
                  Notes
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
                  placeholder="Optional attendance notes..."
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
                onClick={saveAttendance}
                className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
              >
                {editingId
                  ? "Save Changes"
                  : "Save Attendance"}
              </button>
            </div>
          </section>
        )}

        {/* NO STAFF WARNING */}

        {staff.length === 0 && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-bold text-amber-800">
                  No staff members found
                </h2>

                <p className="mt-1 text-sm text-amber-700">
                  Add doctors or staff first before
                  marking attendance.
                </p>
              </div>

              <a
                href="/staff"
                className="rounded-xl bg-blue-600 px-5 py-3 text-center font-semibold text-white"
              >
                Go to Doctors & Staff
              </a>
            </div>
          </section>
        )}

        {/* ATTENDANCE TABLE */}

        <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="border-b px-6 py-5">
            <h2 className="text-lg font-bold">
              Attendance Records
            </h2>

            <p className="text-sm text-slate-500">
              {selectedDate
                ? formatDate(selectedDate)
                : "All dates"}{" "}
              • {filteredRecords.length} record
              {filteredRecords.length === 1
                ? ""
                : "s"}
            </p>
          </div>

          {/* DESKTOP */}

          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <th className="px-6 py-4">
                    Staff
                  </th>

                  <th className="px-6 py-4">
                    Role
                  </th>

                  <th className="px-6 py-4">
                    Status
                  </th>

                  <th className="px-6 py-4">
                    Check-in
                  </th>

                  <th className="px-6 py-4">
                    Check-out
                  </th>

                  <th className="px-6 py-4">
                    Notes
                  </th>

                  <th className="px-6 py-4">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredRecords.map(
                  (record) => (
                    <AttendanceRow
                      key={record.id}
                      record={record}
                      onView={() =>
                        setSelectedRecord(
                          record
                        )
                      }
                      onEdit={() =>
                        openEditForm(
                          record
                        )
                      }
                      onDelete={() =>
                        deleteAttendance(
                          record
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
            {filteredRecords.map(
              (record) => (
                <AttendanceCard
                  key={record.id}
                  record={record}
                  onView={() =>
                    setSelectedRecord(
                      record
                    )
                  }
                  onEdit={() =>
                    openEditForm(
                      record
                    )
                  }
                  onDelete={() =>
                    deleteAttendance(
                      record
                    )
                  }
                />
              )
            )}
          </div>

          {/* EMPTY */}

          {filteredRecords.length ===
            0 && (
            <div className="p-12 text-center">
              <div className="text-6xl">
                🕒
              </div>

              <h3 className="mt-4 text-lg font-bold">
                No attendance records
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                No attendance has been recorded for
                this date.
              </p>

              {staff.length > 0 && (
                <button
                  type="button"
                  onClick={openAddForm}
                  className="mt-5 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white"
                >
                  + Mark Attendance
                </button>
              )}
            </div>
          )}
        </section>
      </div>

      {/* DETAILS MODAL */}

      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase text-blue-600">
                  Attendance Record
                </p>

                <h2 className="text-xl font-bold">
                  {selectedRecord.staffName}
                </h2>

                <p className="text-sm text-slate-500">
                  {selectedRecord.employeeId}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedRecord(
                    null
                  )
                }
                className="rounded-lg px-3 py-2 text-xl hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-5 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoBox
                  label="Date"
                  value={formatDate(
                    selectedRecord.date
                  )}
                />

                <InfoBox
                  label="Role"
                  value={
                    selectedRecord.role
                  }
                />

                <InfoBox
                  label="Status"
                  value={
                    selectedRecord.status
                  }
                />

                <InfoBox
                  label="Check-in"
                  value={
                    selectedRecord.checkIn ||
                    "—"
                  }
                />

                <InfoBox
                  label="Check-out"
                  value={
                    selectedRecord.checkOut ||
                    "—"
                  }
                />
              </div>

              <div>
                <p className="text-sm font-bold">
                  Notes
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
                    openEditForm(
                      selectedRecord
                    )
                  }
                  className="rounded-xl border border-slate-200 px-5 py-3 font-semibold"
                >
                  ✏️ Edit
                </button>

                <button
                  type="button"
                  onClick={() =>
                    deleteAttendance(
                      selectedRecord
                    )
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

/* ================= STAT CARD ================= */

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

/* ================= FIELD ================= */

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
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

/* ================= TABLE ROW ================= */

function AttendanceRow({
  record,
  onView,
  onEdit,
  onDelete,
}: {
  record: AttendanceRecord;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <tr className="border-b last:border-0 hover:bg-slate-50">
      <td className="px-6 py-4">
        <button
          type="button"
          onClick={onView}
          className="text-left"
        >
          <p className="font-bold hover:text-blue-600">
            {record.staffName}
          </p>

          <p className="text-xs text-slate-500">
            {record.employeeId}
          </p>
        </button>
      </td>

      <td className="px-6 py-4 text-sm">
        {record.role}
      </td>

      <td className="px-6 py-4">
        <StatusBadge
          status={record.status}
        />
      </td>

      <td className="px-6 py-4 text-sm">
        {record.checkIn || "—"}
      </td>

      <td className="px-6 py-4 text-sm">
        {record.checkOut || "—"}
      </td>

      <td className="max-w-xs px-6 py-4 text-sm text-slate-500">
        <span className="line-clamp-2">
          {record.notes || "—"}
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

/* ================= MOBILE CARD ================= */

function AttendanceCard({
  record,
  onView,
  onEdit,
  onDelete,
}: {
  record: AttendanceRecord;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-2xl border p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-bold">
            {record.staffName}
          </p>

          <p className="text-xs text-slate-500">
            {record.employeeId}
          </p>
        </div>

        <StatusBadge
          status={record.status}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <InfoBox
          label="Role"
          value={record.role}
        />

        <InfoBox
          label="Date"
          value={formatDate(
            record.date
          )}
        />

        <InfoBox
          label="Check-in"
          value={
            record.checkIn || "—"
          }
        />

        <InfoBox
          label="Check-out"
          value={
            record.checkOut || "—"
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

/* ================= STATUS ================= */

function StatusBadge({
  status,
}: {
  status: AttendanceRecord["status"];
}) {
  const styles = {
    Present:
      "bg-green-50 text-green-700",
    Absent:
      "bg-red-50 text-red-700",
    Leave:
      "bg-amber-50 text-amber-700",
    Late:
      "bg-blue-50 text-blue-700",
  };

  const icons = {
    Present: "🟢",
    Absent: "🔴",
    Leave: "🟡",
    Late: "🕒",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold ${styles[status]}`}
    >
      {icons[status]} {status}
    </span>
  );
}

/* ================= INFO ================= */

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

function formatDate(value: string) {
  if (!value) return "—";

  const date = new Date(
    `${value}T00:00:00`
  );

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}