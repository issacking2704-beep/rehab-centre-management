"use client";

import { useState } from "react";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence,
  signInWithCustomToken,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { recordAudit } from "@/lib/audit";
import { useBranding } from "@/components/branding-provider";

type Mode = "staff" | "attender";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("staff");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passkey, setPasskey] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const branding = useBranding();

  async function handleStaffLogin() {
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const snapshot = await getDoc(doc(db, "users", credential.user.uid));
      const loginUser = snapshot.data();
      void recordAudit({ action: "login", module: "authentication", recordId: credential.user.uid, description: "User signed in successfully.", metadata: { role: typeof loginUser?.role === "string" ? loginUser.role : null } });
      if (!snapshot.exists() || !snapshot.data()?.role) {
        await auth.signOut();
        setError("No valid staff profile exists for this account.");
        return;
      }
      window.location.replace("/");
    } catch (err: any) {
      console.error("STAFF LOGIN ERROR:", err);
      if (err?.code === "auth/invalid-credential") setError("Incorrect email or password.");
      else if (err?.code === "auth/invalid-email") setError("Please enter a valid email address.");
      else if (err?.code === "auth/too-many-requests") setError("Too many attempts. Please try again later.");
      else setError(err?.message || "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAttenderLogin() {
    const cleanPasskey = passkey.trim();
    if (!cleanPasskey) {
      setError("Please enter your Patient Attender passkey.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      const response = await fetch("/api/patient-attender/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passkey: cleanPasskey }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Invalid passkey.");
      await signInWithCustomToken(auth, data.customToken);
      window.location.replace("/");
    } catch (err: any) {
      console.error("PASSKEY LOGIN ERROR:", err);
      setError(err?.message || "Unable to sign in with passkey.");
    } finally {
      setLoading(false);
    }
  }

  const submit = mode === "staff" ? handleStaffLogin : handleAttenderLogin;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="rounded-3xl bg-white p-8 shadow-xl">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-blue-600 text-3xl">{branding.logo ? <img src={branding.logo} alt="" className="h-full w-full object-cover p-0" /> : "🏥"}</div>
            <h1 className="mt-5 text-2xl font-bold text-slate-900">{branding.centreName}</h1>
            <p className="mt-1 text-sm text-slate-500">{branding.tagline}</p>
          </div>

          <div className="mt-7 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
            <button type="button" onClick={() => { setMode("staff"); setError(""); }} className={`rounded-lg px-3 py-2.5 text-sm font-semibold ${mode === "staff" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}>Staff Login</button>
            <button type="button" onClick={() => { setMode("attender"); setError(""); }} className={`rounded-lg px-3 py-2.5 text-sm font-semibold ${mode === "attender" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}>🔐 Attender Passkey</button>
          </div>

          <div className="mt-7 space-y-5">
            {mode === "staff" ? (
              <>
                <Field label="Email" value={email} onChange={setEmail} type="email" placeholder="Enter your email" />
                <Field label="Password" value={password} onChange={setPassword} type="password" placeholder="Enter your password" onEnter={submit} />
              </>
            ) : (
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Patient Attender Passkey</label>
                <input
                  value={passkey}
                  onChange={(event) => setPasskey(event.target.value.toUpperCase())}
                  onKeyDown={(event) => { if (event.key === "Enter") submit(); }}
                  placeholder="PA-XXXX-XXXX-XXXX"
                  autoComplete="one-time-code"
                  className="w-full rounded-xl border border-slate-200 p-3 font-mono tracking-widest outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                <p className="mt-2 text-xs text-slate-500">Use the passkey provided by an Admin. It opens only your assigned patient view.</p>
              </div>
            )}

            <label className="flex cursor-pointer items-center gap-3">
              <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} className="h-4 w-4" />
              <span className="text-sm text-slate-600">Remember me</span>
            </label>

            {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

            <button type="button" onClick={submit} disabled={loading} className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
              {loading ? "Signing in…" : mode === "staff" ? "Sign In" : "Unlock Assigned Patients"}
            </button>
          </div>

          {mode === "attender" && <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4 text-center text-xs text-blue-800">🔒 Your passkey is not displayed or stored in the browser. Only assigned patient data is returned after authentication.</div>}
          <p className="mt-8 text-center text-xs text-slate-400">Authorized users only</p>
        </div>
      </div>
    </main>
  );
}

function Field({ label, value, onChange, type, placeholder, onEnter }: { label: string; value: string; onChange: (value: string) => void; type: string; placeholder: string; onEnter?: () => void }) {
  const inputId = `login-${label.toLowerCase()}`;
  return <div><label htmlFor={inputId} className="mb-2 block text-sm font-semibold text-slate-700">{label}</label><input id={inputId} aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} type={type} placeholder={placeholder} autoComplete={type === "password" ? "current-password" : "email"} onKeyDown={(event) => { if (event.key === "Enter") onEnter?.(); }} className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></div>;
}
