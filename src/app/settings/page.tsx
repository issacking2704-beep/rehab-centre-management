"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes, deleteObject } from "firebase/storage";
import { auth, db, storage } from "@/lib/firebase";
import { defaultBranding, BrandingSettings, ThemeMode, UiDensity, UiRadius } from "@/components/branding-provider";

export default function SettingsPage() {
  const [settings, setSettings] = useState<BrandingSettings>(defaultBranding);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDoc(doc(db, "settings", "branding"));
        if (snap.exists()) setSettings({ ...defaultBranding, ...snap.data() } as BrandingSettings);
      } catch (error) { console.error("Unable to load branding settings", error); }
    }
    void load();
  }, []);

  useEffect(() => () => { if (logoPreview?.startsWith("blob:")) URL.revokeObjectURL(logoPreview); }, [logoPreview]);

  function update<K extends keyof BrandingSettings>(field: K, value: BrandingSettings[K]) {
    setSettings(current => ({ ...current, [field]: value }));
    setSaved(false);
  }

  async function saveSettings() {
    setSaving(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("AUTH_REQUIRED");
      const response = await fetch("/api/settings/branding", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ settings }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "SETTINGS_SAVE_FAILED");
      }
      localStorage.setItem("rehabCentreSettings", JSON.stringify(settings));
      window.dispatchEvent(new Event("rehab-branding-updated"));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error("Unable to save branding settings", error);
      alert(error instanceof Error ? error.message : "Unable to save settings.");
    } finally { setSaving(false); }
  }

  async function resetSettings() {
    if (!window.confirm("Reset all branding and theme settings to defaults?")) return;
    setSettings(defaultBranding);
    setLogoPreview(null);
    const token = await auth.currentUser?.getIdToken();
    if (!token) { alert("Authentication required."); return; }
    const response = await fetch("/api/settings/branding", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ settings: defaultBranding }),
    });
    if (!response.ok) { alert("Unable to reset settings."); return; }
    localStorage.setItem("rehabCentreSettings", JSON.stringify(defaultBranding));
    window.dispatchEvent(new Event("rehab-branding-updated"));
  }

  async function handleLogo(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Please select an image file."); return; }
    if (file.size > 2 * 1024 * 1024) { alert("Logo must be smaller than 2 MB."); return; }

    if (logoPreview?.startsWith("blob:")) URL.revokeObjectURL(logoPreview);
    setLogoPreview(URL.createObjectURL(file));
    setLogoUploading(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const storageRef = ref(storage, `branding/logo-${Date.now()}-${safeName}`);
      await uploadBytes(storageRef, file, { contentType: file.type });
      update("logo", await getDownloadURL(storageRef));
    } catch (error) {
      console.error("Logo upload failed", error);
      alert("Logo preview is shown, but the upload failed. Check that you are signed in as an admin or super admin.");
    } finally { setLogoUploading(false); }
  }

  async function removeLogo() {
    const previous = settings.logo; update("logo", null);
    if (previous?.includes("/o/")) {
      try { await deleteObject(ref(storage, decodeURIComponent(previous.split("/o/")[1].split("?")[0]))); } catch {}
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b bg-white px-6 py-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div><h1 className="text-2xl font-bold">Branding & Theme</h1><p className="mt-1 text-sm text-slate-500">One place to control your centre identity and the visual theme of the entire app.</p></div>
          <div className="flex gap-3"><button type="button" onClick={resetSettings} className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold hover:bg-slate-50">Reset</button><button type="button" onClick={saveSettings} disabled={saving || logoUploading} className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{saving ? "Saving…" : "💾 Save Changes"}</button></div>
        </div>
        {saved && <div className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">✓ Branding and theme saved.</div>}
      </header>

      <div className="grid gap-6 p-6 xl:grid-cols-[1fr_430px]">
        <section className="space-y-6">
          <SettingsCard title="🏥 Centre Identity" description="These details become the single source of truth across the application and documents.">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Centre Name" value={settings.centreName} onChange={v => update("centreName", v)} />
              <Field label="Tagline" value={settings.tagline} onChange={v => update("tagline", v)} />
              <div className="md:col-span-2"><TextArea label="Full Address" value={settings.address} onChange={v => update("address", v)} /></div>
              <Field label="Phone" value={settings.phone} onChange={v => update("phone", v)} />
              <Field label="Email" value={settings.email} onChange={v => update("email", v)} />
              <Field label="Website" value={settings.website} onChange={v => update("website", v)} />
            </div>
          </SettingsCard>

          <SettingsCard title="🖼️ Logo & App Identity" description="The logo is reused by the sidebar, login, dashboard loading state, documents and browser tab icon.">
            <div className="flex flex-col gap-6 md:flex-row md:items-center">
              <div className="flex h-32 w-32 items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50">
                {logoPreview || settings.logo ? <img src={logoPreview || settings.logo || ""} alt="Centre logo" className="h-full w-full rounded-2xl object-contain p-2" /> : <span className="text-sm text-slate-400">No Logo</span>}
              </div>
              <div className="flex-1"><input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleLogo} disabled={logoUploading} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm disabled:opacity-60" /><p className="mt-2 text-xs text-slate-500">Recommended: square PNG, SVG or WebP with transparent background. Maximum 2 MB.</p>{logoUploading && <p className="mt-2 text-xs font-semibold text-blue-600">Uploading logo…</p>}{(settings.logo || logoPreview) && <button type="button" onClick={removeLogo} disabled={logoUploading} className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50">Remove Logo</button>}</div>
            </div>
          </SettingsCard>

          <SettingsCard title="🎨 Global Theme" description="Change the application appearance from one place. Changes preview instantly; Save makes them persistent.">
            <div className="grid gap-4 sm:grid-cols-3">
              <Choice label="☀️ Light" active={settings.themeMode === "light"} onClick={() => update("themeMode", "light")} />
              <Choice label="🌙 Dark" active={settings.themeMode === "dark"} onClick={() => update("themeMode", "dark")} />
              <Choice label="🖥️ System" active={settings.themeMode === "system"} onClick={() => update("themeMode", "system")} />
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <Select label="Density" value={settings.density} onChange={v => update("density", v as UiDensity)} options={[["comfortable","Comfortable"],["compact","Compact"]]} />
              <Select label="Corner Style" value={settings.radius} onChange={v => update("radius", v as UiRadius)} options={[["rounded","Rounded"],["sharp","Sharp"],["pill","Pill"]]} />
              <Select label="Text Size" value={String(settings.fontScale)} onChange={v => update("fontScale", Number(v))} options={[["0.9","Small"],["1","Default"],["1.1","Large"]]} />
            </div>
            <div className="mt-5 grid gap-5 md:grid-cols-2"><ColorPicker label="Primary Colour" value={settings.primaryColor} onChange={v => update("primaryColor", v)} /><ColorPicker label="Secondary Colour" value={settings.secondaryColor} onChange={v => update("secondaryColor", v)} /></div>
          </SettingsCard>

          <SettingsCard title="🧑‍⚕️ Authorized Signatory" description="Default doctor/signatory information for official documents.">
            <div className="grid gap-4 md:grid-cols-2"><Field label="Doctor / Signatory Name" value={settings.doctorName} onChange={v => update("doctorName", v)} /><Field label="Qualification" value={settings.qualification} onChange={v => update("qualification", v)} /><Field label="Registration Number" value={settings.registrationNo} onChange={v => update("registrationNo", v)} /></div>
          </SettingsCard>

          <SettingsCard title="📄 Document Footer" description="Text displayed at the bottom of official documents."><TextArea label="Footer Text" value={settings.footerText} onChange={v => update("footerText", v)} /></SettingsCard>
        </section>

        <aside className="h-fit xl:sticky xl:top-6"><div className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold">Live Preview</h2><p className="mb-5 text-sm text-slate-500">Preview the app identity and theme before saving.</p>
          <div className="overflow-hidden rounded-2xl border shadow-sm">
            <div className="flex items-center gap-3 p-4" style={{ background: settings.secondaryColor, color: "white" }}>
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl" style={{ background: settings.primaryColor }}>{logoPreview || settings.logo ? <img src={logoPreview || settings.logo || ""} alt="" className="h-full w-full object-contain p-1" /> : "🏥"}</div>
              <div className="min-w-0"><p className="truncate font-bold">{settings.centreName}</p><p className="truncate text-xs opacity-80">{settings.tagline}</p></div>
            </div>
            <div className="space-y-3 p-5"><div className="flex gap-2"><span className="h-9 w-2/3 rounded-lg" style={{ background: settings.primaryColor }} /><span className="h-9 w-1/3 rounded-lg" style={{ background: settings.primaryColor, opacity: .25 }} /></div><div className="h-3 w-2/3 rounded" style={{ background: settings.secondaryColor, opacity: .2 }} /><div className="h-3 w-full rounded bg-slate-200" /><div className="h-3 w-5/6 rounded bg-slate-200" /></div>
            <div className="border-t p-4 text-center text-xs text-slate-500">{settings.footerText}</div>
          </div>
          <div className="mt-5 rounded-xl p-4" style={{ background: `${settings.primaryColor}12` }}><p className="font-semibold" style={{ color: settings.primaryColor }}>Theme preview</p><p className="mt-1 text-xs text-slate-500">Global {settings.themeMode} mode • {settings.density} spacing • {settings.radius} corners</p></div>
        </div></aside>
      </div>
    </main>
  );
}

function SettingsCard({title,description,children}:{title:string;description:string;children:React.ReactNode}) { return <section className="rounded-2xl bg-white p-6 shadow-sm"><h2 className="text-lg font-bold">{title}</h2><p className="mb-6 mt-1 text-sm text-slate-500">{description}</p>{children}</section>; }
function Field({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void}) { return <div><label className="mb-2 block text-sm font-semibold">{label}</label><input value={value} onChange={e=>onChange(e.target.value)} className="w-full rounded-xl border border-slate-200 p-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></div>; }
function TextArea({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void}) { return <div><label className="mb-2 block text-sm font-semibold">{label}</label><textarea rows={4} value={value} onChange={e=>onChange(e.target.value)} className="w-full rounded-xl border border-slate-200 p-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></div>; }
function ColorPicker({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void}) { return <div><label className="mb-2 block text-sm font-semibold">{label}</label><div className="flex gap-3"><input type="color" value={value} onChange={e=>onChange(e.target.value)} className="h-12 w-16 cursor-pointer rounded-lg border p-1" /><input value={value} onChange={e=>onChange(e.target.value)} className="flex-1 rounded-xl border border-slate-200 px-4 outline-none focus:border-blue-500" /></div></div>; }
function Choice({label,active,onClick}:{label:string;active:boolean;onClick:()=>void}) { return <button type="button" onClick={onClick} className="rounded-xl border p-4 text-left font-semibold" style={{ borderColor: active ? "var(--brand-primary)" : undefined, background: active ? "var(--brand-primary-soft)" : undefined, color: active ? "var(--brand-primary)" : undefined }}>{label}</button>; }
function Select({label,value,onChange,options}:{label:string;value:string;onChange:(v:string)=>void;options:string[][]}) { return <label className="block"><span className="mb-2 block text-sm font-semibold">{label}</span><select value={value} onChange={e=>onChange(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white p-3">{options.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>; }
