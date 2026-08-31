"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

type Patient = {
  id: string;
  [key: string]: any;
};

type FormData = {
  patientName: string;
  age: string;
  gender: string;
  ipUhid: string;
  admissionDate: string;
  diagnosis: string;
  address: string;

  attenderName: string;
  relationship: string;
  mobile: string;
  emergencyContact: string;

  admissionDeposit: string;
  roomBedCharges: string;
  packageCharges: string;
  otherCharges: string;
  paymentMode: string;

  depositedItems: string;

  authorisedContact: string;
  authorisedRelationship: string;
  authorisedMobile: string;

  patientSignatureName: string;
  patientSignatureDate: string;

  attenderSignatureName: string;
  attenderSignatureRelationship: string;
  attenderSignatureDate: string;

  witnessName: string;
  witnessMobile: string;
  witnessDate: string;

  representativeName: string;
  designation: string;
  representativeDate: string;

  primaryContact: string;
  primaryRelationship: string;
  primaryMobile: string;

  alternateContact: string;
  alternateMobile: string;

  documentNo: string;
  revisionNo: string;
  effectiveDate: string;
};

const today = new Date().toISOString().split("T")[0];

const emptyForm: FormData = {
  patientName: "",
  age: "",
  gender: "",
  ipUhid: "",
  admissionDate: "",
  diagnosis: "",
  address: "",

  attenderName: "",
  relationship: "",
  mobile: "",
  emergencyContact: "",

  admissionDeposit: "",
  roomBedCharges: "",
  packageCharges: "",
  otherCharges: "",
  paymentMode: "",

  depositedItems: "",

  authorisedContact: "",
  authorisedRelationship: "",
  authorisedMobile: "",

  patientSignatureName: "",
  patientSignatureDate: "",

  attenderSignatureName: "",
  attenderSignatureRelationship: "",
  attenderSignatureDate: "",

  witnessName: "",
  witnessMobile: "",
  witnessDate: "",

  representativeName: "",
  designation: "",
  representativeDate: "",

  primaryContact: "",
  primaryRelationship: "",
  primaryMobile: "",

  alternateContact: "",
  alternateMobile: "",

  documentNo: `RNRC/CONSENT/${new Date().getFullYear()}/001`,
  revisionNo: "01",
  effectiveDate: today,
};

function firstValue(patient: Patient, keys: string[]): string {
  for (const key of keys) {
    const value = patient[key];

    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value);
    }
  }

  return "";
}

function formatDateForInput(value: any): string {
  if (!value) return "";

  try {
    if (typeof value?.toDate === "function") {
      return value.toDate().toISOString().split("T")[0];
    }

    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {
      return date.toISOString().split("T")[0];
    }
  } catch {
    return "";
  }

  return String(value);
}

function formatDateDisplay(value: string): string {
  if (!value) return "____ / ____ / ______";

  const parts = value.split("-");

  if (parts.length === 3) {
    return `${parts[2]} / ${parts[1]} / ${parts[0]}`;
  }

  return value;
}

function patientDisplayName(patient: Patient): string {
  return (
    firstValue(patient, [
      "name",
      "patientName",
      "fullName",
      "patient_name",
      "residentName",
    ]) || `Patient ${patient.id}`
  );
}

function createFormFromPatient(patient: Patient): FormData {
  const patientName = patientDisplayName(patient);

  const admissionDate = formatDateForInput(
    patient.admissionDate ??
      patient.dateOfAdmission ??
      patient.admittedOn ??
      patient.admission_date
  );

  const attenderName = firstValue(patient, [
    "attenderName",
    "guardianName",
    "attender",
    "guardian",
    "caregiverName",
    "relativeName",
  ]);

  const relationship = firstValue(patient, [
    "relationship",
    "attenderRelationship",
    "guardianRelationship",
    "relation",
  ]);

  const mobile = firstValue(patient, [
    "mobile",
    "phone",
    "contact",
    "mobileNumber",
    "phoneNumber",
    "attenderMobile",
    "guardianMobile",
  ]);

  return {
    ...emptyForm,

    patientName,
    age: firstValue(patient, ["age", "patientAge"]),
    gender: firstValue(patient, ["gender", "sex"]),
    ipUhid: firstValue(patient, [
      "ipNumber",
      "ipNo",
      "uhid",
      "uhidNo",
      "ipUhid",
      "patientId",
      "registrationNo",
    ]),

    admissionDate,

    diagnosis: firstValue(patient, [
      "diagnosis",
      "medicalCondition",
      "condition",
      "diagnosisDetails",
    ]),

    address: firstValue(patient, [
      "address",
      "permanentAddress",
      "fullAddress",
      "patientAddress",
    ]),

    attenderName,
    relationship,
    mobile,

    emergencyContact: firstValue(patient, [
      "emergencyContact",
      "emergencyPhone",
      "emergencyMobile",
      "emergencyNumber",
    ]),

    authorisedContact: attenderName,
    authorisedRelationship: relationship,
    authorisedMobile: mobile,

    patientSignatureName: patientName,
    patientSignatureDate: "",

    attenderSignatureName: attenderName,
    attenderSignatureRelationship: relationship,
    attenderSignatureDate: "",

    primaryContact: attenderName,
    primaryRelationship: relationship,
    primaryMobile: mobile,
  };
}

export default function DocumentsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState("");

  const [form, setForm] = useState<FormData>(emptyForm);

  const [showEditor, setShowEditor] = useState(true);

  useEffect(() => {
    async function loadPatients() {
      try {
        const snapshot = await getDocs(collection(db, "patients"));

        const loaded: Patient[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setPatients(loaded);
      } catch (error) {
        console.error("Unable to load patients:", error);
      } finally {
        setLoadingPatients(false);
      }
    }

    loadPatients();
  }, []);

  const filteredPatients = useMemo(() => {
    const query = patientSearch.trim().toLowerCase();

    if (!query) return patients;

    return patients.filter((patient) => {
      const name = patientDisplayName(patient).toLowerCase();

      const ip = firstValue(patient, [
        "ipNumber",
        "ipNo",
        "uhid",
        "uhidNo",
        "patientId",
        "registrationNo",
      ]).toLowerCase();

      const mobile = firstValue(patient, [
        "mobile",
        "phone",
        "contact",
        "mobileNumber",
        "phoneNumber",
      ]).toLowerCase();

      return (
        name.includes(query) ||
        ip.includes(query) ||
        mobile.includes(query)
      );
    });
  }, [patients, patientSearch]);

  function updateField<K extends keyof FormData>(
    field: K,
    value: FormData[K]
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function selectPatient(id: string) {
    setSelectedPatientId(id);

    const patient = patients.find((item) => item.id === id);

    if (patient) {
      setForm(createFormFromPatient(patient));
    }
  }

  function clearPatient() {
    setSelectedPatientId("");
    setForm(emptyForm);
  }

  function printDocument() {
    setShowEditor(false);

    setTimeout(() => {
      window.print();

      setTimeout(() => {
        setShowEditor(true);
      }, 500);
    }, 100);
  }

  return (
    <>
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #eef2f7;
          color: #172033;
          font-family:
            Arial,
            "Noto Sans Telugu",
            "Noto Sans",
            sans-serif;
        }

        .documents-shell {
          min-height: 100vh;
        }

        .topbar {
          position: sticky;
          top: 0;
          z-index: 50;
          background: #0f172a;
          color: white;
          padding: 14px 22px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
        }

        .topbar-title {
          font-size: 20px;
          font-weight: 800;
        }

        .topbar-subtitle {
          margin-top: 3px;
          font-size: 12px;
          opacity: 0.75;
        }

        .topbar-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        button,
        select,
        input,
        textarea {
          font: inherit;
        }

        button {
          cursor: pointer;
        }

        .btn {
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 9px 14px;
          background: white;
          color: #172033;
          font-weight: 700;
        }

        .btn-primary {
          background: #2563eb;
          border-color: #2563eb;
          color: white;
        }

        .btn-dark {
          background: #111827;
          border-color: #111827;
          color: white;
        }

        .btn-danger {
          color: #b91c1c;
          border-color: #fecaca;
          background: #fff;
        }

        .workspace {
          max-width: 1500px;
          margin: 0 auto;
          padding: 24px;
        }

        .control-panel {
          background: white;
          border: 1px solid #dbe2ea;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 22px;
          box-shadow: 0 3px 15px rgba(15, 23, 42, 0.06);
        }

        .panel-title {
          font-size: 18px;
          font-weight: 800;
          margin-bottom: 16px;
        }

        .selector-grid {
          display: grid;
          grid-template-columns: minmax(240px, 1fr) minmax(280px, 1.5fr) auto;
          gap: 12px;
          align-items: end;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .field label {
          font-size: 12px;
          font-weight: 800;
          color: #475569;
        }

        .field input,
        .field select,
        .field textarea {
          width: 100%;
          border: 1px solid #cbd5e1;
          border-radius: 7px;
          padding: 9px 10px;
          background: white;
          color: #111827;
        }

        .field textarea {
          min-height: 76px;
          resize: vertical;
        }

        .editor-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-top: 18px;
        }

        .editor-grid .wide {
          grid-column: span 2;
        }

        .editor-grid .full {
          grid-column: 1 / -1;
        }

        .selected-patient {
          margin-top: 14px;
          padding: 11px 13px;
          border-radius: 8px;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          color: #1e40af;
          font-size: 13px;
        }

        .document-page {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto 30px;
          background: white;
          padding: 15mm 15mm 18mm;
          box-shadow: 0 4px 30px rgba(15, 23, 42, 0.14);
          color: #111827;
        }

        .letterhead {
          text-align: center;
          border-bottom: 2px solid #111827;
          padding-bottom: 10px;
          margin-bottom: 18px;
        }

        .centre-name {
          font-size: 20px;
          font-weight: 900;
          letter-spacing: 0.3px;
        }

        .centre-motto {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1.3px;
          margin-top: 4px;
        }

        .document-title {
          text-align: center;
          font-size: 17px;
          font-weight: 900;
          margin: 16px 0 5px;
        }

        .document-title-telugu {
          text-align: center;
          font-size: 14px;
          font-weight: 800;
          margin-bottom: 16px;
        }

        .patient-info {
          border: 1px solid #334155;
          padding: 10px;
          margin-bottom: 16px;
        }

        .patient-info-grid {
          display: grid;
          grid-template-columns: 2fr 0.7fr 0.9fr 1.2fr;
          gap: 7px 12px;
        }

        .info-item {
          font-size: 9.7px;
          line-height: 1.45;
        }

        .info-label {
          font-weight: 800;
        }

        .address-item {
          grid-column: 1 / -1;
        }

        .document-section {
          margin-top: 16px;
          break-inside: avoid;
        }

        .section-heading {
          font-size: 13px;
          font-weight: 900;
          border-bottom: 1px solid #334155;
          padding-bottom: 4px;
          margin-bottom: 8px;
        }

        .section-heading-telugu {
          font-size: 11px;
          font-weight: 800;
          margin-top: -4px;
          margin-bottom: 9px;
        }

        .document-page p {
          font-size: 9.4px;
          line-height: 1.55;
          margin: 0 0 8px;
          text-align: justify;
        }

        .billing-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          border: 1px solid #64748b;
          margin: 10px 0;
        }

        .billing-row {
          min-height: 28px;
          padding: 7px 9px;
          border-right: 1px solid #64748b;
          border-bottom: 1px solid #64748b;
          font-size: 9.2px;
        }

        .billing-row:nth-child(2n) {
          border-right: 0;
        }

        .billing-row:nth-last-child(-n + 2) {
          border-bottom: 0;
        }

        .blank-box {
          border: 1px solid #64748b;
          min-height: 55px;
          padding: 7px;
          margin: 7px 0 12px;
          white-space: pre-wrap;
          font-size: 9px;
        }

        .signature-block {
          margin-top: 18px;
          break-inside: avoid;
        }

        .signature-heading {
          font-size: 11px;
          font-weight: 900;
          margin-bottom: 6px;
        }

        .signature-line {
          border-bottom: 1px solid #111827;
          height: 25px;
          margin-bottom: 4px;
        }

        .signature-meta {
          font-size: 8.7px;
        }

        .signatures-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 25px;
          margin-top: 12px;
        }

        .signature-card {
          min-height: 110px;
          border: 1px solid #94a3b8;
          padding: 9px;
          break-inside: avoid;
        }

        .emergency-box {
          border: 1.5px solid #334155;
          padding: 10px;
          margin-top: 18px;
          break-inside: avoid;
        }

        .document-footer {
          border-top: 1px solid #64748b;
          margin-top: 18px;
          padding-top: 8px;
          text-align: center;
          font-size: 8px;
          line-height: 1.5;
        }

        .important-note {
          margin-top: 10px;
          padding: 8px;
          border: 1px solid #64748b;
          font-size: 8.3px;
          line-height: 1.45;
        }

        .print-help {
          max-width: 210mm;
          margin: 0 auto 20px;
          font-size: 12px;
          color: #64748b;
          text-align: center;
        }

        @media (max-width: 900px) {
          .selector-grid,
          .editor-grid {
            grid-template-columns: 1fr;
          }

          .editor-grid .wide,
          .editor-grid .full {
            grid-column: auto;
          }

          .document-page {
            width: 100%;
            min-height: auto;
            padding: 20px;
          }

          .patient-info-grid {
            grid-template-columns: 1fr 1fr;
          }

          .signatures-grid {
            grid-template-columns: 1fr;
          }
        }

        @media print {
          @page {
            size: A4;
            margin: 0;
          }

          body {
            background: white;
          }

          .no-print,
          .topbar,
          .control-panel,
          .print-help {
            display: none !important;
          }

          .workspace {
            padding: 0;
            margin: 0;
            max-width: none;
          }

          .document-page {
            width: 210mm;
            min-height: 297mm;
            margin: 0;
            padding: 15mm 15mm 18mm;
            box-shadow: none;
          }

          .document-section {
            break-inside: avoid;
          }

          .signature-card,
          .signature-block,
          .emergency-box {
            break-inside: avoid;
          }
        }
      `}</style>

      <div className="documents-shell">
        <header className="topbar no-print">
          <div>
            <div className="topbar-title">Documents Centre</div>
            <div className="topbar-subtitle">
              Patient consent, agreement and undertaking
            </div>
          </div>

          <div className="topbar-actions">
            <Link href="/" className="btn">
              ← Back to Dashboard
            </Link>

            <button
              type="button"
              className="btn"
              onClick={() => setShowEditor((value) => !value)}
            >
              {showEditor ? "Hide Editor" : "Show Editor"}
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={printDocument}
            >
              🖨 Print / Save PDF
            </button>
          </div>
        </header>

        <main className="workspace">
          {showEditor && (
            <section className="control-panel no-print">
              <div className="panel-title">
                Patient Selection & Document Editor
              </div>

              <div className="selector-grid">
                <div className="field">
                  <label>Search Patient</label>
                  <input
                    value={patientSearch}
                    onChange={(event) =>
                      setPatientSearch(event.target.value)
                    }
                    placeholder="Search name, IP/UHID or mobile..."
                  />
                </div>

                <div className="field">
                  <label>Select Patient</label>

                  <select
                    value={selectedPatientId}
                    onChange={(event) => selectPatient(event.target.value)}
                  >
                    <option value="">
                      {loadingPatients
                        ? "Loading patients..."
                        : "Select a patient"}
                    </option>

                    {filteredPatients.map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {patientDisplayName(patient)}
                        {firstValue(patient, [
                          "ipNumber",
                          "ipNo",
                          "uhid",
                          "uhidNo",
                          "registrationNo",
                        ])
                          ? ` — ${firstValue(patient, [
                              "ipNumber",
                              "ipNo",
                              "uhid",
                              "uhidNo",
                              "registrationNo",
                            ])}`
                          : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={clearPatient}
                >
                  Clear
                </button>
              </div>

              {selectedPatientId && (
                <div className="selected-patient">
                  <strong>Selected patient:</strong>{" "}
                  {form.patientName || "Unnamed patient"}{" "}
                  {form.ipUhid ? `• ${form.ipUhid}` : ""}
                </div>
              )}

              <div className="editor-grid">
                <div className="field">
                  <label>Patient / Resident Name</label>
                  <input
                    value={form.patientName}
                    onChange={(e) =>
                      updateField("patientName", e.target.value)
                    }
                  />
                </div>

                <div className="field">
                  <label>Age</label>
                  <input
                    value={form.age}
                    onChange={(e) => updateField("age", e.target.value)}
                  />
                </div>

                <div className="field">
                  <label>Gender</label>
                  <input
                    value={form.gender}
                    onChange={(e) => updateField("gender", e.target.value)}
                  />
                </div>

                <div className="field">
                  <label>IP / UHID No.</label>
                  <input
                    value={form.ipUhid}
                    onChange={(e) => updateField("ipUhid", e.target.value)}
                  />
                </div>

                <div className="field">
                  <label>Date of Admission</label>
                  <input
                    type="date"
                    value={form.admissionDate}
                    onChange={(e) =>
                      updateField("admissionDate", e.target.value)
                    }
                  />
                </div>

                <div className="field">
                  <label>Diagnosis / Medical Condition</label>
                  <input
                    value={form.diagnosis}
                    onChange={(e) =>
                      updateField("diagnosis", e.target.value)
                    }
                  />
                </div>

                <div className="field full">
                  <label>Permanent Address</label>
                  <textarea
                    value={form.address}
                    onChange={(e) => updateField("address", e.target.value)}
                  />
                </div>

                <div className="field">
                  <label>Attender / Guardian Name</label>
                  <input
                    value={form.attenderName}
                    onChange={(e) =>
                      updateField("attenderName", e.target.value)
                    }
                  />
                </div>

                <div className="field">
                  <label>Relationship</label>
                  <input
                    value={form.relationship}
                    onChange={(e) =>
                      updateField("relationship", e.target.value)
                    }
                  />
                </div>

                <div className="field">
                  <label>Mobile</label>
                  <input
                    value={form.mobile}
                    onChange={(e) => updateField("mobile", e.target.value)}
                  />
                </div>

                <div className="field full">
                  <label>Emergency Contact</label>
                  <input
                    value={form.emergencyContact}
                    onChange={(e) =>
                      updateField("emergencyContact", e.target.value)
                    }
                  />
                </div>

                <div className="field">
                  <label>Admission / Deposit ₹</label>
                  <input
                    value={form.admissionDeposit}
                    onChange={(e) =>
                      updateField("admissionDeposit", e.target.value)
                    }
                  />
                </div>

                <div className="field">
                  <label>Room / Bed Charges ₹</label>
                  <input
                    value={form.roomBedCharges}
                    onChange={(e) =>
                      updateField("roomBedCharges", e.target.value)
                    }
                  />
                </div>

                <div className="field">
                  <label>Daily / Monthly Package ₹</label>
                  <input
                    value={form.packageCharges}
                    onChange={(e) =>
                      updateField("packageCharges", e.target.value)
                    }
                  />
                </div>

                <div className="field">
                  <label>Other Charges ₹</label>
                  <input
                    value={form.otherCharges}
                    onChange={(e) =>
                      updateField("otherCharges", e.target.value)
                    }
                  />
                </div>

                <div className="field">
                  <label>Payment Mode</label>
                  <input
                    value={form.paymentMode}
                    onChange={(e) =>
                      updateField("paymentMode", e.target.value)
                    }
                  />
                </div>

                <div className="field full">
                  <label>Items Deposited With Centre</label>
                  <textarea
                    value={form.depositedItems}
                    onChange={(e) =>
                      updateField("depositedItems", e.target.value)
                    }
                  />
                </div>

                <div className="field">
                  <label>Authorised Contact Person</label>
                  <input
                    value={form.authorisedContact}
                    onChange={(e) =>
                      updateField("authorisedContact", e.target.value)
                    }
                  />
                </div>

                <div className="field">
                  <label>Authorised Relationship</label>
                  <input
                    value={form.authorisedRelationship}
                    onChange={(e) =>
                      updateField(
                        "authorisedRelationship",
                        e.target.value
                      )
                    }
                  />
                </div>

                <div className="field">
                  <label>Authorised Mobile</label>
                  <input
                    value={form.authorisedMobile}
                    onChange={(e) =>
                      updateField("authorisedMobile", e.target.value)
                    }
                  />
                </div>

                <div className="field">
                  <label>Witness Name</label>
                  <input
                    value={form.witnessName}
                    onChange={(e) =>
                      updateField("witnessName", e.target.value)
                    }
                  />
                </div>

                <div className="field">
                  <label>Witness Mobile</label>
                  <input
                    value={form.witnessMobile}
                    onChange={(e) =>
                      updateField("witnessMobile", e.target.value)
                    }
                  />
                </div>

                <div className="field">
                  <label>Witness Date</label>
                  <input
                    type="date"
                    value={form.witnessDate}
                    onChange={(e) =>
                      updateField("witnessDate", e.target.value)
                    }
                  />
                </div>

                <div className="field">
                  <label>Centre Representative Name</label>
                  <input
                    value={form.representativeName}
                    onChange={(e) =>
                      updateField("representativeName", e.target.value)
                    }
                  />
                </div>

                <div className="field">
                  <label>Designation</label>
                  <input
                    value={form.designation}
                    onChange={(e) =>
                      updateField("designation", e.target.value)
                    }
                  />
                </div>

                <div className="field">
                  <label>Representative Date</label>
                  <input
                    type="date"
                    value={form.representativeDate}
                    onChange={(e) =>
                      updateField("representativeDate", e.target.value)
                    }
                  />
                </div>

                <div className="field">
                  <label>Primary Contact</label>
                  <input
                    value={form.primaryContact}
                    onChange={(e) =>
                      updateField("primaryContact", e.target.value)
                    }
                  />
                </div>

                <div className="field">
                  <label>Primary Relationship</label>
                  <input
                    value={form.primaryRelationship}
                    onChange={(e) =>
                      updateField("primaryRelationship", e.target.value)
                    }
                  />
                </div>

                <div className="field">
                  <label>Primary Mobile</label>
                  <input
                    value={form.primaryMobile}
                    onChange={(e) =>
                      updateField("primaryMobile", e.target.value)
                    }
                  />
                </div>

                <div className="field">
                  <label>Alternate Contact</label>
                  <input
                    value={form.alternateContact}
                    onChange={(e) =>
                      updateField("alternateContact", e.target.value)
                    }
                  />
                </div>

                <div className="field">
                  <label>Alternate Mobile</label>
                  <input
                    value={form.alternateMobile}
                    onChange={(e) =>
                      updateField("alternateMobile", e.target.value)
                    }
                  />
                </div>

                <div className="field">
                  <label>Document No.</label>
                  <input
                    value={form.documentNo}
                    onChange={(e) =>
                      updateField("documentNo", e.target.value)
                    }
                  />
                </div>

                <div className="field">
                  <label>Revision No.</label>
                  <input
                    value={form.revisionNo}
                    onChange={(e) =>
                      updateField("revisionNo", e.target.value)
                    }
                  />
                </div>

                <div className="field">
                  <label>Effective Date</label>
                  <input
                    type="date"
                    value={form.effectiveDate}
                    onChange={(e) =>
                      updateField("effectiveDate", e.target.value)
                    }
                  />
                </div>
              </div>
            </section>
          )}

          <div className="print-help no-print">
            Review the information above, then click{" "}
            <strong>Print / Save PDF</strong>. In the browser print dialog,
            choose <strong>Save as PDF</strong> and paper size{" "}
            <strong>A4</strong>.
          </div>

          <article className="document-page">
            <header className="letterhead">
              <div className="centre-name">
                ROSES NEURO REHABILITATION CENTRE
              </div>

              <div className="centre-motto">
                SERVICE • HOPE • HUMANITY • REVIVAL • EDUCATION
              </div>
            </header>

            <h1 className="document-title">
              PATIENT & ATTENDER CONSENT, AGREEMENT AND UNDERTAKING
            </h1>

            <div className="document-title-telugu">
              పేషెంట్ మరియు అటెండర్ అంగీకార పత్రం, ఒప్పందం మరియు బాధ్యత ప్రకటన
            </div>

            <section className="patient-info">
              <div className="patient-info-grid">
                <div className="info-item">
                  <span className="info-label">
                    Patient / Resident Name / పేషెంట్ పేరు:
                  </span>{" "}
                  {form.patientName || "____________________________"}
                </div>

                <div className="info-item">
                  <span className="info-label">Age / వయస్సు:</span>{" "}
                  {form.age || "________"}
                </div>

                <div className="info-item">
                  <span className="info-label">Gender / లింగం:</span>{" "}
                  {form.gender || "________"}
                </div>

                <div className="info-item">
                  <span className="info-label">IP / UHID No.:</span>{" "}
                  {form.ipUhid || "____________"}
                </div>

                <div className="info-item">
                  <span className="info-label">
                    Date of Admission / చేరిన తేదీ:
                  </span>{" "}
                  {formatDateDisplay(form.admissionDate)}
                </div>

                <div className="info-item address-item">
                  <span className="info-label">
                    Diagnosis / Medical Condition / వైద్య నిర్ధారణ / ఆరోగ్య
                    పరిస్థితి:
                  </span>{" "}
                  {form.diagnosis || "________________________________"}
                </div>

                <div className="info-item address-item">
                  <span className="info-label">
                    Permanent Address / శాశ్వత చిరునామా:
                  </span>
                  <br />
                  {form.address || "____________________________________________________________"}
                </div>

                <div className="info-item">
                  <span className="info-label">
                    Attender / Guardian Name / అటెండర్ / సంరక్షకుని పేరు:
                  </span>{" "}
                  {form.attenderName || "____________________________"}
                </div>

                <div className="info-item">
                  <span className="info-label">
                    Relationship / సంబంధం:
                  </span>{" "}
                  {form.relationship || "________"}
                </div>

                <div className="info-item">
                  <span className="info-label">
                    Mobile / మొబైల్:
                  </span>{" "}
                  {form.mobile || "____________"}
                </div>

                <div className="info-item address-item">
                  <span className="info-label">
                    Emergency Contact / అత్యవసర సంప్రదింపు:
                  </span>{" "}
                  {form.emergencyContact || "____________________________"}
                </div>
              </div>
            </section>

            <section className="document-section">
              <div className="section-heading">
                CONSENT, AGREEMENT AND UNDERTAKING
              </div>

              <div className="section-heading-telugu">
                అంగీకారం, ఒప్పందం మరియు బాధ్యత ప్రకటన
              </div>

              <p>
                I, the undersigned patient / parent / guardian / authorised
                attendant, hereby voluntarily agree to admit and/or continue
                the above-mentioned patient at <strong>ROSES Neuro Rehabilitation Centre</strong>{" "}
                for appropriate rehabilitation, nursing care, physiotherapy,
                occupational and supportive rehabilitation services, medical
                supervision and other services considered necessary according
                to the patient's condition and the professional advice of the
                treating medical team.
              </p>

              <p>
                నేను క్రింద సంతకం చేసిన పేషెంట్ / తల్లిదండ్రి / సంరక్షకుడు /
                అధీకృత అటెండర్‌గా, పై పేర్కొన్న పేషెంట్‌ను వారి ఆరోగ్య
                పరిస్థితికి అనుగుణంగా మరియు చికిత్స అందించే వైద్య బృందం /
                సంబంధిత నిపుణుల సూచనల మేరకు{" "}
                <strong>ROSES Neuro Rehabilitation Centre</strong>లో తగిన
                రిహాబిలిటేషన్, నర్సింగ్ కేర్, ఫిజియోథెరపీ, ఆక్యుపేషనల్ మరియు
                ఇతర సహాయక పునరావాస సేవలు, వైద్య పర్యవేక్షణ మరియు అవసరమైన
                ఇతర సేవల కోసం చేర్పించడానికి / కొనసాగించడానికి నా
                స్వచ్ఛంద అంగీకారాన్ని తెలియజేస్తున్నాను.
              </p>

              <p>
                I confirm that the patient's relevant medical history,
                previous treatment details, current medicines, known
                allergies, previous operations, significant medical
                conditions and other information known to me have been
                disclosed to the centre to the best of my knowledge. I
                understand that incomplete or incorrect information may affect
                the assessment and care of the patient.
              </p>

              <p>
                పేషెంట్‌కు సంబంధించిన వైద్య చరిత్ర, గత చికిత్స వివరాలు,
                ప్రస్తుతం ఉపయోగిస్తున్న మందులు, తెలిసిన అలర్జీలు, గత
                శస్త్రచికిత్సలు, ముఖ్యమైన ఆరోగ్య సమస్యలు మరియు నాకు తెలిసిన
                ఇతర సంబంధిత సమాచారాన్ని నా పరిజ్ఞానం మేరకు సెంటర్‌కు
                అందించినట్లు నేను ధృవీకరిస్తున్నాను. అసంపూర్ణమైన లేదా తప్పు
                సమాచారం పేషెంట్ పరిశీలన మరియు సంరక్షణపై ప్రభావం చూపవచ్చని
                నేను అర్థం చేసుకున్నాను.
              </p>

              <p>
                I understand that neuro-rehabilitation is generally a gradual
                and ongoing process. The duration of rehabilitation and the
                level of improvement may differ from one patient to another
                and may depend on the patient's diagnosis, severity of
                illness, physical and cognitive condition, participation,
                cooperation, response to therapy and other medical or personal
                factors. No specific outcome or recovery time is guaranteed
                unless expressly stated in writing by the treating
                professional.
              </p>

              <p>
                న్యూరో రిహాబిలిటేషన్ సాధారణంగా క్రమంగా మరియు నిరంతరం
                కొనసాగాల్సిన ప్రక్రియ అని నేను అర్థం చేసుకున్నాను.
                రిహాబిలిటేషన్ వ్యవధి మరియు పేషెంట్‌లో కనిపించే మెరుగుదల
                ప్రతి వ్యక్తిలో భిన్నంగా ఉండవచ్చు. పేషెంట్‌కు ఉన్న వైద్య
                నిర్ధారణ, సమస్య తీవ్రత, శారీరక మరియు మానసిక స్థితి, చికిత్సలో
                పాల్గొనడం, సహకారం, థెరపీకి స్పందన మరియు ఇతర వైద్య / వ్యక్తిగత
                అంశాలపై ఫలితాలు ఆధారపడి ఉండవచ్చు. చికిత్స అందించే నిపుణుడు
                ప్రత్యేకంగా లిఖితపూర్వకంగా హామీ ఇచ్చిన సందర్భం తప్ప,
                నిర్దిష్ట రికవరీ సమయం లేదా ఫలితానికి హామీ ఉండదని నేను
                అర్థం చేసుకున్నాను.
              </p>

              <p>
                I agree that the patient will participate in the
                rehabilitation programme as reasonably possible and will
                follow the instructions provided by the doctors,
                physiotherapists, nurses, therapists and other authorised
                staff. I understand that regular participation, appropriate
                rest, nutrition, medication compliance and cooperation may be
                important for rehabilitation.
              </p>

              <p>
                పేషెంట్ సాధ్యమైనంతవరకు రిహాబిలిటేషన్ కార్యక్రమంలో పాల్గొని,
                వైద్యులు, ఫిజియోథెరపిస్టులు, నర్సులు, థెరపిస్టులు మరియు ఇతర
                అధీకృత సిబ్బంది ఇచ్చే సూచనలను పాటించడానికి నేను అంగీకరిస్తున్నాను.
                క్రమమైన థెరపీ, తగిన విశ్రాంతి, పోషకాహారం, మందులను సూచించిన
                విధంగా తీసుకోవడం మరియు సహకారం రిహాబిలిటేషన్‌లో ముఖ్యమైన
                పాత్ర పోషించవచ్చని నేను అర్థం చేసుకున్నాను.
              </p>

              <p>
                The centre may provide nursing and daily-care assistance
                according to the patient's assessed needs. Such assistance
                may include medication administration as prescribed,
                monitoring of vital signs when required, assistance with
                feeding, personal hygiene, positioning, mobility, transfer to
                a wheelchair, basic activities of daily living and other
                supportive care within the scope of services available at the
                centre.
              </p>

              <p>
                పేషెంట్ అవసరాలను బట్టి సెంటర్ నర్సింగ్ మరియు రోజువారీ సంరక్షణలో
                సహాయం అందించవచ్చు. ఇందులో వైద్యుల సూచనల ప్రకారం మందులు
                అందించడం, అవసరమైనప్పుడు వైటల్ సైన్స్ పరిశీలించడం, ఫీడింగ్‌లో
                సహాయం, వ్యక్తిగత పరిశుభ్రత, పొజిషన్ మార్చడం, కదలికలో సహాయం,
                వీల్‌చైర్‌కు మార్చడంలో సహాయం, రోజువారీ ప్రాథమిక పనుల్లో సహాయం
                మరియు సెంటర్ పరిధిలో అందుబాటులో ఉన్న ఇతర సహాయక సేవలు ఉండవచ్చు.
              </p>

              <p>
                I understand that physiotherapy, occupational therapy, speech
                and swallowing rehabilitation, cognitive rehabilitation or
                other specialised rehabilitation services may be recommended
                depending on the patient's condition and availability. The
                rehabilitation programme may be modified, increased, reduced,
                paused or discontinued based on clinical assessment and
                professional advice.
              </p>

              <p>
                పేషెంట్ పరిస్థితిని బట్టి ఫిజియోథెరపీ, ఆక్యుపేషనల్ థెరపీ,
                స్పీచ్ మరియు స్వాలోయింగ్ రిహాబిలిటేషన్, కాగ్నిటివ్
                రిహాబిలిటేషన్ లేదా ఇతర ప్రత్యేక పునరావాస సేవలు సూచించబడవచ్చు.
                వైద్య / క్లినికల్ పరిశీలన మరియు నిపుణుల సూచనల ఆధారంగా
                రిహాబిలిటేషన్ కార్యక్రమాన్ని మార్చడం, పెంచడం, తగ్గించడం,
                తాత్కాలికంగా నిలిపివేయడం లేదా ముగించడం జరగవచ్చని నేను
                అర్థం చేసుకున్నాను.
              </p>
            </section>

            <section className="document-section">
              <div className="section-heading">
                MEDICATION, FEEDING AND MEDICAL INFORMATION
              </div>

              <div className="section-heading-telugu">
                మందులు, ఫీడింగ్ మరియు వైద్య సమాచారం
              </div>

              <p>
                All medicines shall be administered or supervised according to
                the prescription and instructions of the treating medical
                professional. The patient / attendant shall not independently
                alter, stop, add or substitute medicines without informing the
                treating team. Any outside prescription, medicine or treatment
                brought by the family should be disclosed to the centre.
              </p>

              <p>
                మందులు చికిత్స అందించే వైద్య నిపుణుల ప్రిస్క్రిప్షన్ మరియు
                సూచనల ప్రకారం మాత్రమే ఇవ్వబడతాయి / పర్యవేక్షించబడతాయి. వైద్య
                బృందానికి సమాచారం ఇవ్వకుండా పేషెంట్ / అటెండర్ స్వయంగా
                మందులను మార్చడం, నిలిపివేయడం, కొత్త మందులు కలపడం లేదా
                ప్రత్యామ్నాయ మందులు ఇవ్వకూడదు. కుటుంబ సభ్యులు బయట నుండి
                తీసుకువచ్చే ఏదైనా మందు లేదా చికిత్స గురించి సెంటర్‌కు
                సమాచారం ఇవ్వాలి.
              </p>

              <p>
                Where feeding assistance is required, feeding shall be carried
                out according to the patient's assessed needs and the advice
                of the treating team. The attendant must inform the centre
                about swallowing difficulties, choking episodes, dietary
                restrictions, allergies or any previous feeding-related
                problem.
              </p>

              <p>
                ఫీడింగ్‌లో సహాయం అవసరమైనప్పుడు, పేషెంట్ అవసరాలు మరియు చికిత్సా
                బృందం సూచనల ప్రకారం ఫీడింగ్ నిర్వహించబడుతుంది. మింగడంలో
                ఇబ్బంది, ఆహారం తీసుకునేటప్పుడు సమస్యలు, ఆహార పరిమితులు,
                అలర్జీలు లేదా గతంలో ఫీడింగ్‌కు సంబంధించిన సమస్యలు ఉంటే
                అటెండర్ సెంటర్‌కు తెలియజేయాలి.
              </p>
            </section>

            <section className="document-section">
              <div className="section-heading">
                EMERGENCY AND TRANSFER
              </div>

              <div className="section-heading-telugu">
                అత్యవసర పరిస్థితులు మరియు ఆసుపత్రికి తరలింపు
              </div>

              <p>
                I understand that rehabilitation centres may encounter
                situations in which a patient's medical condition changes
                unexpectedly or requires medical investigation, emergency
                treatment or hospital-level care. In such circumstances, the
                centre may advise or arrange, as appropriate, transfer or
                referral to a hospital / emergency medical facility. The
                emergency contact person will be informed as soon as
                reasonably possible.
              </p>

              <p>
                రిహాబిలిటేషన్ సెంటర్‌లో ఉన్న సమయంలో పేషెంట్ ఆరోగ్య పరిస్థితి
                అనుకోకుండా మారవచ్చని లేదా వైద్య పరీక్షలు, అత్యవసర చికిత్స లేదా
                ఆసుపత్రి స్థాయి వైద్య సంరక్షణ అవసరం కావచ్చని నేను
                అర్థం చేసుకున్నాను. అలాంటి పరిస్థితుల్లో అవసరాన్ని బట్టి
                ఆసుపత్రి / అత్యవసర వైద్య కేంద్రానికి తరలించాలని సెంటర్
                సూచించవచ్చు లేదా రిఫర్ చేయవచ్చు. సాధ్యమైనంత త్వరగా
                అత్యవసర సంప్రదింపు వ్యక్తికి సమాచారం అందించబడుతుంది.
              </p>

              <p>
                The patient / attendant agrees to cooperate with reasonable
                emergency instructions and provide the necessary emergency
                contact and medical information without delay.
              </p>

              <p>
                పేషెంట్ / అటెండర్ అత్యవసర పరిస్థితుల్లో సిబ్బంది ఇచ్చే తగిన
                సూచనలకు సహకరించి, అవసరమైన అత్యవసర సంప్రదింపు మరియు వైద్య
                సమాచారాన్ని ఆలస్యం లేకుండా అందించడానికి అంగీకరిస్తున్నారు.
              </p>
            </section>

            <section className="document-section">
              <div className="section-heading">
                FINANCIAL TERMS AND PAYMENT RESPONSIBILITY
              </div>

              <div className="section-heading-telugu">
                ఆర్థిక నిబంధనలు మరియు చెల్లింపు బాధ్యత
              </div>

              <p>
                I agree to pay all applicable charges for accommodation,
                nursing care, rehabilitation, physiotherapy, medicines,
                consumables, investigations, procedures, special services and
                other services provided to the patient, according to the
                applicable tariff, package or written quotation communicated
                by the centre.
              </p>

              <p>
                పేషెంట్‌కు అందించే వసతి, నర్సింగ్ కేర్, రిహాబిలిటేషన్,
                ఫిజియోథెరపీ, మందులు, కన్స్యూమబుల్స్, పరీక్షలు, విధానాలు,
                ప్రత్యేక సేవలు మరియు ఇతర సేవలకు వర్తించే చార్జీలను సెంటర్
                తెలియజేసిన టారిఫ్ / ప్యాకేజీ / లిఖితపూర్వక అంచనా ప్రకారం
                చెల్లించడానికి నేను అంగీకరిస్తున్నాను.
              </p>

              <div className="billing-grid">
                <div className="billing-row">
                  <strong>Admission / Deposit / అడ్మిషన్ / డిపాజిట్:</strong>{" "}
                  ₹ {form.admissionDeposit || "________________"}
                </div>

                <div className="billing-row">
                  <strong>Room / Bed Charges / గది / బెడ్ చార్జీలు:</strong>{" "}
                  ₹ {form.roomBedCharges || "________________"}
                </div>

                <div className="billing-row">
                  <strong>
                    Daily / Monthly Package / రోజువారీ / నెలవారీ ప్యాకేజీ:
                  </strong>{" "}
                  ₹ {form.packageCharges || "________________"}
                </div>

                <div className="billing-row">
                  <strong>Other Charges / ఇతర చార్జీలు:</strong>{" "}
                  ₹ {form.otherCharges || "________________"}
                </div>

                <div className="billing-row">
                  <strong>Payment Mode / చెల్లింపు విధానం:</strong>{" "}
                  {form.paymentMode || "________________"}
                </div>

                <div className="billing-row">
                  <strong>Patient:</strong>{" "}
                  {form.patientName || "________________"}
                </div>
              </div>

              <p>
                Additional investigations, medicines, procedures, consumables,
                emergency services or outside hospital services, where
                applicable, may involve additional charges. I agree to settle
                such applicable charges as per the centre's billing terms.
              </p>

              <p>
                అవసరమైన అదనపు పరీక్షలు, మందులు, విధానాలు, కన్స్యూమబుల్స్,
                అత్యవసర సేవలు లేదా బయట ఆసుపత్రి సేవలకు వర్తించే అదనపు
                చార్జీలు ఉండవచ్చు. అలాంటి వర్తించే మొత్తాలను సెంటర్ బిల్లింగ్
                నిబంధనల ప్రకారం చెల్లించడానికి నేను అంగీకరిస్తున్నాను.
              </p>
            </section>

            <section className="document-section">
              <div className="section-heading">
                PATIENT BELONGINGS AND PERSONAL PROPERTY
              </div>

              <div className="section-heading-telugu">
                పేషెంట్ వ్యక్తిగత వస్తువులు
              </div>

              <p>
                The patient / attendant is advised not to keep large amounts
                of cash, jewellery or other valuable personal belongings at
                the centre. Valuable items should preferably remain with the
                family / attendant. Any item specifically deposited with the
                centre should be recorded separately.
              </p>

              <p>
                పేషెంట్ / అటెండర్ పెద్ద మొత్తంలో నగదు, నగలు లేదా ఇతర విలువైన
                వస్తువులను సెంటర్‌లో ఉంచకుండా కుటుంబ సభ్యుల వద్ద భద్రంగా
                ఉంచుకోవాలని సూచించబడింది. సెంటర్ వద్ద ప్రత్యేకంగా అప్పగించిన
                విలువైన వస్తువులు ఉంటే వాటిని విడిగా నమోదు చేయాలి.
              </p>

              <strong style={{ fontSize: "9px" }}>
                Items deposited with centre, if any / సెంటర్ వద్ద అప్పగించిన
                వస్తువులు:
              </strong>

              <div className="blank-box">
                {form.depositedItems || ""}
              </div>
            </section>

            <section className="document-section">
              <div className="section-heading">
                ATTENDER RESPONSIBILITIES
              </div>

              <div className="section-heading-telugu">
                అటెండర్ బాధ్యతలు
              </div>

              <p>
                The patient / attendant agrees to provide complete cooperation
                to the rehabilitation team, follow reasonable centre rules,
                maintain respectful behaviour towards staff and other
                patients, provide correct medical information, inform the
                staff promptly about any change in the patient's condition and
                comply with safety instructions. The attendant shall not
                interfere with professional treatment decisions or
                independently instruct staff to change prescribed treatment.
              </p>

              <p>
                పేషెంట్ / అటెండర్ రిహాబిలిటేషన్ బృందంతో పూర్తి సహకారం
                అందించాలి, సెంటర్‌లోని తగిన నియమాలను పాటించాలి, సిబ్బంది మరియు
                ఇతర పేషెంట్ల పట్ల గౌరవప్రదంగా ప్రవర్తించాలి, సరైన వైద్య
                సమాచారాన్ని అందించాలి, పేషెంట్ ఆరోగ్య పరిస్థితిలో ఏదైనా మార్పు
                ఉంటే వెంటనే సిబ్బందికి తెలియజేయాలి మరియు భద్రతా సూచనలను
                పాటించాలి. వైద్య నిపుణుల చికిత్సా నిర్ణయాల్లో అనవసరంగా
                జోక్యం చేసుకోకూడదు మరియు సూచించిన చికిత్సను మార్చమని
                సిబ్బందికి స్వయంగా ఆదేశాలు ఇవ్వకూడదు.
              </p>

              <p>
                The centre expects a safe, peaceful and respectful environment
                for all patients, attendants and staff. Abusive, threatening,
                violent, discriminatory or seriously disruptive behaviour
                shall not be permitted.
              </p>

              <p>
                అన్ని పేషెంట్లు, అటెండర్లు మరియు సిబ్బందికి సురక్షితమైన,
                ప్రశాంతమైన మరియు గౌరవప్రదమైన వాతావరణం ఉండేలా చూడటం సెంటర్
                ఉద్దేశ్యం. దురుసైన, బెదిరింపు, హింసాత్మక, వివక్షతో కూడిన లేదా
                తీవ్రమైన అంతరాయం కలిగించే ప్రవర్తన అనుమతించబడదు.
              </p>
            </section>

            <section className="document-section">
              <div className="section-heading">
                CONFIDENTIALITY AND COMMUNICATION
              </div>

              <div className="section-heading-telugu">
                గోప్యత మరియు సమాచార మార్పిడి
              </div>

              <p>
                The centre shall handle patient information in accordance with
                applicable professional, privacy and legal requirements. The
                patient / authorised attendant may be contacted regarding
                appointments, treatment schedules, care-related matters,
                billing and necessary administrative communication.
              </p>

              <p>
                సెంటర్ పేషెంట్ సమాచారాన్ని వర్తించే వృత్తిపరమైన, గోప్యతా మరియు
                చట్టపరమైన నిబంధనలకు అనుగుణంగా నిర్వహిస్తుంది. అపాయింట్‌మెంట్లు,
                చికిత్స షెడ్యూల్, సంరక్షణకు సంబంధించిన విషయాలు, బిల్లింగ్ మరియు
                అవసరమైన పరిపాలనా సమాచారానికి సంబంధించి పేషెంట్ / అధీకృత
                అటెండర్‌ను సంప్రదించవచ్చు.
              </p>

              <p>
                <strong>
                  Authorised Contact Person / అధీకృత సంప్రదింపు వ్యక్తి:
                </strong>{" "}
                {form.authorisedContact || "____________________________"}
              </p>

              <p>
                <strong>Relationship / సంబంధం:</strong>{" "}
                {form.authorisedRelationship || "________________"}{" "}
                <strong>Mobile / మొబైల్:</strong>{" "}
                {form.authorisedMobile || "________________"}
              </p>
            </section>

            <section className="document-section">
              <div className="section-heading">
                LEAVE, DISCHARGE AND TERMINATION OF SERVICES
              </div>

              <div className="section-heading-telugu">
                సెలవు, డిశ్చార్జ్ మరియు సేవల ముగింపు
              </div>

              <p>
                Discharge shall ordinarily be planned in consultation with the
                treating team and centre management. The patient / attendant
                agrees to complete applicable billing, documentation and
                discharge formalities before leaving the centre.
              </p>

              <p>
                డిశ్చార్జ్ సాధారణంగా చికిత్సా బృందం మరియు సెంటర్ యాజమాన్యంతో
                సంప్రదించి ప్రణాళిక చేయబడుతుంది. సెంటర్ నుండి వెళ్లే ముందు
                వర్తించే బిల్లింగ్, పత్రాల మరియు డిశ్చార్జ్ ప్రక్రియలను
                పూర్తి చేయడానికి పేషెంట్ / అటెండర్ అంగీకరిస్తున్నారు.
              </p>

              <p>
                If the patient / attendant wishes to discontinue
                rehabilitation or leave against professional advice, the
                relevant documentation may be completed and the patient /
                attendant may be requested to acknowledge the decision in
                writing.
              </p>

              <p>
                పేషెంట్ / అటెండర్ రిహాబిలిటేషన్‌ను నిలిపివేయాలని లేదా నిపుణుల
                సూచనకు విరుద్ధంగా సెంటర్‌ను విడిచి వెళ్లాలని కోరుకుంటే,
                సంబంధిత పత్రాలను పూర్తి చేయవలసి ఉండవచ్చు మరియు ఆ నిర్ణయాన్ని
                లిఖితపూర్వకంగా ధృవీకరించమని కోరవచ్చు.
              </p>
            </section>

            <section className="document-section">
              <div className="section-heading">DECLARATION</div>

              <div className="section-heading-telugu">తుది ప్రకటన</div>

              <p>
                I declare that I have read this entire document, or that the
                contents have been read and explained to me in a language that
                I understand. I have had an opportunity to ask questions and
                obtain clarification. I understand the general nature of the
                rehabilitation and care services, the responsibilities of the
                patient / attendant, the financial obligations and the
                procedures applicable in case of an emergency.
              </p>

              <p>
                ఈ మొత్తం పత్రాన్ని నేను చదివాను / నాకు అర్థమయ్యే భాషలో దీని
                విషయాలను పూర్తిగా చదివి వివరించారు. నాకు ఉన్న సందేహాలను అడిగి
                తగిన వివరణ పొందే అవకాశం నాకు లభించింది. రిహాబిలిటేషన్ మరియు
                సంరక్షణ సేవల సాధారణ స్వభావం, పేషెంట్ / అటెండర్ బాధ్యతలు,
                ఆర్థిక బాధ్యతలు మరియు అత్యవసర పరిస్థితుల్లో అనుసరించే విధానం
                గురించి నేను అర్థం చేసుకున్నాను.
              </p>

              <p>
                I confirm that I am signing this document voluntarily and that
                the information provided by me is true and accurate to the
                best of my knowledge. I agree to comply with the terms stated
                above and to cooperate with{" "}
                <strong>ROSES Neuro Rehabilitation Centre</strong> for the
                safe and appropriate care of the patient.
              </p>

              <p>
                నేను ఎటువంటి బలవంతం లేకుండా స్వచ్ఛందంగా ఈ పత్రంపై సంతకం
                చేస్తున్నాను. నేను అందించిన సమాచారం నా పరిజ్ఞానం మేరకు
                నిజమైనది మరియు సరైనదని ధృవీకరిస్తున్నాను. పై పేర్కొన్న
                నిబంధనలను పాటిస్తూ, పేషెంట్‌కు సురక్షితమైన మరియు తగిన
                సంరక్షణ అందించేందుకు{" "}
                <strong>ROSES Neuro Rehabilitation Centre</strong>తో
                సహకరించడానికి అంగీకరిస్తున్నాను.
              </p>
            </section>

            <section className="document-section">
              <div className="section-heading">SIGNATURES / సంతకాలు</div>

              <div className="signatures-grid">
                <div className="signature-card">
                  <div className="signature-heading">
                    PATIENT / పేషెంట్
                  </div>

                  <p>
                    <strong>Name / పేరు:</strong>{" "}
                    {form.patientSignatureName ||
                      form.patientName ||
                      "____________________________"}
                  </p>

                  <div className="signature-line" />

                  <div className="signature-meta">
                    Signature / సంతకం
                  </div>

                  <p>
                    <strong>Date / తేదీ:</strong>{" "}
                    {formatDateDisplay(form.patientSignatureDate)}
                  </p>
                </div>

                <div className="signature-card">
                  <div className="signature-heading">
                    ATTENDER / GUARDIAN / అటెండర్ / సంరక్షకుడు
                  </div>

                  <p>
                    <strong>Name / పేరు:</strong>{" "}
                    {form.attenderSignatureName ||
                      form.attenderName ||
                      "____________________________"}
                  </p>

                  <p>
                    <strong>Relationship / సంబంధం:</strong>{" "}
                    {form.attenderSignatureRelationship ||
                      form.relationship ||
                      "________________"}
                  </p>

                  <div className="signature-line" />

                  <div className="signature-meta">
                    Signature / సంతకం
                  </div>

                  <p>
                    <strong>Date / తేదీ:</strong>{" "}
                    {formatDateDisplay(form.attenderSignatureDate)}
                  </p>
                </div>

                <div className="signature-card">
                  <div className="signature-heading">
                    WITNESS / సాక్షి
                  </div>

                  <p>
                    <strong>Name / పేరు:</strong>{" "}
                    {form.witnessName || "____________________________"}
                  </p>

                  <p>
                    <strong>Mobile / మొబైల్:</strong>{" "}
                    {form.witnessMobile || "________________"}
                  </p>

                  <div className="signature-line" />

                  <div className="signature-meta">
                    Signature / సంతకం
                  </div>

                  <p>
                    <strong>Date / తేదీ:</strong>{" "}
                    {formatDateDisplay(form.witnessDate)}
                  </p>
                </div>

                <div className="signature-card">
                  <div className="signature-heading">
                    FOR ROSES NEURO REHABILITATION CENTRE / సెంటర్ తరఫున
                  </div>

                  <p>
                    <strong>Representative Name / ప్రతినిధి పేరు:</strong>{" "}
                    {form.representativeName || "____________________________"}
                  </p>

                  <p>
                    <strong>Designation / హోదా:</strong>{" "}
                    {form.designation || "____________________________"}
                  </p>

                  <div className="signature-line" />

                  <div className="signature-meta">
                    Signature / సంతకం
                  </div>

                  <p>
                    <strong>Date / తేదీ:</strong>{" "}
                    {formatDateDisplay(form.representativeDate)}
                  </p>

                  <p>
                    <strong>CENTRE SEAL / సెంటర్ ముద్ర:</strong>
                  </p>
                </div>
              </div>
            </section>

            <section className="emergency-box">
              <div className="section-heading">
                EMERGENCY CONTACT DETAILS / అత్యవసర సంప్రదింపు వివరాలు
              </div>

              <p>
                <strong>Primary Contact / ప్రధాన సంప్రదింపు:</strong>{" "}
                {form.primaryContact || "____________________________"}
              </p>

              <p>
                <strong>Relationship / సంబంధం:</strong>{" "}
                {form.primaryRelationship || "________________"}{" "}
                <strong>Mobile:</strong>{" "}
                {form.primaryMobile || "________________"}
              </p>

              <p>
                <strong>
                  Alternate Contact / ప్రత్యామ్నాయ సంప్రదింపు:
                </strong>{" "}
                {form.alternateContact || "____________________________"}
              </p>

              <p>
                <strong>Mobile / మొబైల్:</strong>{" "}
                {form.alternateMobile || "____________________________"}
              </p>
            </section>

            <footer className="document-footer">
              <div>
                <strong>Document No.:</strong>{" "}
                {form.documentNo || "RNRC/CONSENT/____________"}
              </div>

              <div>
                <strong>Revision No.:</strong>{" "}
                {form.revisionNo || "________"}
              </div>

              <div>
                <strong>Effective Date:</strong>{" "}
                {formatDateDisplay(form.effectiveDate)}
              </div>

              <div style={{ marginTop: 7 }}>
                <strong>ROSES NEURO REHABILITATION CENTRE</strong>
              </div>

              <div>
                <em>
                  Service • Hope • Humanity • Revival • Education
                </em>
              </div>

              <div className="important-note">
                <strong>IMPORTANT:</strong> This is a general patient consent
                / undertaking format. Separate informed-consent documents
                should be used wherever a particular medical procedure,
                investigation, intervention or treatment requires specific
                consent under applicable professional or legal requirements.
              </div>
            </footer>
          </article>
        </main>
      </div>
    </>
  );
}