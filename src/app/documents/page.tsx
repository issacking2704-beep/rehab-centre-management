"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Patient = {
  id: string;
  name: string;
  age: string;
  gender: string;
  phone: string;
  address: string;
  emergencyContact: string;
  admissionDate: string;
  dischargeDate: string;
  diagnosis: string;
  therapist: string;
  room: string;
  notes: string;
  createdAt: string;
};

type DocumentType =
  | "discharge"
  | "emergency"
  | "acknowledgement"
  | "treatment"
  | "admission"
  | "custom";

const PATIENTS_KEY = "rehab-centre-patients";

function today() {
  return new Date().toISOString().split("T")[0];
}

function generateDocumentNumber(type: DocumentType) {
  const prefix =
    type === "discharge"
      ? "DS"
      : type === "emergency"
        ? "ER"
        : type === "acknowledgement"
          ? "ACK"
          : type === "treatment"
            ? "TS"
            : type === "admission"
              ? "ADM"
              : "DOC";

  return `RC-${prefix}-${Date.now()
    .toString()
    .slice(-8)}`;
}

function formatDate(value: string) {
  if (!value) return "";

  return new Date(`${value}T00:00:00`).toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  );
}

export default function DocumentsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] =
    useState("");

  const [documentType, setDocumentType] =
    useState<DocumentType>("discharge");

  const [documentNumber, setDocumentNumber] = useState(
    generateDocumentNumber("discharge")
  );

  const [documentDate, setDocumentDate] =
    useState(today());

  const [centreName, setCentreName] = useState(
    "REHABILITATION CENTRE"
  );

  const [centreAddress, setCentreAddress] = useState(
    "Centre Address • Phone • Email"
  );

  const [doctorName, setDoctorName] = useState("");
  const [staffName, setStaffName] = useState("");

  const [diagnosis, setDiagnosis] = useState("");
  const [treatmentSummary, setTreatmentSummary] =
    useState("");

  const [progress, setProgress] = useState("");
  const [condition, setCondition] = useState("");
  const [instructions, setInstructions] = useState("");
  const [followUp, setFollowUp] = useState("");

  const [eventDescription, setEventDescription] =
    useState("");
  const [actionsTaken, setActionsTaken] = useState("");
  const [referralDetails, setReferralDetails] =
    useState("");
  const [notificationDetails, setNotificationDetails] =
    useState("");

  const [customTitle, setCustomTitle] =
    useState("OFFICIAL LETTER");

  const [customBody, setCustomBody] = useState("");

  const [acknowledgementText, setAcknowledgementText] =
    useState(
      "I acknowledge that the information relating to the above matter has been explained to me and that I have had an opportunity to ask questions."
    );

  const [showEditor, setShowEditor] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PATIENTS_KEY);

      if (saved) {
        const parsed = JSON.parse(saved);

        if (Array.isArray(parsed)) {
          setPatients(parsed);
        }
      }
    } catch (error) {
      console.error("Unable to load patients", error);
    }
  }, []);

  const selectedPatient = useMemo(
    () =>
      patients.find(
        (patient) => patient.id === selectedPatientId
      ),
    [patients, selectedPatientId]
  );

  function chooseDocumentType(type: DocumentType) {
    setDocumentType(type);
    setDocumentNumber(generateDocumentNumber(type));

    if (type === "discharge") {
      setCustomTitle("DISCHARGE SUMMARY");
    }

    if (type === "emergency") {
      setCustomTitle("EMERGENCY / SERIOUS EVENT RECORD");
    }

    if (type === "acknowledgement") {
      setCustomTitle("PATIENT / ATTENDER ACKNOWLEDGEMENT");
    }

    if (type === "treatment") {
      setCustomTitle("TREATMENT SUMMARY");
    }

    if (type === "admission") {
      setCustomTitle("ADMISSION DOCUMENT");
    }

    if (type === "custom") {
      setCustomTitle("OFFICIAL LETTER");
    }
  }

  function choosePatient(id: string) {
    setSelectedPatientId(id);

    const patient = patients.find(
      (item) => item.id === id
    );

    if (!patient) return;

    setDiagnosis(patient.diagnosis || "");

    if (patient.admissionDate) {
      setDocumentDate(patient.admissionDate);
    }

    setTreatmentSummary("");
    setProgress("");
    setCondition("");
    setInstructions("");
    setFollowUp("");
  }

  function printDocument() {
    window.print();
  }

  return (
    <main className="min-h-screen bg-slate-100 print:bg-white">
      <div className="mx-auto max-w-7xl p-4 sm:p-6 print:hidden">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-600">
              DOCUMENT MANAGEMENT
            </p>

            <h1 className="mt-1 text-3xl font-bold text-slate-900">
              Documents & Letters
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Create formal centre documents using reusable
              templates.
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              href="/reports/patient-files"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
            >
              📂 Patient Files
            </Link>

            <Link
              href="/"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
            >
              ← Dashboard
            </Link>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <section className="space-y-5">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="font-bold text-slate-900">
                Document Type
              </h2>

              <div className="mt-4 grid gap-2">
                {[
                  ["discharge", "📋 Discharge Sheet"],
                  [
                    "emergency",
                    "🚑 Emergency / Serious Event",
                  ],
                  [
                    "acknowledgement",
                    "📝 Patient Acknowledgement",
                  ],
                  ["treatment", "🏥 Treatment Summary"],
                  ["admission", "📄 Admission Document"],
                  ["custom", "✍️ Custom Letter"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      chooseDocumentType(
                        value as DocumentType
                      )
                    }
                    className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold ${
                      documentType === value
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="font-bold text-slate-900">
                Patient
              </h2>

              <select
                value={selectedPatientId}
                onChange={(event) =>
                  choosePatient(event.target.value)
                }
                className="mt-4 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
              >
                <option value="">
                  Select patient...
                </option>

                {patients.map((patient) => (
                  <option
                    key={patient.id}
                    value={patient.id}
                  >
                    {patient.id} — {patient.name}
                  </option>
                ))}
              </select>

              {patients.length === 0 && (
                <p className="mt-3 text-xs text-amber-600">
                  Add patients from the Patients module first.
                </p>
              )}
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-bold text-slate-900">
                  Document Details
                </h2>

                <button
                  type="button"
                  onClick={() =>
                    setShowEditor(!showEditor)
                  }
                  className="text-sm font-semibold text-blue-600"
                >
                  {showEditor ? "Hide" : "Edit"}
                </button>
              </div>

              {showEditor && (
                <div className="space-y-4">
                  <Field
                    label="Centre Name"
                    value={centreName}
                    onChange={setCentreName}
                  />

                  <Field
                    label="Centre Address / Contact"
                    value={centreAddress}
                    onChange={setCentreAddress}
                  />

                  <Field
                    label="Document Title"
                    value={customTitle}
                    onChange={setCustomTitle}
                  />

                  <Field
                    label="Document Number"
                    value={documentNumber}
                    onChange={setDocumentNumber}
                  />

                  <div>
                    <label className="mb-1 block text-sm font-semibold">
                      Document Date
                    </label>

                    <input
                      type="date"
                      value={documentDate}
                      onChange={(event) =>
                        setDocumentDate(event.target.value)
                      }
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                    />
                  </div>

                  <Field
                    label="Doctor"
                    value={doctorName}
                    onChange={setDoctorName}
                  />

                  <Field
                    label="Staff / Centre Representative"
                    value={staffName}
                    onChange={setStaffName}
                  />

                  <Field
                    label="Diagnosis"
                    value={diagnosis}
                    onChange={setDiagnosis}
                  />

                  <TextArea
                    label="Treatment / Rehabilitation Provided"
                    value={treatmentSummary}
                    onChange={setTreatmentSummary}
                  />

                  {documentType === "discharge" && (
                    <>
                      <TextArea
                        label="Clinical / Functional Progress"
                        value={progress}
                        onChange={setProgress}
                      />

                      <TextArea
                        label="Condition at Discharge"
                        value={condition}
                        onChange={setCondition}
                      />

                      <TextArea
                        label="Instructions / Medications"
                        value={instructions}
                        onChange={setInstructions}
                      />

                      <TextArea
                        label="Follow-up Recommendations"
                        value={followUp}
                        onChange={setFollowUp}
                      />
                    </>
                  )}

                  {documentType === "emergency" && (
                    <>
                      <TextArea
                        label="Description of Emergency / Serious Event"
                        value={eventDescription}
                        onChange={setEventDescription}
                      />

                      <TextArea
                        label="Immediate Actions Taken"
                        value={actionsTaken}
                        onChange={setActionsTaken}
                      />

                      <TextArea
                        label="Referral / Transfer Details"
                        value={referralDetails}
                        onChange={setReferralDetails}
                      />

                      <TextArea
                        label="Family / Attender Notification"
                        value={notificationDetails}
                        onChange={setNotificationDetails}
                      />

                      <TextArea
                        label="Acknowledgement Text"
                        value={acknowledgementText}
                        onChange={setAcknowledgementText}
                      />
                    </>
                  )}

                  {documentType === "acknowledgement" && (
                    <TextArea
                      label="Acknowledgement Text"
                      value={acknowledgementText}
                      onChange={setAcknowledgementText}
                    />
                  )}

                  {documentType === "custom" && (
                    <TextArea
                      label="Letter Content"
                      value={customBody}
                      onChange={setCustomBody}
                      rows={10}
                    />
                  )}
                </div>
              )}
            </div>
          </section>

          <section>
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                onClick={printDocument}
                className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                🖨️ Print / Save PDF
              </button>
            </div>

            <DocumentPreview
              type={documentType}
              patient={selectedPatient}
              centreName={centreName}
              centreAddress={centreAddress}
              title={customTitle}
              documentNumber={documentNumber}
              documentDate={documentDate}
              doctorName={doctorName}
              staffName={staffName}
              diagnosis={diagnosis}
              treatmentSummary={treatmentSummary}
              progress={progress}
              condition={condition}
              instructions={instructions}
              followUp={followUp}
              eventDescription={eventDescription}
              actionsTaken={actionsTaken}
              referralDetails={referralDetails}
              notificationDetails={notificationDetails}
              acknowledgementText={acknowledgementText}
              customBody={customBody}
            />
          </section>
        </div>
      </div>

      <div className="hidden print:block">
        <DocumentPreview
          type={documentType}
          patient={selectedPatient}
          centreName={centreName}
          centreAddress={centreAddress}
          title={customTitle}
          documentNumber={documentNumber}
          documentDate={documentDate}
          doctorName={doctorName}
          staffName={staffName}
          diagnosis={diagnosis}
          treatmentSummary={treatmentSummary}
          progress={progress}
          condition={condition}
          instructions={instructions}
          followUp={followUp}
          eventDescription={eventDescription}
          actionsTaken={actionsTaken}
          referralDetails={referralDetails}
          notificationDetails={notificationDetails}
          acknowledgementText={acknowledgementText}
          customBody={customBody}
        />
      </div>
    </main>
  );
}

function Field({
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
      <label className="mb-1 block text-sm font-semibold text-slate-700">
        {label}
      </label>

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
      />
    </div>
  );
}

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
      <label className="mb-1 block text-sm font-semibold text-slate-700">
        {label}
      </label>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        className="w-full resize-y rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
      />
    </div>
  );
}

function DocumentPreview({
  type,
  patient,
  centreName,
  centreAddress,
  title,
  documentNumber,
  documentDate,
  doctorName,
  staffName,
  diagnosis,
  treatmentSummary,
  progress,
  condition,
  instructions,
  followUp,
  eventDescription,
  actionsTaken,
  referralDetails,
  notificationDetails,
  acknowledgementText,
  customBody,
}: {
  type: DocumentType;
  patient?: Patient;
  centreName: string;
  centreAddress: string;
  title: string;
  documentNumber: string;
  documentDate: string;
  doctorName: string;
  staffName: string;
  diagnosis: string;
  treatmentSummary: string;
  progress: string;
  condition: string;
  instructions: string;
  followUp: string;
  eventDescription: string;
  actionsTaken: string;
  referralDetails: string;
  notificationDetails: string;
  acknowledgementText: string;
  customBody: string;
}) {
  return (
    <article className="mx-auto min-h-[1120px] w-full max-w-[850px] bg-white p-10 shadow-xl print:min-h-0 print:max-w-none print:p-12 print:shadow-none">
      <header className="border-b-2 border-slate-900 pb-5 text-center">
        <h1 className="text-2xl font-black tracking-wide text-slate-900">
          {centreName}
        </h1>

        <p className="mt-1 text-xs text-slate-500">
          {centreAddress}
        </p>

        <div className="mt-5 flex items-end justify-between text-left">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {title}
            </h2>
          </div>

          <div className="text-right text-xs text-slate-600">
            <p>
              <strong>Document No:</strong>{" "}
              {documentNumber}
            </p>
            <p className="mt-1">
              <strong>Date:</strong>{" "}
              {formatDate(documentDate)}
            </p>
          </div>
        </div>
      </header>

      {patient && (
        <section className="mt-6 rounded-lg border border-slate-300 p-4">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide">
            Patient Details
          </h3>

          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <Info label="Patient Name" value={patient.name} />
            <Info label="Patient ID" value={patient.id} />
            <Info label="Age" value={patient.age} />
            <Info label="Gender" value={patient.gender} />
            <Info
              label="Admission Date"
              value={formatDate(patient.admissionDate)}
            />
            <Info
              label="Discharge Date"
              value={formatDate(patient.dischargeDate)}
            />
            <Info label="Room" value={patient.room} />
            <Info
              label="Emergency Contact"
              value={patient.emergencyContact}
            />
          </div>
        </section>
      )}

      <div className="mt-7 space-y-5 text-sm leading-6 text-slate-800">
        {type === "discharge" && (
          <>
            <DocumentSection
              title="Primary Diagnosis"
              text={diagnosis}
            />

            <DocumentSection
              title="Treatment / Rehabilitation Provided"
              text={treatmentSummary}
            />

            <DocumentSection
              title="Clinical / Functional Progress"
              text={progress}
            />

            <DocumentSection
              title="Condition at Discharge"
              text={condition}
            />

            <DocumentSection
              title="Instructions / Medications"
              text={instructions}
            />

            <DocumentSection
              title="Follow-up Recommendations"
              text={followUp}
            />
          </>
        )}

        {type === "emergency" && (
          <>
            <DocumentSection
              title="Diagnosis / Relevant Clinical Information"
              text={diagnosis}
            />

            <DocumentSection
              title="Description of Emergency / Serious Event"
              text={eventDescription}
            />

            <DocumentSection
              title="Immediate Actions Taken"
              text={actionsTaken}
            />

            <DocumentSection
              title="Referral / Transfer Details"
              text={referralDetails}
            />

            <DocumentSection
              title="Family / Attender Notification"
              text={notificationDetails}
            />

            <section>
              <h3 className="font-bold">
                Formal Acknowledgement
              </h3>

              <p className="mt-2 whitespace-pre-wrap">
                {acknowledgementText}
              </p>

              <p className="mt-3 text-xs text-slate-500">
                This acknowledgement is subject to applicable
                law and does not waive rights or professional,
                medical, or statutory obligations that cannot
                legally be waived.
              </p>
            </section>
          </>
        )}

        {type === "acknowledgement" && (
          <>
            <DocumentSection
              title="Relevant Information"
              text={diagnosis}
            />

            <DocumentSection
              title="Treatment / Information Provided"
              text={treatmentSummary}
            />

            <section>
              <h3 className="font-bold">
                Acknowledgement
              </h3>

              <p className="mt-2 whitespace-pre-wrap">
                {acknowledgementText}
              </p>
            </section>
          </>
        )}

        {type === "treatment" && (
          <>
            <DocumentSection
              title="Diagnosis"
              text={diagnosis}
            />

            <DocumentSection
              title="Treatment / Rehabilitation Provided"
              text={treatmentSummary}
            />

            <DocumentSection
              title="Progress"
              text={progress}
            />

            <DocumentSection
              title="Recommendations"
              text={followUp}
            />
          </>
        )}

        {type === "admission" && (
          <>
            <DocumentSection
              title="Diagnosis / Reason for Admission"
              text={diagnosis}
            />

            <DocumentSection
              title="Treatment Plan / Rehabilitation Programme"
              text={treatmentSummary}
            />

            <DocumentSection
              title="Additional Instructions"
              text={instructions}
            />
          </>
        )}

        {type === "custom" && (
          <section>
            <p className="whitespace-pre-wrap">
              {customBody ||
                "Enter your letter content in the editor."}
            </p>
          </section>
        )}
      </div>

      <section className="mt-10 grid grid-cols-2 gap-10 text-sm">
        <Signature
          label="Doctor / Medical Professional"
          name={doctorName}
        />

        <Signature
          label="Centre Representative"
          name={staffName}
        />

        <Signature
          label="Patient / Attender"
          name={patient?.name || ""}
        />

        <Signature
          label="Date"
          name={formatDate(documentDate)}
        />
      </section>

      <footer className="mt-12 border-t border-slate-300 pt-3 text-center text-[10px] text-slate-400">
        This document is generated for administrative and
        record-keeping purposes. Final clinical/legal wording
        should be reviewed and approved by the rehabilitation
        centre and appropriate professional/legal authority.
      </footer>
    </article>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <span className="font-semibold">{label}: </span>
      {value || "—"}
    </div>
  );
}

function DocumentSection({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <section>
      <h3 className="font-bold">{title}</h3>

      <p className="mt-1 min-h-6 whitespace-pre-wrap">
        {text || "—"}
      </p>
    </section>
  );
}

function Signature({
  label,
  name,
}: {
  label: string;
  name: string;
}) {
  return (
    <div className="pt-8">
      <div className="border-t border-slate-500 pt-2">
        <p className="font-semibold">{label}</p>

        {name && (
          <p className="mt-1 text-xs text-slate-500">
            {name}
          </p>
        )}
      </div>
    </div>
  );
}