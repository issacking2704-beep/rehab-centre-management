"use client";

import { useState } from "react";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "@/lib/firebase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      // Choose how long Firebase keeps the login session
      await setPersistence(
        auth,
        rememberMe
          ? browserLocalPersistence
          : browserSessionPersistence
      );

      // Firebase login
      const credential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      // Find the user's Firestore profile
      const userRef = doc(db, "users", credential.user.uid);
      const userSnapshot = await getDoc(userRef);

      if (!userSnapshot.exists()) {
        await auth.signOut();

        setError(
          "Login successful, but no staff profile exists for this account."
        );

        return;
      }

      const userData = userSnapshot.data();

      if (!userData.role) {
        await auth.signOut();

        setError(
          "Your account does not have a role assigned."
        );

        return;
      }

      // Login successful
      window.location.replace("/");
    } catch (err: any) {
      console.error("LOGIN ERROR:", err);

      if (err?.code === "auth/invalid-credential") {
        setError("Incorrect email or password.");
      } else if (err?.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (err?.code === "auth/too-many-requests") {
        setError(
          "Too many attempts. Please try again later."
        );
      } else if (
        err?.code === "permission-denied"
      ) {
        setError(
          "Firebase denied access to the user profile. We need to configure Firestore security rules."
        );
      } else {
        setError(
          err?.message || "Unable to sign in."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="rounded-3xl bg-white p-8 shadow-xl">

          {/* Logo */}

          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-3xl">
              🏥
            </div>

            <h1 className="mt-5 text-2xl font-bold text-slate-900">
              Rehab Centre
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Management System
            </p>
          </div>

          {/* Form */}

          <div className="mt-8 space-y-5">

            {/* Email */}

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="Enter your email"
                autoComplete="username"
                className="w-full rounded-xl border border-slate-200 p-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Password */}

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                placeholder="Enter your password"
                autoComplete="current-password"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleLogin();
                  }
                }}
                className="w-full rounded-xl border border-slate-200 p-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Remember me */}

            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) =>
                  setRememberMe(e.target.checked)
                }
                className="h-4 w-4"
              />

              <span className="text-sm text-slate-600">
                Remember me
              </span>
            </label>

            {/* Error */}

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Login */}

            <button
              type="button"
              onClick={handleLogin}
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Signing in..."
                : "Sign In"}
            </button>

            {/* Passkey */}

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
              <p className="text-sm font-semibold text-slate-700">
                🔐 Patient Attender Passkey
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Face or fingerprint unlock will be
                enabled after authentication is working.
              </p>
            </div>
          </div>

          <p className="mt-8 text-center text-xs text-slate-400">
            Authorized users only
          </p>

        </div>
      </div>
    </main>
  );
}