"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  onAuthStateChanged,
  User,
} from "firebase/auth";

import { auth } from "@/lib/firebase";

type StaffRole =
  | "admin"
  | "sub_admin"
  | "patient_attender"
  | "super_admin";

type Staff = {
  uid: string;
  name: string;
  email: string;
  role: StaffRole | string;
  phone: string;
  active: boolean;
  createdAt: string;
};

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  sub_admin: "Sub Admin",
  patient_attender: "Patient Attender",
};

function roleStyle(role: string) {
  switch (role) {
    case "super_admin":
      return "bg-purple-100 text-purple-700";

    case "admin":
      return "bg-blue-100 text-blue-700";

    case "sub_admin":
      return "bg-amber-100 text-amber-700";

    case "patient_attender":
      return "bg-green-100 text-green-700";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

function formatDate(value: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString();
}

export default function StaffPage() {
  const [user, setUser] =
    useState<User | null>(null);

  const [authLoading, setAuthLoading] =
    useState(true);

  const [loading, setLoading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [staff, setStaff] =
    useState<Staff[]>([]);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [roleFilter, setRoleFilter] =
    useState<"all" | StaffRole>("all");

  const [showAdd, setShowAdd] =
    useState(false);

  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [role, setRole] =
    useState<StaffRole>("patient_attender");

  /*
   * Firebase authentication listener.
   *
   * IMPORTANT:
   * We don't call the API until Firebase
   * tells us who is logged in.
   */
  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        (currentUser) => {
          setUser(currentUser);
          setAuthLoading(false);
        }
      );

    return () => unsubscribe();
  }, []);

  /*
   * Load staff after authentication.
   */
  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      setStaff([]);
      setError(
        "You must be logged in to view staff."
      );
      return;
    }

    loadStaff(user);
  }, [user, authLoading]);

  async function loadStaff(
    currentUser: User = user as User
  ) {
    if (!currentUser) {
      setError(
        "You must be logged in to view staff."
      );
      return;
    }

    try {
      setLoading(true);
      setError("");

      /*
       * Get a fresh Firebase ID token.
       */
      const token =
        await currentUser.getIdToken(true);

      if (!token) {
        throw new Error(
          "Unable to obtain authentication token."
        );
      }

      const response =
        await fetch("/api/staff", {
          method: "GET",
          headers: {
            Authorization:
              `Bearer ${token}`,
            "Content-Type":
              "application/json",
          },
          cache: "no-store",
        });

      const text =
        await response.text();

      let data: any = {};

      try {
        data = text
          ? JSON.parse(text)
          : {};
      } catch {
        console.error(
          "API returned non-JSON:",
          text
        );

        throw new Error(
          "The server returned an invalid response. Check the terminal for the API error."
        );
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            `Failed to load staff (${response.status})`
        );
      }

      setStaff(
        Array.isArray(data.staff)
          ? data.staff
          : []
      );
    } catch (err: any) {
      console.error(
        "loadStaff:",
        err
      );

      setError(
        err?.message ||
          "Failed to load staff."
      );
    } finally {
      setLoading(false);
    }
  }

  async function addStaff(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!user) {
      setError(
        "You must be logged in."
      );
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const token =
        await user.getIdToken(true);

      const response =
        await fetch("/api/staff", {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${token}`,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            name,
            email,
            password,
            phone,
            role,
          }),
        });

      const text =
        await response.text();

      let data: any = {};

      try {
        data = text
          ? JSON.parse(text)
          : {};
      } catch {
        throw new Error(
          "The server returned an invalid response."
        );
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to create staff account."
        );
      }

      setMessage(
        data.message ||
          "Staff account created successfully."
      );

      setName("");
      setEmail("");
      setPassword("");
      setPhone("");
      setRole("patient_attender");

      setShowAdd(false);

      await loadStaff(user);
    } catch (err: any) {
      console.error(
        "addStaff:",
        err
      );

      setError(
        err?.message ||
          "Failed to create staff account."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleStaff(
    uid: string,
    active: boolean
  ) {
    if (!user) {
      setError(
        "You must be logged in."
      );
      return;
    }

    try {
      setError("");
      setMessage("");

      const token =
        await user.getIdToken(true);

      const response =
        await fetch("/api/staff", {
          method: "PATCH",
          headers: {
            Authorization:
              `Bearer ${token}`,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            uid,
            active: !active,
          }),
        });

      const text =
        await response.text();

      let data: any = {};

      try {
        data = text
          ? JSON.parse(text)
          : {};
      } catch {
        throw new Error(
          "The server returned an invalid response."
        );
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to update staff."
        );
      }

      setMessage(
        data.message ||
          "Staff account updated."
      );

      await loadStaff(user);
    } catch (err: any) {
      console.error(
        "toggleStaff:",
        err
      );

      setError(
        err?.message ||
          "Failed to update staff."
      );
    }
  }

  async function deleteStaff(
    uid: string,
    staffName: string
  ) {
    if (!user) {
      setError(
        "You must be logged in."
      );
      return;
    }

    const confirmed =
      window.confirm(
        `Delete ${staffName || "this staff account"}? This cannot be undone.`
      );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setMessage("");

      const token =
        await user.getIdToken(true);

      const response =
        await fetch("/api/staff", {
          method: "DELETE",
          headers: {
            Authorization:
              `Bearer ${token}`,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            uid,
          }),
        });

      const text =
        await response.text();

      let data: any = {};

      try {
        data = text
          ? JSON.parse(text)
          : {};
      } catch {
        throw new Error(
          "The server returned an invalid response."
        );
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to delete staff."
        );
      }

      setMessage(
        data.message ||
          "Staff account deleted."
      );

      await loadStaff(user);
    } catch (err: any) {
      console.error(
        "deleteStaff:",
        err
      );

      setError(
        err?.message ||
          "Failed to delete staff."
      );
    }
  }

  const filteredStaff =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return staff.filter(
        (person) => {
          const matchesSearch =
            !query ||
            person.name
              .toLowerCase()
              .includes(query) ||
            person.email
              .toLowerCase()
              .includes(query) ||
            person.phone
              .toLowerCase()
              .includes(query);

          const matchesRole =
            roleFilter === "all" ||
            person.role === roleFilter;

          return (
            matchesSearch &&
            matchesRole
          );
        }
      );
    }, [
      staff,
      search,
      roleFilter,
    ]);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-2xl">
              👨‍⚕️
            </div>

            <div>
              <h1 className="text-2xl font-bold">
                Doctors & Staff
              </h1>

              <p className="text-sm text-slate-500">
                Manage staff accounts and access roles
              </p>
            </div>
          </div>

          {user && (
            <button
              onClick={() => {
                setShowAdd(true);
                setError("");
                setMessage("");
              }}
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              + Add Staff
            </button>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-7xl p-6">
        {message && (
          <div className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
            ✅ {message}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <strong>⚠️ Error:</strong>{" "}
            {error}
          </div>
        )}

        {authLoading ? (
          <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
            <div className="text-4xl">
              🔐
            </div>

            <p className="mt-3 text-sm text-slate-500">
              Checking session...
            </p>
          </div>
        ) : !user ? (
          <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
            <div className="text-5xl">
              🔒
            </div>

            <h2 className="mt-4 text-xl font-bold">
              Login required
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Please log in before opening the staff management page.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                title="Total Staff"
                value={staff.length}
                icon="👥"
              />

              <Stat
                title="Admins"
                value={
                  staff.filter(
                    (s) =>
                      s.role ===
                        "admin" ||
                      s.role ===
                        "super_admin"
                  ).length
                }
                icon="🛡️"
              />

              <Stat
                title="Sub Admins"
                value={
                  staff.filter(
                    (s) =>
                      s.role ===
                      "sub_admin"
                  ).length
                }
                icon="👨‍💼"
              />

              <Stat
                title="Patient Attenders"
                value={
                  staff.filter(
                    (s) =>
                      s.role ===
                      "patient_attender"
                  ).length
                }
                icon="🧑‍⚕️"
              />
            </div>

            <section className="rounded-2xl bg-white shadow-sm">
              <div className="border-b p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="font-bold">
                      Staff Accounts
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      {filteredStaff.length}{" "}
                      staff member
                      {filteredStaff.length ===
                      1
                        ? ""
                        : "s"}{" "}
                      shown
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                      value={search}
                      onChange={(e) =>
                        setSearch(
                          e.target.value
                        )
                      }
                      placeholder="Search name, email or phone..."
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 sm:w-72"
                    />

                    <select
                      value={roleFilter}
                      onChange={(e) =>
                        setRoleFilter(
                          e.target
                            .value as
                            | "all"
                            | StaffRole
                        )
                      }
                      className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
                    >
                      <option value="all">
                        All Roles
                      </option>

                      <option value="super_admin">
                        Super Admin
                      </option>

                      <option value="admin">
                        Admin
                      </option>

                      <option value="sub_admin">
                        Sub Admin
                      </option>

                      <option value="patient_attender">
                        Patient Attender
                      </option>
                    </select>

                    <button
                      onClick={() =>
                        loadStaff(user)
                      }
                      className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium hover:bg-slate-50"
                    >
                      ↻ Refresh
                    </button>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="p-12 text-center">
                  <div className="text-3xl">
                    ⏳
                  </div>

                  <p className="mt-3 text-sm text-slate-500">
                    Loading staff...
                  </p>
                </div>
              ) : filteredStaff.length ===
                0 ? (
                <div className="p-12 text-center">
                  <div className="text-5xl">
                    👥
                  </div>

                  <h3 className="mt-4 font-semibold">
                    No staff found
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    {search ||
                    roleFilter !==
                      "all"
                      ? "Try changing your search or filter."
                      : "Create your first staff account."}
                  </p>

                  {!search &&
                    roleFilter ===
                      "all" && (
                      <button
                        onClick={() =>
                          setShowAdd(true)
                        }
                        className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                      >
                        + Add Staff
                      </button>
                    )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[850px] text-left text-sm">
                    <thead>
                      <tr className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <th className="px-5 py-4">
                          Staff
                        </th>

                        <th className="px-5 py-4">
                          Role
                        </th>

                        <th className="px-5 py-4">
                          Phone
                        </th>

                        <th className="px-5 py-4">
                          Status
                        </th>

                        <th className="px-5 py-4">
                          Created
                        </th>

                        <th className="px-5 py-4 text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredStaff.map(
                        (person) => {
                          const active =
                            person.active !==
                            false;

                          return (
                            <tr
                              key={
                                person.uid
                              }
                              className="border-b last:border-0 hover:bg-slate-50"
                            >
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                                    {person.name
                                      ?.charAt(
                                        0
                                      )
                                      ?.toUpperCase() ||
                                      "?"}
                                  </div>

                                  <div>
                                    <p className="font-semibold">
                                      {person.name ||
                                        "Unnamed Staff"}
                                    </p>

                                    <p className="text-xs text-slate-500">
                                      {
                                        person.email
                                      }
                                    </p>
                                  </div>
                                </div>
                              </td>

                              <td className="px-5 py-4">
                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-semibold ${roleStyle(
                                    person.role
                                  )}`}
                                >
                                  {roleLabels[
                                    person.role
                                  ] ||
                                    person.role}
                                </span>
                              </td>

                              <td className="px-5 py-4 text-slate-500">
                                {person.phone ||
                                  "—"}
                              </td>

                              <td className="px-5 py-4">
                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                    active
                                      ? "bg-green-100 text-green-700"
                                      : "bg-red-100 text-red-700"
                                  }`}
                                >
                                  {active
                                    ? "Active"
                                    : "Disabled"}
                                </span>
                              </td>

                              <td className="px-5 py-4 text-slate-500">
                                {formatDate(
                                  person.createdAt
                                )}
                              </td>

                              <td className="px-5 py-4">
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() =>
                                      toggleStaff(
                                        person.uid,
                                        active
                                      )
                                    }
                                    className="rounded-lg border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                                  >
                                    {active
                                      ? "Disable"
                                      : "Enable"}
                                  </button>

                                  {person.role !==
                                    "super_admin" && (
                                    <button
                                      onClick={() =>
                                        deleteStaff(
                                          person.uid,
                                          person.name
                                        )
                                      }
                                      className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                                    >
                                      Delete
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        }
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b p-6">
              <div>
                <h2 className="text-xl font-bold">
                  Add Staff Account
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Create a new staff login.
                </p>
              </div>

              <button
                onClick={() =>
                  setShowAdd(false)
                }
                className="rounded-lg px-3 py-2 text-xl text-slate-500 hover:bg-slate-100"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={addStaff}
              className="space-y-5 p-6"
            >
              <Input
                label="Full Name"
                value={name}
                onChange={setName}
                placeholder="Enter staff name"
                required
              />

              <Input
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="staff@example.com"
                required
              />

              <Input
                label="Password"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="Minimum 6 characters"
                required
              />

              <Input
                label="Phone Number"
                value={phone}
                onChange={setPhone}
                placeholder="Optional"
              />

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Staff Role
                </label>

                <select
                  value={role}
                  onChange={(e) =>
                    setRole(
                      e.target
                        .value as StaffRole
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                >
                  <option value="admin">
                    Admin
                  </option>

                  <option value="sub_admin">
                    Sub Admin
                  </option>

                  <option value="patient_attender">
                    Patient Attender
                  </option>
                </select>
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                <strong>
                  🔐 Account security
                </strong>

                <p className="mt-1 text-xs leading-5">
                  Passwords are handled by Firebase Authentication and are not stored in Firestore.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    setShowAdd(false)
                  }
                  className="flex-1 rounded-xl border border-slate-300 px-4 py-3 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Creating..."
                    : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

function Stat({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-3xl font-bold">
            {value}
          </p>
        </div>

        <div className="text-3xl">
          {icon}
        </div>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        placeholder={placeholder}
        required={required}
        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
      />
    </div>
  );
}