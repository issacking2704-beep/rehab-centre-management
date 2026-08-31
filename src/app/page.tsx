"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "@/lib/firebase";
import {
  UserRole,
  permissions,
} from "@/lib/permissions";

type UserProfile = {
  name?: string;
  email?: string;
  role?: UserRole;
};

const modules = [
  {
    name: "Dashboard",
    icon: "📊",
    href: "/",
    permission: "dashboard",
  },
  {
    name: "Patients",
    icon: "🧑‍⚕️",
    href: "/patients",
    permission: "patients",
  },
  {
    name: "Doctors & Staff",
    icon: "👨‍⚕️",
    href: "/staff",
    permission: "staff",
  },
  {
    name: "Attendance",
    icon: "🕥",
    href: "/attendance",
    permission: "attendance",
  },
  {
    name: "Vitals",
    icon: "❤️",
    href: "/vitals",
    permission: "vitals",
  },
  {
    name: "Payments & Bills",
    icon: "💰",
    href: "/billing",
    permission: "billing",
  },
  {
    name: "Invoice Generator",
    icon: "🧾",
    href: "/invoices",
    permission: "invoices",
  },
  {
    name: "Letterhead Maker",
    icon: "📜",
    href: "/letterhead",
    permission: "letterhead",
  },
  {
    name: "Reports",
    icon: "📊",
    href: "/reports",
    permission: "reports",
  },
  {
    name: "Settings",
    icon: "⚙️",
    href: "/settings",
    permission: "settings",
  },
];

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        if (!firebaseUser) {
          window.location.replace("/login");
          return;
        }

        setUser(firebaseUser);

        try {
          const userRef = doc(
            db,
            "users",
            firebaseUser.uid
          );

          const userSnapshot = await getDoc(userRef);

          if (!userSnapshot.exists()) {
            await signOut(auth);
            window.location.replace("/login");
            return;
          }

          const data = userSnapshot.data() as UserProfile;

          if (!data.role) {
            await signOut(auth);
            window.location.replace("/login");
            return;
          }

          setProfile(data);
        } catch (error) {
          console.error(
            "Failed to load user profile:",
            error
          );
        } finally {
          setLoading(false);
        }
      }
    );

    return () => unsubscribe();
  }, []);

  async function handleLogout() {
    try {
      await signOut(auth);
      window.location.replace("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-3xl">
            🏥
          </div>

          <p className="mt-4 text-sm text-slate-500">
            Loading your dashboard...
          </p>
        </div>
      </main>
    );
  }

  if (!user || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-sm text-slate-500">
          Redirecting to login...
        </p>
      </main>
    );
  }

  const role = profile.role ?? "patient_attender";

  const visibleModules = modules.filter((module) =>
    permissions[role]?.includes(module.permission)
  );

  const displayRole =
    role === "super_admin"
      ? "Super Admin"
      : role === "admin"
        ? "Admin"
        : role === "sub_admin"
          ? "Sub Admin"
          : "Patient Attender";

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">

      {/* SIDEBAR */}

      <aside className="fixed left-0 top-0 hidden h-screen w-64 bg-slate-950 text-white lg:block">

        <div className="flex h-20 items-center border-b border-slate-800 px-6">

          <div className="mr-3 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-xl">
            🏥
          </div>

          <div>
            <h1 className="font-bold">
              Rehab Centre
            </h1>

            <p className="text-xs text-slate-400">
              Management System
            </p>
          </div>

        </div>

        <nav className="p-4">

          {visibleModules.map((module) => (
            <Link
              key={module.name}
              href={module.href}
              className="mb-1 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              <span className="w-6 text-lg">
                {module.icon}
              </span>

              <span className="text-sm font-medium">
                {module.name}
              </span>
            </Link>
          ))}

          {permissions[role]?.includes(
            "deleted_patients"
          ) && (
            <div className="mt-6 border-t border-slate-800 pt-4">
              <Link
                href="/deleted-patients"
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-red-300 transition hover:bg-red-950"
              >
                <span>🗑️</span>

                <span className="text-sm font-medium">
                  Deleted Patients
                </span>
              </Link>
            </div>
          )}

        </nav>
      </aside>

      {/* MAIN */}

      <section className="lg:ml-64">

        {/* HEADER */}

        <header className="flex min-h-20 items-center justify-between border-b bg-white px-6 py-4 shadow-sm">

          <div>
            <h2 className="text-xl font-bold">
              Dashboard
            </h2>

            <p className="text-xs text-slate-500">
              Rehab Centre Management System
            </p>
          </div>

          <div className="flex items-center gap-3">

            <button
              className="rounded-xl border px-3 py-2"
              type="button"
            >
              🔔
            </button>

            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">
                {profile.name || "User"}
              </p>

              <p className="text-xs text-slate-500">
                {displayRole}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
              {(profile.name || "U")
                .charAt(0)
                .toUpperCase()}
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
            >
              Logout
            </button>

          </div>

        </header>

        {/* CONTENT */}

        <div className="p-6 sm:p-8">

          {/* WELCOME */}

          <div className="mb-8 rounded-2xl bg-blue-600 p-6 text-white shadow-lg">

            <p className="text-sm text-blue-100">
              Welcome back
            </p>

            <h3 className="mt-1 text-2xl font-bold">
              {profile.name || "User"}
            </h3>

            <p className="mt-2 text-sm text-blue-100">
              You are signed in as{" "}
              <strong>{displayRole}</strong>.
            </p>

          </div>

          {/* STATS */}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

            <StatCard
              title="Total Patients"
              value="128"
              icon="👤"
              subtitle="Registered patients"
            />

            <StatCard
              title="Active Patients"
              value="42"
              icon="🏥"
              subtitle="Currently admitted"
            />

            <StatCard
              title="Today's Attendance"
              value="17"
              icon="🕐"
              subtitle="Staff attendance"
            />

            <StatCard
              title="Pending Bills"
              value="₹24,850"
              icon="💳"
              subtitle="Outstanding amount"
            />

          </div>

          {/* RECENT PATIENTS + QUICK ACTIONS */}

          <div className="mt-8 grid gap-6 xl:grid-cols-3">

            <section className="rounded-2xl bg-white p-6 shadow-sm xl:col-span-2">

              <h3 className="font-bold">
                Recent Patients
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Latest patient registrations
              </p>

              <div className="mt-5 overflow-x-auto">

                <table className="w-full min-w-[600px] text-left text-sm">

                  <thead>
                    <tr className="border-b text-xs uppercase text-slate-500">
                      <th className="pb-3">
                        Patient
                      </th>

                      <th className="pb-3">
                        ID
                      </th>

                      <th className="pb-3">
                        Status
                      </th>

                      <th className="pb-3">
                        Admission
                      </th>
                    </tr>
                  </thead>

                  <tbody>

                    <PatientRow
                      name="Demo Patient 1"
                      id="RC-00128"
                      status="Active"
                      date="29 Aug 2026"
                    />

                    <PatientRow
                      name="Demo Patient 2"
                      id="RC-00127"
                      status="Active"
                      date="28 Aug 2026"
                    />

                    <PatientRow
                      name="Demo Patient 3"
                      id="RC-00126"
                      status="Discharged"
                      date="27 Aug 2026"
                    />

                  </tbody>

                </table>

              </div>

            </section>

            <section className="rounded-2xl bg-white p-6 shadow-sm">

              <h3 className="font-bold">
                Quick Actions
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Frequently used actions
              </p>

              <div className="mt-5 grid gap-3">

                {permissions[role]?.includes(
                  "patients"
                ) && (
                  <QuickAction
                    href="/patients"
                    icon="👤"
                    text="Patient Management"
                  />
                )}

                {permissions[role]?.includes(
                  "vitals"
                ) && (
                  <QuickAction
                    href="/vitals"
                    icon="❤️"
                    text="Record Vitals"
                  />
                )}

                {permissions[role]?.includes(
                  "attendance"
                ) && (
                  <QuickAction
                    href="/attendance"
                    icon="🕐"
                    text="Staff Attendance"
                  />
                )}

                {permissions[role]?.includes(
                  "invoices"
                ) && (
                  <QuickAction
                    href="/invoices"
                    icon="🧾"
                    text="Create Invoice"
                  />
                )}

                {permissions[role]?.includes(
                  "billing"
                ) && (
                  <QuickAction
                    href="/billing"
                    icon="💳"
                    text="Payments & Bills"
                  />
                )}

              </div>

            </section>

          </div>

          {/* ALERTS */}

          <div className="mt-6 grid gap-6 md:grid-cols-2">

            <section className="rounded-2xl bg-white p-6 shadow-sm">

              <h3 className="font-bold">
                ❤️ Vitals Alerts
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Patients requiring attention
              </p>

              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">

                <p className="font-semibold text-amber-800">
                  No active alerts
                </p>

                <p className="mt-1 text-sm text-amber-700">
                  Abnormal vitals will appear here.
                </p>

              </div>

            </section>

            <section className="rounded-2xl bg-white p-6 shadow-sm">

              <h3 className="font-bold">
                💳 Recent Payments
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Latest payment activity
              </p>

              <div className="mt-5 rounded-xl border border-slate-200 p-4">
                No payments recorded yet.
              </div>

            </section>

          </div>

          <footer className="mt-10 pb-4 text-center text-xs text-slate-400">
            Rehab Centre Management System • Version 1.0
          </footer>

        </div>

      </section>

    </main>
  );
}

function StatCard({
  title,
  value,
  icon,
  subtitle,
}: {
  title: string;
  value: string;
  icon: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">

      <div className="flex items-start justify-between">

        <div>
          <p className="text-sm text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-2xl font-bold">
            {value}
          </p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl">
          {icon}
        </div>

      </div>

      <p className="mt-3 text-xs text-slate-400">
        {subtitle}
      </p>

    </div>
  );
}

function PatientRow({
  name,
  id,
  status,
  date,
}: {
  name: string;
  id: string;
  status: string;
  date: string;
}) {
  return (
    <tr className="border-b last:border-0">

      <td className="py-4 font-medium">
        {name}
      </td>

      <td className="py-4 text-slate-500">
        {id}
      </td>

      <td className="py-4">

        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            status === "Active"
              ? "bg-green-100 text-green-700"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {status}
        </span>

      </td>

      <td className="py-4 text-slate-500">
        {date}
      </td>

    </tr>
  );
}

function QuickAction({
  href,
  icon,
  text,
}: {
  href: string;
  icon: string;
  text: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-medium transition hover:border-blue-300 hover:bg-blue-50"
    >
      <span className="text-lg">
        {icon}
      </span>

      {text}
    </Link>
  );
}