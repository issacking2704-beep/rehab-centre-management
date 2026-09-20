"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type ThemeMode = "light" | "dark" | "system";
export type UiDensity = "compact" | "comfortable";
export type UiRadius = "sharp" | "rounded" | "pill";

export type BrandingSettings = {
  centreName: string; tagline: string; address: string; phone: string; email: string; website: string;
  primaryColor: string; secondaryColor: string; doctorName: string; qualification: string;
  registrationNo: string; footerText: string; logo: string | null;
  themeMode: ThemeMode; density: UiDensity; radius: UiRadius; fontScale: number;
};

export const defaultBranding: BrandingSettings = {
  centreName: "YOUR REHABILITATION CENTRE", tagline: "Rehabilitation • Recovery • Care",
  address: "Your Centre Address, City, Andhra Pradesh - 000000", phone: "+91 XXXXX XXXXX",
  email: "centre@example.com", website: "www.example.com", primaryColor: "#2563eb",
  secondaryColor: "#0f172a", doctorName: "Dr. Authorized Medical Officer", qualification: "MBBS, MD",
  registrationNo: "", footerText: "Providing professional rehabilitation and patient care.", logo: null,
  themeMode: "light", density: "comfortable", radius: "rounded", fontScale: 1,
};

const STORAGE_KEY = "rehabCentreSettings";
const BrandingContext = createContext<BrandingSettings>(defaultBranding);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<BrandingSettings>(defaultBranding);

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "branding"));
        if (snap.exists()) setSettings({ ...defaultBranding, ...snap.data() } as BrandingSettings);
        else {
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) setSettings({ ...defaultBranding, ...JSON.parse(stored) });
        }
      } catch {
        try {
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) setSettings({ ...defaultBranding, ...JSON.parse(stored) });
        } catch {}
      }
    };
    void load();
    const refresh = () => void load();
    window.addEventListener("rehab-branding-updated", refresh);
    return () => window.removeEventListener("rehab-branding-updated", refresh);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--brand-primary", settings.primaryColor);
    root.style.setProperty("--brand-secondary", settings.secondaryColor);
    root.style.setProperty("--brand-primary-soft", hexToRgba(settings.primaryColor, 0.10));
    root.style.setProperty("--brand-primary-border", hexToRgba(settings.primaryColor, 0.25));
    root.style.setProperty("--brand-font-scale", String(settings.fontScale || 1));
    root.dataset.theme = settings.themeMode;
    root.dataset.density = settings.density;
    root.dataset.radius = settings.radius;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const syncSystem = () => {
      root.classList.toggle("theme-dark", settings.themeMode === "dark" || (settings.themeMode === "system" && media.matches));
    };
    syncSystem();
    media.addEventListener?.("change", syncSystem);

    document.title = settings.centreName || defaultBranding.centreName;
    let icon = document.querySelector<HTMLLinkElement>('link[data-branding-favicon]');
    if (!icon) {
      icon = document.createElement("link");
      icon.rel = "icon";
      icon.dataset.brandingFavicon = "true";
      document.head.appendChild(icon);
    }
    icon.href = settings.logo || "/favicon.ico";
    return () => media.removeEventListener?.("change", syncSystem);
  }, [settings]);

  return <BrandingContext.Provider value={useMemo(() => settings, [settings])}>{children}</BrandingContext.Provider>;
}

export function useBranding() { return useContext(BrandingContext); }

function hexToRgba(hex: string, alpha: number) {
  const value = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return `rgba(37, 99, 235, ${alpha})`;
  const r = parseInt(value.slice(0, 2), 16), g = parseInt(value.slice(2, 4), 16), b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
