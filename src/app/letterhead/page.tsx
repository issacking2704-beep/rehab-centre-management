"use client";

import { useState } from "react";

export default function LetterheadPage() {
  const [centreName, setCentreName] = useState(
    "YOUR REHABILITATION CENTRE"
  );

  const [tagline, setTagline] = useState(
    "Rehabilitation • Recovery • Care"
  );

  const [address, setAddress] = useState(
    "Your Centre Address, City, Andhra Pradesh - 000000"
  );

  const [phone, setPhone] = useState("+91 XXXXX XXXXX");
  const [email, setEmail] = useState("centre@example.com");
  const [website, setWebsite] = useState("www.example.com");

  const [doctorName, setDoctorName] = useState(
    "Dr. Authorized Medical Officer"
  );

  const [qualification, setQualification] = useState(
    "MBBS, MD"
  );

  const [registrationNo, setRegistrationNo] = useState("");

  const [referenceNo, setReferenceNo] = useState(
    `REF-${new Date().getFullYear()}-001`
  );

  const [date, setDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [recipient, setRecipient] = useState("");

  const [subject, setSubject] = useState(
    "Subject: "
  );

  const [content, setContent] = useState(
    "To Whom It May Concern,\n\nThis letter is to certify that the above-mentioned patient has received / is receiving rehabilitation services at our centre.\n\nPlease contact us for any further information or clarification.\n\nThank you."
  );

  const [logo, setLogo] = useState<string | null>(null);

  function handleLogo(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      setLogo(reader.result as string);
    };

    reader.readAsDataURL(file);
  }

  function printLetter() {
    window.print();
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      {/* HEADER */}

      <header className="no-print border-b bg-white px-6 py-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              Letterhead Maker
            </h1>

            <p className="text-sm text-slate-500">
              Create professional A4 letters using your centre branding.
            </p>
          </div>

          <button
            type="button"
            onClick={printLetter}
            className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
          >
            🖨️ Print / Save PDF
          </button>
        </div>
      </header>

      <div className="no-print grid gap-6 p-6 xl:grid-cols-[420px_1fr]">
        {/* SETTINGS */}

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">
            Letter Settings
          </h2>

          <p className="mb-6 text-sm text-slate-500">
            Customize your centre information and letter.
          </p>

          {/* CENTRE */}

          <div>
            <h3 className="mb-3 font-semibold text-blue-700">
              Centre Branding
            </h3>

            <div className="space-y-3">
              <Field
                label="Centre Name"
                value={centreName}
                onChange={setCentreName}
              />

              <Field
                label="Tagline"
                value={tagline}
                onChange={setTagline}
              />

              <TextArea
                label="Address"
                value={address}
                onChange={setAddress}
              />

              <Field
                label="Phone"
                value={phone}
                onChange={setPhone}
              />

              <Field
                label="Email"
                value={email}
                onChange={setEmail}
              />

              <Field
                label="Website"
                value={website}
                onChange={setWebsite}
              />

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Centre Logo
                </label>

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogo}
                  className="w-full rounded-xl border p-3 text-sm"
                />
              </div>
            </div>
          </div>

          {/* DOCTOR */}

          <div className="mt-6 border-t pt-6">
            <h3 className="mb-3 font-semibold text-blue-700">
              Authorized Signatory
            </h3>

            <div className="space-y-3">
              <Field
                label="Doctor / Signatory Name"
                value={doctorName}
                onChange={setDoctorName}
              />

              <Field
                label="Qualification"
                value={qualification}
                onChange={setQualification}
              />

              <Field
                label="Registration Number"
                value={registrationNo}
                onChange={setRegistrationNo}
              />
            </div>
          </div>

          {/* LETTER */}

          <div className="mt-6 border-t pt-6">
            <h3 className="mb-3 font-semibold text-blue-700">
              Letter Details
            </h3>

            <div className="space-y-3">
              <Field
                label="Reference Number"
                value={referenceNo}
                onChange={setReferenceNo}
              />

              <DateField
                label="Date"
                value={date}
                onChange={setDate}
              />

              <Field
                label="Recipient"
                value={recipient}
                onChange={setRecipient}
                placeholder="Recipient name / organization"
              />

              <Field
                label="Subject"
                value={subject}
                onChange={setSubject}
              />

              <TextArea
                label="Letter Content"
                value={content}
                onChange={setContent}
                rows={10}
              />
            </div>
          </div>
        </section>

        {/* INFORMATION */}

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">
            Letterhead Preview
          </h2>

          <p className="mb-5 text-sm text-slate-500">
            The final A4 letter is shown below.
          </p>

          <div className="rounded-xl bg-slate-100 p-5">
            <p className="text-sm text-slate-500">
              A4 preview →
            </p>
          </div>
        </section>
      </div>

      {/* ================= A4 LETTER ================= */}

      <section className="letter-page mx-auto my-6 min-h-[297mm] w-[210mm] bg-white p-[15mm] shadow-xl">
        {/* TOP BRANDING */}

        <div className="border-b-2 border-slate-900 pb-5">
          <div className="flex items-start justify-between gap-8">
            <div className="flex items-start gap-4">
              {logo ? (
                <img
                  src={logo}
                  alt="Centre Logo"
                  className="h-20 w-20 object-contain"
                />
              ) : (
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 text-xs text-slate-400">
                  LOGO
                </div>
              )}

              <div>
                <h1 className="text-2xl font-bold uppercase tracking-wide">
                  {centreName}
                </h1>

                <p className="mt-1 text-sm font-medium text-slate-500">
                  {tagline}
                </p>
              </div>
            </div>

            <div className="text-right text-xs leading-5 text-slate-600">
              <p>{address}</p>

              <p>
                {phone}
                {email && ` • ${email}`}
              </p>

              <p>{website}</p>
            </div>
          </div>
        </div>

        {/* REFERENCE / DATE */}

        <div className="mt-7 flex justify-between text-sm">
          <div>
            <span className="font-bold">Ref No:</span>{" "}
            {referenceNo}
          </div>

          <div>
            <span className="font-bold">Date:</span>{" "}
            {formatDate(date)}
          </div>
        </div>

        {/* RECIPIENT */}

        {recipient && (
          <div className="mt-8">
            <p className="text-sm font-semibold">
              To,
            </p>

            <p className="mt-1 whitespace-pre-line text-sm">
              {recipient}
            </p>
          </div>
        )}

        {/* SUBJECT */}

        <div className="mt-7">
          <p className="font-bold underline">
            {subject}
          </p>
        </div>

        {/* CONTENT */}

        <div className="mt-7 min-h-[145mm] whitespace-pre-line text-[14px] leading-7">
          {content}
        </div>

        {/* SIGNATURE */}

        <div className="mt-10">
          <p className="text-sm">
            Yours faithfully,
          </p>

          <div className="mt-10 w-64">
            <div className="border-b border-slate-400 pb-2">
              {/* Signature space */}
            </div>

            <p className="mt-2 font-bold">
              {doctorName}
            </p>

            <p className="text-sm text-slate-600">
              {qualification}
            </p>

            {registrationNo && (
              <p className="text-xs text-slate-500">
                Registration No: {registrationNo}
              </p>
            )}

            <p className="mt-1 text-xs font-semibold">
              Authorized Signatory
            </p>
          </div>
        </div>

        {/* FOOTER */}

        <div className="mt-10 border-t pt-4 text-center">
          <p className="text-[10px] text-slate-400">
            {centreName} • {phone} • {email}
          </p>

          <p className="mt-1 text-[10px] text-slate-400">
            This document is computer-generated.
          </p>
        </div>
      </section>

      {/* PRINT STYLES */}

      <style jsx global>{`
        @page {
          size: A4;
          margin: 0;
        }

        @media print {
          body {
            background: white !important;
          }

          .no-print {
            display: none !important;
          }

          .letter-page {
            width: 210mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            padding: 15mm !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </main>
  );
}

/* ================= FIELD ================= */

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold">
        {label}
      </label>

      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-blue-500"
      />
    </div>
  );
}

/* ================= TEXT AREA ================= */

function TextArea({
  label,
  value,
  onChange,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold">
        {label}
      </label>

      <textarea
        rows={rows}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-blue-500"
      />
    </div>
  );
}

/* ================= DATE ================= */

function DateField({
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

      <input
        type="date"
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-xl border border-slate-200 p-3"
      />
    </div>
  );
}

/* ================= DATE FORMAT ================= */

function formatDate(value: string) {
  if (!value) return "—";

  const date = new Date(`${value}T00:00:00`);

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}