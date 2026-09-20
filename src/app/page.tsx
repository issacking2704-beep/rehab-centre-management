"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { collection, doc, getCountFromServer, getDocs, getDoc, query, where } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { UserRole, permissions } from "@/lib/permissions";
import { useBranding } from "@/components/branding-provider";

type UserProfile = { name?: string; email?: string; role?: UserRole };

const modules = [
  { name: "Dashboard", icon: "📊", href: "/", permission: "dashboard" },
  { name: "Patients", icon: "🧑‍⚕️", href: "/patients", permission: "patients" },
  { name: "Doctors & Staff", icon: "👨‍⚕️", href: "/staff", permission: "staff" },
  { name: "Attendance", icon: "🕥", href: "/attendance", permission: "attendance" },
  { name: "Vitals", icon: "❤️", href: "/vitals", permission: "vitals" },
  { name: "Payments & Bills", icon: "💰", href: "/bills", permission: "billing" },
  { name: "Invoice Generator", icon: "🧾", href: "/invoice", permission: "invoices" },
  { name: "Letterhead Maker", icon: "📜", href: "/letterhead", permission: "letterhead" },
  { name: "Reports", icon: "📊", href: "/reports", permission: "reports" },
  { name: "Settings", icon: "⚙️", href: "/settings", permission: "settings" },
  { name: "Deleted Patients", icon: "🗑️", href: "/deleted-patients", permission: "deleted_patients" },
];

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ patients: 0, active: 0, attendance: 0, pending: 0 });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const branding = useBranding();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        window.location.replace("/login");
        return;
      }
      setUser(firebaseUser);
      try {
        const snapshot = await getDoc(doc(db, "users", firebaseUser.uid));
        if (!snapshot.exists() || !snapshot.data()?.role) {
          await signOut(auth);
          window.location.replace("/login");
          return;
        }
        const data = snapshot.data() as UserProfile;
        if (data.role === "patient_attender") {
          window.location.replace("/attender");
          return;
        }
        setProfile(data);
      } catch (error) {
        console.error("Failed to load user profile:", error);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    async function loadStats() {
      try {
        const today = new Date().toISOString().split("T")[0];
        const [patients, active, attendance, payments] = await Promise.all([
          getCountFromServer(collection(db, "patients")),
          getCountFromServer(query(collection(db, "patients"), where("status", "==", "Active"))),
          getCountFromServer(query(collection(db, "attendance"), where("date", "==", today), where("status", "==", "Present"))),
          getDocs(collection(db, "payments")),
        ]);
        const pending = payments.docs.reduce((sum, item) => {
          const data = item.data() as { amount?: number; paid?: number };
          return sum + Math.max(0, Number(data.amount || 0) - Number(data.paid || 0));
        }, 0);
        setStats({ patients: patients.data().count, active: active.data().count, attendance: attendance.data().count, pending });
      } catch (error) { console.error("Failed to load dashboard stats", error); }
    }
    loadStats();
  }, []);

  async function handleLogout() {
    await signOut(auth);
    window.location.replace("/login");
  }

  if (loading || !profile || !user) return <main className="flex min-h-screen items-center justify-center bg-slate-100"><div className="text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-blue-600 text-3xl">{branding.logo ? <img src={branding.logo} alt="" className="h-full w-full object-cover p-0" /> : "🏥"}</div><p className="mt-4 text-sm text-slate-500">Loading your dashboard…</p></div></main>;

  const role: UserRole = profile.role ?? "viewer";
  const visibleModules = modules.filter((module) => permissions[role].includes(module.permission));
  const displayRole = role === "super_admin" ? "Super Admin" : role === "admin" ? "Admin" : role === "sub_admin" ? "Sub Admin" : role;

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <aside className={`fixed left-0 top-0 z-30 hidden h-screen bg-slate-950 text-white transition-all duration-200 lg:block ${sidebarCollapsed ? "w-20" : "w-64"}`}>
        <div className={`flex h-20 items-center border-b border-slate-800 ${sidebarCollapsed ? "justify-center px-2" : "px-4"}`}>
          <div className={`flex h-14 ${sidebarCollapsed ? "w-14" : "w-14"} shrink-0 items-center justify-center overflow-hidden rounded-xl bg-blue-600 text-xl`}>
            {branding.logo ? <img src={branding.logo} alt={branding.centreName || "Logo"} className="max-h-full max-w-full object-contain" /> : "🏥"}
          </div>
          {!sidebarCollapsed && <div className="ml-3 min-w-0"><h1 className="truncate font-bold">{branding.centreName}</h1><p className="truncate text-xs text-slate-400">{branding.tagline}</p></div>}
        </div>
        <nav className={`p-3 ${sidebarCollapsed ? "px-2" : "p-4"}`}>
          {visibleModules.map((module) => <Link key={module.name} href={module.href} title={sidebarCollapsed ? module.name : undefined} className={`mb-1 flex w-full items-center rounded-xl py-3 text-slate-300 transition hover:bg-slate-800 hover:text-white ${sidebarCollapsed ? "justify-center px-2" : "gap-3 px-4"}`}><span className="w-6 text-center text-lg">{module.icon}</span>{!sidebarCollapsed && <span className="text-sm font-medium">{module.name}</span>}</Link>)}
        </nav>
        <button type="button" onClick={() => setSidebarCollapsed((value) => !value)} aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"} title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"} className={`absolute bottom-4 flex items-center rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-300 transition hover:bg-slate-800 hover:text-white ${sidebarCollapsed ? "left-1/2 -translate-x-1/2" : "right-4"}`}>
          <span className="text-lg">{sidebarCollapsed ? "→" : "←"}</span>{!sidebarCollapsed && <span className="ml-2 text-xs font-medium">Collapse</span>}
        </button>
      </aside>

      <section className={`transition-all duration-200 ${sidebarCollapsed ? "lg:ml-20" : "lg:ml-64"}`}>
        <header className="flex min-h-20 items-center justify-between border-b bg-white px-6 py-4 shadow-sm"><div><h2 className="text-xl font-bold">Dashboard</h2><p className="text-xs text-slate-500">{branding.tagline}</p></div><div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-sm font-semibold">{profile.name || "User"}</p><p className="text-xs text-slate-500">{displayRole}</p></div><div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">{(profile.name || "U").charAt(0).toUpperCase()}</div><button type="button" onClick={handleLogout} className="rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50">Logout</button></div></header>
        <div className="p-6 sm:p-8">
          <div className="mb-8 rounded-2xl bg-blue-600 p-6 text-white shadow-lg"><p className="text-sm text-blue-100">Welcome back</p><h3 className="mt-1 text-2xl font-bold">{profile.name || "User"}</h3><p className="mt-2 text-sm text-blue-100">You are signed in as <strong>{displayRole}</strong>.</p></div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard title="Total Patients" value={String(stats.patients)} icon="👤" subtitle="Registered patients" /><StatCard title="Active Patients" value={String(stats.active)} icon="🏥" subtitle="Currently admitted" /><StatCard title="Today's Attendance" value={String(stats.attendance)} icon="🕐" subtitle="Staff attendance" /><StatCard title="Pending Bills" value={formatCurrency(stats.pending)} icon="💳" subtitle="Outstanding amount" /></div>
          <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm"><h3 className="font-bold">Quick Actions</h3><p className="mt-1 text-sm text-slate-500">Frequently used actions</p><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{visibleModules.filter((module) => module.permission !== "dashboard").slice(0, 6).map((module) => <Link key={module.name} href={module.href} className="rounded-xl border border-slate-200 p-4 font-semibold hover:border-blue-300 hover:bg-blue-50">{module.icon} {module.name}</Link>)}</div></div>
          <footer className="mt-10 pb-4 text-center text-xs text-slate-400">{branding.centreName} • Version 1.0</footer>
        </div>
      </section>
    </main>
  );
}

function StatCard({ title, value, icon, subtitle }: { title: string; value: string; icon: string; subtitle: string }) {
  return <div className="rounded-2xl bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-sm text-slate-500">{title}</p><p className="mt-2 text-2xl font-bold">{value}</p></div><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl">{icon}</div></div><p className="mt-3 text-xs text-slate-400">{subtitle}</p></div>;
}

function formatCurrency(amount: number) { return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount); }
