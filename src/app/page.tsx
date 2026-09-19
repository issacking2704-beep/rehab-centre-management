"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
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
  { name: "Payments & Bills", icon: "💰", href: "/billing", permission: "billing" },
  { name: "Invoice Generator", icon: "🧾", href: "/invoices", permission: "invoices" },
  { name: "Letterhead Maker", icon: "📜", href: "/letterhead", permission: "letterhead" },
  { name: "Reports", icon: "📊", href: "/reports", permission: "reports" },
  { name: "Settings", icon: "⚙️", href: "/settings", permission: "settings" },
];

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
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

  async function handleLogout() {
    await signOut(auth);
    window.location.replace("/login");
  }

  if (loading || !profile || !user) return <main className="flex min-h-screen items-center justify-center bg-slate-100"><div className="text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-blue-600 text-3xl">{branding.logo ? <img src={branding.logo} alt="" className="h-full w-full object-contain p-2" /> : "🏥"}</div><p className="mt-4 text-sm text-slate-500">Loading your dashboard…</p></div></main>;

  const role: UserRole = profile.role ?? "viewer";
  const visibleModules = modules.filter((module) => permissions[role].includes(module.permission));
  const displayRole = role === "super_admin" ? "Super Admin" : role === "admin" ? "Admin" : role === "sub_admin" ? "Sub Admin" : role;

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <aside className="fixed left-0 top-0 hidden h-screen w-64 bg-slate-950 text-white lg:block">
        <div className="flex h-20 items-center border-b border-slate-800 px-6"><div className="mr-3 flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-blue-600 text-xl">{branding.logo ? <img src={branding.logo} alt="" className="h-full w-full object-contain p-1" /> : "🏥"}</div><div><h1 className="font-bold">{branding.centreName}</h1><p className="text-xs text-slate-400">{branding.tagline}</p></div></div>
        <nav className="p-4">{visibleModules.map((module) => <Link key={module.name} href={module.href} className="mb-1 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-slate-300 transition hover:bg-slate-800 hover:text-white"><span className="w-6 text-lg">{module.icon}</span><span className="text-sm font-medium">{module.name}</span></Link>)}</nav>
      </aside>

      <section className="lg:ml-64">
        <header className="flex min-h-20 items-center justify-between border-b bg-white px-6 py-4 shadow-sm"><div><h2 className="text-xl font-bold">Dashboard</h2><p className="text-xs text-slate-500">{branding.tagline}</p></div><div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-sm font-semibold">{profile.name || "User"}</p><p className="text-xs text-slate-500">{displayRole}</p></div><div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">{(profile.name || "U").charAt(0).toUpperCase()}</div><button type="button" onClick={handleLogout} className="rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50">Logout</button></div></header>
        <div className="p-6 sm:p-8">
          <div className="mb-8 rounded-2xl bg-blue-600 p-6 text-white shadow-lg"><p className="text-sm text-blue-100">Welcome back</p><h3 className="mt-1 text-2xl font-bold">{profile.name || "User"}</h3><p className="mt-2 text-sm text-blue-100">You are signed in as <strong>{displayRole}</strong>.</p></div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard title="Total Patients" value="128" icon="👤" subtitle="Registered patients" /><StatCard title="Active Patients" value="42" icon="🏥" subtitle="Currently admitted" /><StatCard title="Today's Attendance" value="17" icon="🕐" subtitle="Staff attendance" /><StatCard title="Pending Bills" value="₹24,850" icon="💳" subtitle="Outstanding amount" /></div>
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
