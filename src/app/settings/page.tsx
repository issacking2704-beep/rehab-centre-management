"use client";

import { useEffect, useState } from "react";

type BrandingSettings = {
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

const defaultSettings: BrandingSettings = {
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

export default function SettingsPage() {
  const [settings, setSettings] =
    useState<BrandingSettings>(defaultSettings);

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(
        "rehabCentreSettings"
      );

      if (stored) {
        setSettings({
          ...defaultSettings,
          ...JSON.parse(stored),
        });
      }
    } catch {
      console.log("Unable to load saved settings.");
    }
  }, []);

  function updateSetting(
    field: keyof BrandingSettings,
    value: string | null
  ) {
    setSettings((current) => ({
      ...current,
      [field]: value,
    }));

    setSaved(false);
  }

  function saveSettings() {
    localStorage.setItem(
      "rehabCentreSettings",
      JSON.stringify(settings)
    );

    setSaved(true);

    setTimeout(() => {
      setSaved(false);
    }, 3000);
  }

  function resetSettings() {
    const confirmed = window.confirm(
      "Reset all branding settings to the default values?"
    );

    if (!confirmed) return;

    setSettings(defaultSettings);

    localStorage.setItem(
      "rehabCentreSettings",
      JSON.stringify(defaultSettings)
    );
  }

  function handleLogo(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      updateSetting("logo", reader.result as string);
    };

    reader.readAsDataURL(file);
  }

  function removeLogo() {
    updateSetting("logo", null);
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      {/* HEADER */}

      <header className="border-b bg-white px-6 py-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              Settings & Custom Branding
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Configure your rehabilitation centre information,
              logo and document branding.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={resetSettings}
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold hover:bg-slate-50"
            >
              Reset
            </button>

            <button
              type="button"
              onClick={saveSettings}
              className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
            >
              💾 Save Settings
            </button>
          </div>
        </div>

        {saved && (
          <div className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
            ✓ Settings saved successfully.
          </div>
        )}
      </header>

      <div className="grid gap-6 p-6 xl:grid-cols-[1fr_430px]">
        {/* SETTINGS */}

        <section className="space-y-6">
          {/* CENTRE INFORMATION */}

          <SettingsCard
            title="🏥 Centre Information"
            description="These details will be used throughout your management system."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Centre Name"
                value={settings.centreName}
                onChange={(value) =>
                  updateSetting("centreName", value)
                }
              />

              <Field
                label="Tagline"
                value={settings.tagline}
                onChange={(value) =>
                  updateSetting("tagline", value)
                }
              />

              <div className="md:col-span-2">
                <TextArea
                  label="Full Address"
                  value={settings.address}
                  onChange={(value) =>
                    updateSetting("address", value)
                  }
                />
              </div>

              <Field
                label="Phone"
                value={settings.phone}
                onChange={(value) =>
                  updateSetting("phone", value)
                }
              />

              <Field
                label="Email"
                value={settings.email}
                onChange={(value) =>
                  updateSetting("email", value)
                }
              />

              <Field
                label="Website"
                value={settings.website}
                onChange={(value) =>
                  updateSetting("website", value)
                }
              />

             
            </div>
          </SettingsCard>

          {/* LOGO */}

          <SettingsCard
            title="🖼️ Centre Logo"
            description="Upload the logo that should appear on invoices and letterheads."
          >
            <div className="flex flex-col gap-6 md:flex-row md:items-center">
              <div className="flex h-32 w-32 items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50">
                {settings.logo ? (
                  <img
                    src={settings.logo}
                    alt="Centre logo"
                    className="h-full w-full rounded-2xl object-contain p-2"
                  />
                ) : (
                  <span className="text-sm text-slate-400">
                    No Logo
                  </span>
                )}
              </div>

              <div className="flex-1">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleLogo}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm"
                />

                <p className="mt-2 text-xs text-slate-500">
                  Recommended: square PNG or SVG with a transparent
                  background.
                </p>

                {settings.logo && (
                  <button
                    type="button"
                    onClick={removeLogo}
                    className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100"
                  >
                    Remove Logo
                  </button>
                )}
              </div>
            </div>
          </SettingsCard>

          {/* BRAND COLORS */}

          <SettingsCard
            title="🎨 Brand Colours"
            description="Choose the colours used throughout your centre documents."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <ColorPicker
                label="Primary Colour"
                value={settings.primaryColor}
                onChange={(value) =>
                  updateSetting("primaryColor", value)
                }
              />

              <ColorPicker
                label="Secondary Colour"
                value={settings.secondaryColor}
                onChange={(value) =>
                  updateSetting("secondaryColor", value)
                }
              />
            </div>

            <div className="mt-5 rounded-2xl border p-5">
              <p className="mb-3 text-sm font-semibold">
                Colour Preview
              </p>

              <div className="flex flex-wrap gap-3">
                <div
                  className="rounded-xl px-5 py-3 font-semibold text-white"
                  style={{
                    backgroundColor: settings.primaryColor,
                  }}
                >
                  Primary
                </div>

                <div
                  className="rounded-xl px-5 py-3 font-semibold text-white"
                  style={{
                    backgroundColor:
                      settings.secondaryColor,
                  }}
                >
                  Secondary
                </div>

                <div
                  className="rounded-xl border px-5 py-3 font-semibold"
                  style={{
                    borderColor: settings.primaryColor,
                    color: settings.primaryColor,
                  }}
                >
                  Outline
                </div>
              </div>
            </div>
          </SettingsCard>

          {/* SIGNATORY */}

          <SettingsCard
            title="🧑‍⚕️ Authorized Signatory"
            description="Default doctor/signatory information for official documents."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Doctor / Signatory Name"
                value={settings.doctorName}
                onChange={(value) =>
                  updateSetting("doctorName", value)
                }
              />

              <Field
                label="Qualification"
                value={settings.qualification}
                onChange={(value) =>
                  updateSetting("qualification", value)
                }
              />

              <Field
                label="Registration Number"
                value={settings.registrationNo}
                onChange={(value) =>
                  updateSetting("registrationNo", value)
                }
              />
            </div>
          </SettingsCard>

          {/* FOOTER */}

          <SettingsCard
            title="📄 Document Footer"
            description="Text displayed at the bottom of official documents."
          >
            <TextArea
              label="Footer Text"
              value={settings.footerText}
              onChange={(value) =>
                updateSetting("footerText", value)
              }
            />
          </SettingsCard>
        </section>

        {/* LIVE PREVIEW */}

        <aside className="h-fit xl:sticky xl:top-6">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-bold">
                Live Branding Preview
              </h2>

              <p className="text-sm text-slate-500">
                This preview shows how your branding will appear
                on documents.
              </p>
            </div>

            {/* MINI DOCUMENT */}

            <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
              <div
                className="h-2"
                style={{
                  backgroundColor: settings.primaryColor,
                }}
              />

              <div className="p-5">
                <div className="flex items-start gap-3 border-b pb-4">
                  {settings.logo ? (
                    <img
                      src={settings.logo}
                      alt="Logo preview"
                      className="h-14 w-14 object-contain"
                    />
                  ) : (
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-lg text-xs font-bold text-white"
                      style={{
                        backgroundColor:
                          settings.primaryColor,
                      }}
                    >
                      LOGO
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <h3
                      className="truncate text-base font-bold uppercase"
                      style={{
                        color: settings.secondaryColor,
                      }}
                    >
                      {settings.centreName}
                    </h3>

                    <p
                      className="truncate text-xs"
                      style={{
                        color: settings.primaryColor,
                      }}
                    >
                      {settings.tagline}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-1 text-[10px] text-slate-500">
                  <p>{settings.address}</p>

                  <p>
                    {settings.phone} • {settings.email}
                  </p>

                  <p>{settings.website}</p>


                </div>

                <div className="mt-8 space-y-3">
                  <div className="h-2 w-1/3 rounded bg-slate-200" />
                  <div className="h-2 w-full rounded bg-slate-100" />
                  <div className="h-2 w-5/6 rounded bg-slate-100" />
                  <div className="h-2 w-4/5 rounded bg-slate-100" />
                </div>

                <div className="mt-8 rounded-lg p-3"
                  style={{
                    backgroundColor:
                      `${settings.primaryColor}12`,
                  }}
                >
                  <p
                    className="text-xs font-bold"
                    style={{
                      color: settings.primaryColor,
                    }}
                  >
                    Authorized Signatory
                  </p>

                  <p className="mt-1 text-xs font-semibold">
                    {settings.doctorName}
                  </p>

                  <p className="text-[10px] text-slate-500">
                    {settings.qualification}
                  </p>
                </div>

                <div className="mt-8 border-t pt-3 text-center">
                  <p className="text-[9px] text-slate-400">
                    {settings.footerText}
                  </p>
                </div>
              </div>
            </div>

            {/* STATUS */}

            <div className="mt-5 rounded-xl bg-green-50 p-4">
              <p className="text-sm font-semibold text-green-700">
                ✓ Branding ready
              </p>

              <p className="mt-1 text-xs text-green-600">
                Save the settings to store them on this device.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

/* ================= SETTINGS CARD ================= */

function SettingsCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold">{title}</h2>

      <p className="mb-6 mt-1 text-sm text-slate-500">
        {description}
      </p>

      {children}
    </section>
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
          onChange(event.target.value)
        }
        className="w-full rounded-xl border border-slate-200 p-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}

/* ================= TEXT AREA ================= */

function TextArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold">
        {label}
      </label>

      <textarea
        rows={4}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-xl border border-slate-200 p-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}

/* ================= COLOR ================= */

function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold">
        {label}
      </label>

      <div className="flex gap-3">
        <input
          type="color"
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          className="h-12 w-16 cursor-pointer rounded-lg border p-1"
        />

        <input
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          className="flex-1 rounded-xl border border-slate-200 px-4 outline-none focus:border-blue-500"
        />
      </div>
    </div>
  );
}