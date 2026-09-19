"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type BrandingSettings = {
  centreName: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  primaryColor: string;
  secondaryColor: string;
  doctorName: string;
  qualification: string;
  registrationNo: string;
  footerText: string;
  logo: string | null;
};

export const defaultBranding: BrandingSettings = {
  centreName: "YOUR REHABILITATION CENTRE",
  tagline: "Rehabilitation • Recovery • Care",
  address: "Your Centre Address, City, Andhra Pradesh - 000000",
  phone: "+91 XXXXX XXXXX",
  email: "centre@example.com",
  website: "www.example.com",
  primaryColor: "#2563eb",
  secondaryColor: "#0f172a",
  doctorName: "Dr. Authorized Medical Officer",
  qualification: "MBBS, MD",
  registrationNo: "",
  footerText: "Providing professional rehabilitation and patient care.",
  logo: null,
};

const STORAGE_KEY = "rehabCentreSettings";
const BrandingContext = createContext<BrandingSettings>(defaultBranding);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<BrandingSettings>(defaultBranding);

  useEffect(() => {
    const load = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          setSettings({ ...defaultBranding, ...JSON.parse(stored) });
        }
      } catch {
        // Keep safe defaults when stored branding is invalid.
      }
    };

    load();
    window.addEventListener("rehab-branding-updated", load);
    return () => window.removeEventListener("rehab-branding-updated", load);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--brand-primary", settings.primaryColor);
    root.style.setProperty("--brand-secondary", settings.secondaryColor);
    root.style.setProperty("--brand-primary-soft", hexToRgba(settings.primaryColor, 0.10));
    root.style.setProperty("--brand-primary-border", hexToRgba(settings.primaryColor, 0.25));
    document.title = settings.centreName || defaultBranding.centreName;
  }, [settings]);

  const value = useMemo(() => settings, [settings]);
  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  return useContext(BrandingContext);
}

function hexToRgba(hex: string, alpha: number) {
  const value = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return `rgba(37, 99, 235, ${alpha})`;
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
