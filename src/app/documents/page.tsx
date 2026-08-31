"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

type Patient = {
  id: string;
  name?: string;
  patientName?: string;
  fullName?: string;
  age?: string | number;
  gender?: string;
  ipNumber?: string;
  ipNo?: string;
  uhid?: string;
  uhidNo?: string;
  admissionDate?: string;
  dateOfAdmission?: string;
  diagnosis?: string;
  medicalCondition?: string;
  address?: string;
  permanentAddress?: string;
  attenderName?: string;
  guardianName?: string;
  relationship?: string;
  mobile?: string;
  phone?: string;
  emergencyContact?: string;
  [key: string]: unknown;
};

type FormData = {
  patientName: string;
  age: string;
  gender: string;
  ipUhid: string;
  admissionDate: string;
  diagnosis: string;
  permanentAddress: string;

  attenderName: string;
  relationship: string;
  attenderMobile: string;
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

  patientSignature: string;
  patientSignatureDate: string;

  attenderSignature: string;
  attenderSignatureDate: string;

  witnessName: string;
  witnessMobile: string;
  witnessSignatureDate: string;

  representativeName: string;
  representativeDesignation: string;
  representativeSignatureDate: string;

  primaryContact: string;
  primaryRelationship: string;
  primaryMobile: string;

  alternateContact: string;
  alternateMobile: string;

  documentNo: string;
  revisionNo: string;
  effectiveDate: string;
};

const emptyForm: FormData = {
  patientName: "",
  age: "",
  gender: "",
  ipUhid: "",
  admissionDate: "",
  diagnosis: "",
  permanentAddress: "",

  attenderName: "",
  relationship: "",
  attenderMobile: "",
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

  patientSignature: "",
  patientSignatureDate: "",

  attenderSignature: "",
  attenderSignatureDate: "",

  witnessName: "",
  witnessMobile: "",
  witnessSignatureDate: "",

  representativeName: "",
  representativeDesignation: "",
  representativeSignatureDate: "",

  primaryContact: "",
  primaryRelationship: "",
  primaryMobile: "",

  alternateContact: "",
  alternateMobile: "",

  documentNo: "",
  revisionNo: "1.0",
  effectiveDate: "",
};

function formatDate(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString().slice(0, 10);
}

function getPatientName(patient: Patient) {
  return (
    patient.name ||
    patient.patientName ||
    patient.fullName ||
    ""
  );
}

function getPatientIpUhid(patient: Patient) {
  return (
    patient.ipNumber ||
    patient.ipNo ||
    patient.uhid ||
    patient.uhidNo ||
    ""
  );
}

function getAdmissionDate(patient: Patient) {
  return formatDate(
    patient.admissionDate ||
      patient.dateOfAdmission ||
      ""
  );
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function displayDate(value: string) {
  if (!value) return "________________";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN");
}

export default function DocumentsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [patientError, setPatientError] = useState("");

  const [selectedPatientId, setSelectedPatientId] = useState("");

  const [form, setForm] = useState<FormData>({
    ...emptyForm,
    effectiveDate: today(),
    documentNo: `RNRC/CONSENT/${new Date().getFullYear()}/001`,
  });

  const [showEditor, setShowEditor] = useState(true);

  useEffect(() => {
    async function loadPatients() {
      try {
        setLoadingPatients(true);
        setPatientError("");

        const snapshot = await getDocs(collection(db, "patients"));

       const loadedPatients: Patient[] = snapshot.docs.map((doc) => {
  const data = doc.data() as Omit<Patient, "id">;

  return {
    ...data,
    id: doc.id,
  };
});

        loadedPatients.sort((a, b) =>
          getPatientName(a).localeCompare(getPatientName(b))
        );

        setPatients(loadedPatients);
      } catch (error) {
        console.error(error);
        setPatientError(
          "Unable to load patients. Please check your Firebase configuration and permissions."
        );
      } finally {
        setLoadingPatients(false);
      }
    }

    loadPatients();
  }, []);

  function updateField<K extends keyof FormData>(
    field: K,
    value: FormData[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function selectPatient(id: string) {
    setSelectedPatientId(id);

    const patient = patients.find((item) => item.id === id);

    if (!patient) {
      return;
    }

    setForm((current) => ({
      ...current,

      patientName: getPatientName(patient),
      age:
        patient.age !== undefined && patient.age !== null
          ? String(patient.age)
          : current.age,

      gender: patient.gender || current.gender,

      ipUhid:
        getPatientIpUhid(patient) || current.ipUhid,

      admissionDate:
        getAdmissionDate(patient) || current.admissionDate,

      diagnosis:
        patient.diagnosis ||
        patient.medicalCondition ||
        current.diagnosis,

      permanentAddress:
        patient.permanentAddress ||
        patient.address ||
        current.permanentAddress,

      attenderName:
        patient.attenderName ||
        patient.guardianName ||
        current.attenderName,

      relationship:
        patient.relationship ||
        current.relationship,

      attenderMobile:
        patient.mobile ||
        patient.phone ||
        current.attenderMobile,

      emergencyContact:
        patient.emergencyContact ||
        current.emergencyContact,
    }));
  }

  function clearForm() {
    setSelectedPatientId("");

    setForm({
      ...emptyForm,
      effectiveDate: today(),
      documentNo: `RNRC/CONSENT/${new Date().getFullYear()}/001`,
    });
  }

  function handlePrint() {
    window.print();
  }

  const selectedPatient = useMemo(
    () =>
      patients.find(
        (patient) => patient.id === selectedPatientId
      ),
    [patients, selectedPatientId]
  );

  const blank = "____________________________";

  return (
    <>
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #eef1f5;
        }

        .document-page {
          width: 210mm;
          min-height: 297mm;
          margin: 18px auto;
          padding: 15mm 14mm;
          background: white;
          color: #111827;
          box-shadow: 0 3px 18px rgba(0, 0, 0, 0.12);
          font-family: Arial, "Noto Sans Telugu", sans-serif;
        }

        .document-header {
          text-align: center;
          border-bottom: 2px solid #111827;
          padding-bottom: 10px;
          margin-bottom: 18px;
        }

        .centre-name {
          font-size: 22px;
          font-weight: 800;
          letter-spacing: 0.4px;
        }

        .motto {
          margin-top: 5px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1.5px;
        }

        .document-title {
          margin-top: 15px;
          font-size: 18px;
          font-weight: 800;
        }

        .document-title-telugu {
          margin-top: 6px;
          font-size: 15px;
          font-weight: 700;
        }

        .section {
          margin-top: 20px;
          break-inside: avoid;
        }

        .section-title {
          font-size: 14px;
          font-weight: 800;
          border-bottom: 1px solid #9ca3af;
          padding-bottom: 5px;
          margin-bottom: 9px;
          text-transform: uppercase;
        }

        .section-title-telugu {
          font-size: 13px;
          font-weight: 700;
          margin-bottom: 10px;
        }

        .paragraph {
          font-size: 10.5px;
          line-height: 1.65;
          text-align: justify;
          margin: 0 0 10px;
        }

        .field-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 9px 15px;
        }

        .field {
          min-width: 0;
        }

        .field.full {
          grid-column: 1 / -1;
        }

        .field-label {
          font-size: 9px;
          font-weight: 700;
          color: #374151;
          margin-bottom: 3px;
        }

        .field-value {
          min-height: 24px;
          border-bottom: 1px solid #4b5563;
          padding: 3px 2px;
          font-size: 10px;
        }

        .field-box {
          min-height: 55px;
          border: 1px solid #6b7280;
          padding: 7px;
          font-size: 10px;
          white-space: pre-wrap;
        }

        .signatures {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 25px;
          margin-top: 14px;
        }

        .signature-box {
          min-height: 125px;
          border: 1px solid #9ca3af;
          padding: 10px;
          break-inside: avoid;
        }

        .signature-title {
          font-size: 11px;
          font-weight: 800;
          margin-bottom: 14px;
        }

        .signature-line {
          border-bottom: 1px solid #111827;
          min-height: 22px;
          margin-top: 8px;
        }

        .footer {
          margin-top: 22px;
          border-top: 1px solid #9ca3af;
          padding-top: 10px;
          text-align: center;
          font-size: 9px;
          line-height: 1.5;
        }

        .control-panel {
          width: min(1100px, calc(100% - 30px));
          margin: 18px auto;
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 12px;
          padding: 18px;
          box-shadow: 0 3px 15px rgba(0, 0, 0, 0.08);
          font-family: Arial, sans-serif;
        }

        .control-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 15px;
        }

        .control-header h1 {
          margin: 0;
          font-size: 20px;
        }

        .control-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        button {
          border: 0;
          border-radius: 7px;
          padding: 9px 13px;
          font-weight: 700;
          cursor: pointer;
        }

        .primary {
          background: #111827;
          color: white;
        }

        .secondary {
          background: #e5e7eb;
          color: #111827;
        }

        .patient-selector {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 12px;
          margin-bottom: 18px;
          align-items: center;
        }

        select,
        input,
        textarea {
          width: 100%;
          border: 1px solid #cbd5e1;
          border-radius: 7px;
          padding: 9px;
          font: inherit;
          background: white;
        }

        textarea {
          min-height: 80px;
          resize: vertical;
        }

        .editor-section {
          border-top: 1px solid #e5e7eb;
          padding-top: 15px;
          margin-top: 15px;
        }

        .editor-section h2 {
          font-size: 14px;
          margin: 0 0 12px;
        }

        .editor-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }

        .editor-field.full {
          grid-column: 1 / -1;
        }

        .editor-field label {
          display: block;
          font-size: 11px;
          font-weight: 700;
          margin-bottom: 4px;
          color: #374151;
        }

        .error {
          background: #fee2e2;
          color: #991b1b;
          padding: 10px;
          border-radius: 7px;
          font-size: 12px;
          margin-bottom: 12px;
        }

        .selected-patient {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 7px;
          padding: 9px 11px;
          font-size: 12px;
          margin-bottom: 12px;
        }

        @media (max-width: 800px) {
          .document-page {
            width: 100%;
            min-height: auto;
            margin: 0;
            padding: 20px;
            box-shadow: none;
          }

          .editor-grid,
          .field-grid,
          .signatures {
            grid-template-columns: 1fr;
          }

          .patient-selector {
            grid-template-columns: 1fr;
          }
        }

        @media print {
          @page {
            size: A4;
            margin: 0;
          }

          body {
            background: white !important;
          }

          .no-print {
            display: none !important;
          }

          .document-page {
            width: 210mm;
            min-height: 297mm;
            margin: 0;
            padding: 13mm 14mm;
            box-shadow: none;
          }

          .section {
            break-inside: avoid;
          }

          .paragraph {
            orphans: 3;
            widows: 3;
          }
        }
      `}</style>

      <div className="control-panel no-print">
        <div className="control-header">
          <h1>Patient Consent Document</h1>

          <div className="control-actions">
            <button
              className="secondary"
              onClick={() => setShowEditor((value) => !value)}
            >
              {showEditor ? "Hide Editor" : "Show Editor"}
            </button>

            <button
              className="secondary"
              onClick={clearForm}
            >
              Clear
            </button>

            <button
              className="primary"
              onClick={handlePrint}
            >
              Print / Save PDF
            </button>
          </div>
        </div>

        {patientError && (
          <div className="error">
            {patientError}
          </div>
        )}

        <div className="patient-selector">
          <strong>Select Existing Patient</strong>

          <select
            value={selectedPatientId}
            onChange={(event) =>
              selectPatient(event.target.value)
            }
            disabled={loadingPatients}
          >
            <option value="">
              {loadingPatients
                ? "Loading patients..."
                : "— Select a patient —"}
            </option>

            {patients.map((patient) => (
              <option
                key={patient.id}
                value={patient.id}
              >
                {getPatientName(patient) || "Unnamed Patient"}
                {getPatientIpUhid(patient)
                  ? ` — ${getPatientIpUhid(patient)}`
                  : ""}
              </option>
            ))}
          </select>
        </div>

        {selectedPatient && (
          <div className="selected-patient">
            Selected:{" "}
            <strong>
              {getPatientName(selectedPatient)}
            </strong>
            {getPatientIpUhid(selectedPatient)
              ? ` • ${getPatientIpUhid(selectedPatient)}`
              : ""}
          </div>
        )}

        {showEditor && (
          <>
            <div className="editor-section">
              <h2>Patient Information</h2>

              <div className="editor-grid">
                <EditorInput
                  label="Patient / Resident Name"
                  value={form.patientName}
                  onChange={(value) =>
                    updateField("patientName", value)
                  }
                />

                <EditorInput
                  label="Age"
                  value={form.age}
                  onChange={(value) =>
                    updateField("age", value)
                  }
                />

                <EditorInput
                  label="Gender"
                  value={form.gender}
                  onChange={(value) =>
                    updateField("gender", value)
                  }
                />

                <EditorInput
                  label="IP / UHID No."
                  value={form.ipUhid}
                  onChange={(value) =>
                    updateField("ipUhid", value)
                  }
                />

                <EditorInput
                  label="Date of Admission"
                  type="date"
                  value={form.admissionDate}
                  onChange={(value) =>
                    updateField("admissionDate", value)
                  }
                />

                <EditorInput
                  label="Diagnosis / Medical Condition"
                  value={form.diagnosis}
                  onChange={(value) =>
                    updateField("diagnosis", value)
                  }
                />

                <EditorTextarea
                  label="Permanent Address"
                  value={form.permanentAddress}
                  onChange={(value) =>
                    updateField(
                      "permanentAddress",
                      value
                    )
                  }
                />
              </div>
            </div>

            <div className="editor-section">
              <h2>Attender / Guardian</h2>

              <div className="editor-grid">
                <EditorInput
                  label="Attender / Guardian Name"
                  value={form.attenderName}
                  onChange={(value) =>
                    updateField(
                      "attenderName",
                      value
                    )
                  }
                />

                <EditorInput
                  label="Relationship"
                  value={form.relationship}
                  onChange={(value) =>
                    updateField(
                      "relationship",
                      value
                    )
                  }
                />

                <EditorInput
                  label="Mobile"
                  value={form.attenderMobile}
                  onChange={(value) =>
                    updateField(
                      "attenderMobile",
                      value
                    )
                  }
                />

                <EditorInput
                  label="Emergency Contact"
                  value={form.emergencyContact}
                  onChange={(value) =>
                    updateField(
                      "emergencyContact",
                      value
                    )
                  }
                />
              </div>
            </div>

            <div className="editor-section">
              <h2>Financial Terms</h2>

              <div className="editor-grid">
                <EditorInput
                  label="Admission / Deposit"
                  value={form.admissionDeposit}
                  onChange={(value) =>
                    updateField(
                      "admissionDeposit",
                      value
                    )
                  }
                />

                <EditorInput
                  label="Room / Bed Charges"
                  value={form.roomBedCharges}
                  onChange={(value) =>
                    updateField(
                      "roomBedCharges",
                      value
                    )
                  }
                />

                <EditorInput
                  label="Daily / Monthly Package"
                  value={form.packageCharges}
                  onChange={(value) =>
                    updateField(
                      "packageCharges",
                      value
                    )
                  }
                />

                <EditorInput
                  label="Other Charges"
                  value={form.otherCharges}
                  onChange={(value) =>
                    updateField(
                      "otherCharges",
                      value
                    )
                  }
                />

             <EditorInput
  label="Payment Mode"
  value={form.paymentMode}
  onChange={(value) =>
    updateField(
      "paymentMode",
      value
    )
  }
/>
</div>
            </div>

            <div className="editor-section">
              <h2>Other Details</h2>

              <div className="editor-grid">
                <EditorTextarea
                  label="Items Deposited With Centre"
                  value={form.depositedItems}
                  onChange={(value) =>
                    updateField(
                      "depositedItems",
                      value
                    )
                  }
                />

                <EditorInput
                  label="Authorised Contact Person"
                  value={form.authorisedContact}
                  onChange={(value) =>
                    updateField(
                      "authorisedContact",
                      value
                    )
                  }
                />

                <EditorInput
                  label="Authorised Relationship"
                  value={form.authorisedRelationship}
                  onChange={(value) =>
                    updateField(
                      "authorisedRelationship",
                      value
                    )
                  }
                />

                <EditorInput
                  label="Authorised Mobile"
                  value={form.authorisedMobile}
                  onChange={(value) =>
                    updateField(
                      "authorisedMobile",
                      value
                    )
                  }
                />

                <EditorInput
                  label="Primary Emergency Contact"
                  value={form.primaryContact}
                  onChange={(value) =>
                    updateField(
                      "primaryContact",
                      value
                    )
                  }
                />

                <EditorInput
                  label="Primary Relationship"
                  value={form.primaryRelationship}
                  onChange={(value) =>
                    updateField(
                      "primaryRelationship",
                      value
                    )
                  }
                />

                <EditorInput
                  label="Primary Mobile"
                  value={form.primaryMobile}
                  onChange={(value) =>
                    updateField(
                      "primaryMobile",
                      value
                    )
                  }
                />

                <EditorInput
                  label="Alternate Contact"
                  value={form.alternateContact}
                  onChange={(value) =>
                    updateField(
                      "alternateContact",
                      value
                    )
                  }
                />

                <EditorInput
                  label="Alternate Mobile"
                  value={form.alternateMobile}
                  onChange={(value) =>
                    updateField(
                      "alternateMobile",
                      value
                    )
                  }
                />
              </div>
            </div>

            <div className="editor-section">
              <h2>Document Control</h2>

              <div className="editor-grid">
                <EditorInput
                  label="Document No."
                  value={form.documentNo}
                  onChange={(value) =>
                    updateField(
                      "documentNo",
                      value
                    )
                  }
                />

                <EditorInput
                  label="Revision No."
                  value={form.revisionNo}
                  onChange={(value) =>
                    updateField(
                      "revisionNo",
                      value
                    )
                  }
                />

                <EditorInput
                  label="Effective Date"
                  type="date"
                  value={form.effectiveDate}
                  onChange={(value) =>
                    updateField(
                      "effectiveDate",
                      value
                    )
                  }
                />
              </div>
            </div>
          </>
        )}
      </div>

      <main className="document-page">
        <header className="document-header">
          <div className="centre-name">
            ROSES NEURO REHABILITATION CENTRE
          </div>

          <div className="motto">
            SERVICE • HOPE • HUMANITY • REVIVAL • EDUCATION
          </div>

          <div className="document-title">
            PATIENT & ATTENDER CONSENT, AGREEMENT AND UNDERTAKING
          </div>

          <div className="document-title-telugu">
            పేషెంట్ మరియు అటెండర్ అంగీకార పత్రం, ఒప్పందం మరియు బాధ్యత ప్రకటన
          </div>
        </header>

        <section className="section">
          <div className="field-grid">
            <PrintField
              label="Patient / Resident Name / పేషెంట్ పేరు"
              value={form.patientName}
            />

            <PrintField
              label="Age / వయస్సు"
              value={form.age}
            />

            <PrintField
              label="Gender / లింగం"
              value={form.gender}
            />

            <PrintField
              label="IP / UHID No."
              value={form.ipUhid}
            />

            <PrintField
              label="Date of Admission / చేరిన తేదీ"
              value={displayDate(form.admissionDate)}
            />

            <PrintField
              label="Diagnosis / Medical Condition / వైద్య నిర్ధారణ / ఆరోగ్య పరిస్థితి"
              value={form.diagnosis}
            />

            <div className="field full">
              <div className="field-label">
                Permanent Address / శాశ్వత చిరునామా
              </div>
              <div className="field-box">
                {form.permanentAddress || blank}
              </div>
            </div>

            <PrintField
              label="Attender / Guardian Name / అటెండర్ / సంరక్షకుని పేరు"
              value={form.attenderName}
            />

            <PrintField
              label="Relationship / సంబంధం"
              value={form.relationship}
            />

            <PrintField
              label="Mobile / మొబైల్"
              value={form.attenderMobile}
            />

            <PrintField
              label="Emergency Contact / అత్యవసర సంప్రదింపు"
              value={form.emergencyContact}
            />
          </div>
        </section>

        <section className="section">
          <div className="section-title">
            CONSENT, AGREEMENT AND UNDERTAKING
          </div>

          <div className="section-title-telugu">
            అంగీకారం, ఒప్పందం మరియు బాధ్యత ప్రకటన
          </div>

          <p className="paragraph">
            I, the undersigned patient / parent / guardian / authorised attendant, hereby voluntarily agree to admit and/or continue the above-mentioned patient at <strong>ROSES Neuro Rehabilitation Centre</strong> for appropriate rehabilitation, nursing care, physiotherapy, occupational and supportive rehabilitation services, medical supervision and other services considered necessary according to the patient's condition and the professional advice of the treating medical team.
          </p>

          <p className="paragraph">
            నేను క్రింద సంతకం చేసిన పేషెంట్ / తల్లిదండ్రి / సంరక్షకుడు / అధీకృత అటెండర్‌గా, పై పేర్కొన్న పేషెంట్‌ను వారి ఆరోగ్య పరిస్థితికి అనుగుణంగా మరియు చికిత్స అందించే వైద్య బృందం / సంబంధిత నిపుణుల సూచనల మేరకు <strong>ROSES Neuro Rehabilitation Centre</strong>లో తగిన రిహాబిలిటేషన్, నర్సింగ్ కేర్, ఫిజియోథెరపీ, ఆక్యుపేషనల్ మరియు ఇతర సహాయక పునరావాస సేవలు, వైద్య పర్యవేక్షణ మరియు అవసరమైన ఇతర సేవల కోసం చేర్పించడానికి / కొనసాగించడానికి నా స్వచ్ఛంద అంగీకారాన్ని తెలియజేస్తున్నాను.
          </p>

          <p className="paragraph">
            I confirm that the patient's relevant medical history, previous treatment details, current medicines, known allergies, previous operations, significant medical conditions and other information known to me have been disclosed to the centre to the best of my knowledge. I understand that incomplete or incorrect information may affect the assessment and care of the patient.
          </p>

          <p className="paragraph">
            పేషెంట్‌కు సంబంధించిన వైద్య చరిత్ర, గత చికిత్స వివరాలు, ప్రస్తుతం ఉపయోగిస్తున్న మందులు, తెలిసిన అలర్జీలు, గత శస్త్రచికిత్సలు, ముఖ్యమైన ఆరోగ్య సమస్యలు మరియు నాకు తెలిసిన ఇతర సంబంధిత సమాచారాన్ని నా పరిజ్ఞానం మేరకు సెంటర్‌కు అందించినట్లు నేను ధృవీకరిస్తున్నాను. అసంపూర్ణమైన లేదా తప్పు సమాచారం పేషెంట్ పరిశీలన మరియు సంరక్షణపై ప్రభావం చూపవచ్చని నేను అర్థం చేసుకున్నాను.
          </p>

          <p className="paragraph">
            I understand that neuro-rehabilitation is generally a gradual and ongoing process. The duration of rehabilitation and the level of improvement may differ from one patient to another and may depend on the patient's diagnosis, severity of illness, physical and cognitive condition, participation, cooperation, response to therapy and other medical or personal factors. No specific outcome or recovery time is guaranteed unless expressly stated in writing by the treating professional.
          </p>

          <p className="paragraph">
            న్యూరో రిహాబిలిటేషన్ సాధారణంగా క్రమంగా మరియు నిరంతరం కొనసాగాల్సిన ప్రక్రియ అని నేను అర్థం చేసుకున్నాను. రిహాబిలిటేషన్ వ్యవధి మరియు పేషెంట్‌లో కనిపించే మెరుగుదల ప్రతి వ్యక్తిలో భిన్నంగా ఉండవచ్చు. పేషెంట్‌కు ఉన్న వైద్య నిర్ధారణ, సమస్య తీవ్రత, శారీరక మరియు మానసిక స్థితి, చికిత్సలో పాల్గొనడం, సహకారం, థెరపీకి స్పందన మరియు ఇతర వైద్య / వ్యక్తిగత అంశాలపై ఫలితాలు ఆధారపడి ఉండవచ్చు. చికిత్స అందించే నిపుణుడు ప్రత్యేకంగా లిఖితపూర్వకంగా హామీ ఇచ్చిన సందర్భం తప్ప, నిర్దిష్ట రికవరీ సమయం లేదా ఫలితానికి హామీ ఉండదని నేను అర్థం చేసుకున్నాను.
          </p>

          <p className="paragraph">
            I agree that the patient will participate in the rehabilitation programme as reasonably possible and will follow the instructions provided by the doctors, physiotherapists, nurses, therapists and other authorised staff. I understand that regular participation, appropriate rest, nutrition, medication compliance and cooperation may be important for rehabilitation.
          </p>

          <p className="paragraph">
            పేషెంట్ సాధ్యమైనంతవరకు రిహాబిలిటేషన్ కార్యక్రమంలో పాల్గొని, వైద్యులు, ఫిజియోథెరపిస్టులు, నర్సులు, థెరపిస్టులు మరియు ఇతర అధీకృత సిబ్బంది ఇచ్చే సూచనలను పాటించడానికి నేను అంగీకరిస్తున్నాను. క్రమమైన థెరపీ, తగిన విశ్రాంతి, పోషకాహారం, మందులను సూచించిన విధంగా తీసుకోవడం మరియు సహకారం రిహాబిలిటేషన్‌లో ముఖ్యమైన పాత్ర పోషించవచ్చని నేను అర్థం చేసుకున్నాను.
          </p>

          <p className="paragraph">
            The centre may provide nursing and daily-care assistance according to the patient's assessed needs. Such assistance may include medication administration as prescribed, monitoring of vital signs when required, assistance with feeding, personal hygiene, positioning, mobility, transfer to a wheelchair, basic activities of daily living and other supportive care within the scope of services available at the centre.
          </p>

          <p className="paragraph">
            పేషెంట్ అవసరాలను బట్టి సెంటర్ నర్సింగ్ మరియు రోజువారీ సంరక్షణలో సహాయం అందించవచ్చు. ఇందులో వైద్యుల సూచనల ప్రకారం మందులు అందించడం, అవసరమైనప్పుడు వైటల్ సైన్స్ పరిశీలించడం, ఫీడింగ్‌లో సహాయం, వ్యక్తిగత పరిశుభ్రత, పొజిషన్ మార్చడం, కదలికలో సహాయం, వీల్‌చైర్‌కు మార్చడంలో సహాయం, రోజువారీ ప్రాథమిక పనుల్లో సహాయం మరియు సెంటర్ పరిధిలో అందుబాటులో ఉన్న ఇతర సహాయక సేవలు ఉండవచ్చు.
          </p>

          <p className="paragraph">
            I understand that physiotherapy, occupational therapy, speech and swallowing rehabilitation, cognitive rehabilitation or other specialised rehabilitation services may be recommended depending on the patient's condition and availability. The rehabilitation programme may be modified, increased, reduced, paused or discontinued based on clinical assessment and professional advice.
          </p>

          <p className="paragraph">
            పేషెంట్ పరిస్థితిని బట్టి ఫిజియోథెరపీ, ఆక్యుపేషనల్ థెరపీ, స్పీచ్ మరియు స్వాలోయింగ్ రిహాబిలిటేషన్, కాగ్నిటివ్ రిహాబిలిటేషన్ లేదా ఇతర ప్రత్యేక పునరావాస సేవలు సూచించబడవచ్చు. వైద్య / క్లినికల్ పరిశీలన మరియు నిపుణుల సూచనల ఆధారంగా రిహాబిలిటేషన్ కార్యక్రమాన్ని మార్చడం, పెంచడం, తగ్గించడం, తాత్కాలికంగా నిలిపివేయడం లేదా ముగించడం జరగవచ్చని నేను అర్థం చేసుకున్నాను.
          </p>
        </section>

        <section className="section">
          <div className="section-title">
            MEDICATION, FEEDING AND MEDICAL INFORMATION
          </div>

          <div className="section-title-telugu">
            మందులు, ఫీడింగ్ మరియు వైద్య సమాచారం
          </div>

          <p className="paragraph">
            All medicines shall be administered or supervised according to the prescription and instructions of the treating medical professional. The patient / attendant shall not independently alter, stop, add or substitute medicines without informing the treating team. Any outside prescription, medicine or treatment brought by the family should be disclosed to the centre.
          </p>

          <p className="paragraph">
            మందులు చికిత్స అందించే వైద్య నిపుణుల ప్రిస్క్రిప్షన్ మరియు సూచనల ప్రకారం మాత్రమే ఇవ్వబడతాయి / పర్యవేక్షించబడతాయి. వైద్య బృందానికి సమాచారం ఇవ్వకుండా పేషెంట్ / అటెండర్ స్వయంగా మందులను మార్చడం, నిలిపివేయడం, కొత్త మందులు కలపడం లేదా ప్రత్యామ్నాయ మందులు ఇవ్వకూడదు. కుటుంబ సభ్యులు బయట నుండి తీసుకువచ్చే ఏదైనా మందు లేదా చికిత్స గురించి సెంటర్‌కు సమాచారం ఇవ్వాలి.
          </p>

          <p className="paragraph">
            Where feeding assistance is required, feeding shall be carried out according to the patient's assessed needs and the advice of the treating team. The attendant must inform the centre about swallowing difficulties, choking episodes, dietary restrictions, allergies or any previous feeding-related problem.
          </p>

          <p className="paragraph">
            ఫీడింగ్‌లో సహాయం అవసరమైనప్పుడు, పేషెంట్ అవసరాలు మరియు చికిత్సా బృందం సూచనల ప్రకారం ఫీడింగ్ నిర్వహించబడుతుంది. మింగడంలో ఇబ్బంది, ఆహారం తీసుకునేటప్పుడు సమస్యలు, ఆహార పరిమితులు, అలర్జీలు లేదా గతంలో ఫీడింగ్‌కు సంబంధించిన సమస్యలు ఉంటే అటెండర్ సెంటర్‌కు తెలియజేయాలి.
          </p>
        </section>

        <section className="section">
          <div className="section-title">
            EMERGENCY AND TRANSFER
          </div>

          <div className="section-title-telugu">
            అత్యవసర పరిస్థితులు మరియు ఆసుపత్రికి తరలింపు
          </div>

          <p className="paragraph">
            I understand that rehabilitation centres may encounter situations in which a patient's medical condition changes unexpectedly or requires medical investigation, emergency treatment or hospital-level care. In such circumstances, the centre may advise or arrange, as appropriate, transfer or referral to a hospital / emergency medical facility. The emergency contact person will be informed as soon as reasonably possible.
          </p>

          <p className="paragraph">
            రిహాబిలిటేషన్ సెంటర్‌లో ఉన్న సమయంలో పేషెంట్ ఆరోగ్య పరిస్థితి అనుకోకుండా మారవచ్చని లేదా వైద్య పరీక్షలు, అత్యవసర చికిత్స లేదా ఆసుపత్రి స్థాయి వైద్య సంరక్షణ అవసరం కావచ్చని నేను అర్థం చేసుకున్నాను. అలాంటి పరిస్థితుల్లో అవసరాన్ని బట్టి ఆసుపత్రి / అత్యవసర వైద్య కేంద్రానికి తరలించాలని సెంటర్ సూచించవచ్చు లేదా రిఫర్ చేయవచ్చు. సాధ్యమైనంత త్వరగా అత్యవసర సంప్రదింపు వ్యక్తికి సమాచారం అందించబడుతుంది.
          </p>

          <p className="paragraph">
            The patient / attendant agrees to cooperate with reasonable emergency instructions and provide the necessary emergency contact and medical information without delay.
          </p>

          <p className="paragraph">
            పేషెంట్ / అటెండర్ అత్యవసర పరిస్థితుల్లో సిబ్బంది ఇచ్చే తగిన సూచనలకు సహకరించి, అవసరమైన అత్యవసర సంప్రదింపు మరియు వైద్య సమాచారాన్ని ఆలస్యం లేకుండా అందించడానికి అంగీకరిస్తున్నారు.
          </p>
        </section>

        <section className="section">
          <div className="section-title">
            FINANCIAL TERMS AND PAYMENT RESPONSIBILITY
          </div>

          <div className="section-title-telugu">
            ఆర్థిక నిబంధనలు మరియు చెల్లింపు బాధ్యత
          </div>

          <p className="paragraph">
            I agree to pay all applicable charges for accommodation, nursing care, rehabilitation, physiotherapy, medicines, consumables, investigations, procedures, special services and other services provided to the patient, according to the applicable tariff, package or written quotation communicated by the centre.
          </p>

          <p className="paragraph">
            పేషెంట్‌కు అందించే వసతి, నర్సింగ్ కేర్, రిహాబిలిటేషన్, ఫిజియోథెరపీ, మందులు, కన్స్యూమబుల్స్, పరీక్షలు, విధానాలు, ప్రత్యేక సేవలు మరియు ఇతర సేవలకు వర్తించే చార్జీలను సెంటర్ తెలియజేసిన టారిఫ్ / ప్యాకేజీ / లిఖితపూర్వక అంచనా ప్రకారం చెల్లించడానికి నేను అంగీకరిస్తున్నాను.
          </p>

          <div className="field-grid">
            <PrintField
              label="Admission / Deposit / అడ్మిషన్ / డిపాజిట్"
              value={form.admissionDeposit}
              prefix="₹ "
            />

            <PrintField
              label="Room / Bed Charges / గది / బెడ్ చార్జీలు"
              value={form.roomBedCharges}
              prefix="₹ "
            />

            <PrintField
              label="Daily / Monthly Package / రోజువారీ / నెలవారీ ప్యాకేజీ"
              value={form.packageCharges}
              prefix="₹ "
            />

            <PrintField
              label="Other Charges / ఇతర చార్జీలు"
              value={form.otherCharges}
              prefix="₹ "
            />

            <PrintField
              label="Payment Mode / చెల్లింపు విధానం"
              value={form.paymentMode}
            />
          </div>

          <p className="paragraph">
            Additional investigations, medicines, procedures, consumables, emergency services or outside hospital services, where applicable, may involve additional charges. I agree to settle such applicable charges as per the centre's billing terms.
          </p>

          <p className="paragraph">
            అవసరమైన అదనపు పరీక్షలు, మందులు, విధానాలు, కన్స్యూమబుల్స్, అత్యవసర సేవలు లేదా బయట ఆసుపత్రి సేవలకు వర్తించే అదనపు చార్జీలు ఉండవచ్చు. అలాంటి వర్తించే మొత్తాలను సెంటర్ బిల్లింగ్ నిబంధనల ప్రకారం చెల్లించడానికి నేను అంగీకరిస్తున్నాను.
          </p>
        </section>

        <section className="section">
          <div className="section-title">
            PATIENT BELONGINGS AND PERSONAL PROPERTY
          </div>

          <div className="section-title-telugu">
            పేషెంట్ వ్యక్తిగత వస్తువులు
          </div>

          <p className="paragraph">
            The patient / attendant is advised not to keep large amounts of cash, jewellery or other valuable personal belongings at the centre. Valuable items should preferably remain with the family / attendant. Any item specifically deposited with the centre should be recorded separately.
          </p>

          <p className="paragraph">
            పేషెంట్ / అటెండర్ పెద్ద మొత్తంలో నగదు, నగలు లేదా ఇతర విలువైన వస్తువులను సెంటర్‌లో ఉంచకుండా కుటుంబ సభ్యుల వద్ద భద్రంగా ఉంచుకోవాలని సూచించబడింది. సెంటర్ వద్ద ప్రత్యేకంగా అప్పగించిన విలువైన వస్తువులు ఉంటే వాటిని విడిగా నమోదు చేయాలి.
          </p>

          <div className="field full">
            <div className="field-label">
              Items deposited with centre, if any / సెంటర్ వద్ద అప్పగించిన వస్తువులు
            </div>

            <div className="field-box">
              {form.depositedItems || blank}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-title">
            ATTENDER RESPONSIBILITIES
          </div>

          <div className="section-title-telugu">
            అటెండర్ బాధ్యతలు
          </div>

          <p className="paragraph">
            The patient / attendant agrees to provide complete cooperation to the rehabilitation team, follow reasonable centre rules, maintain respectful behaviour towards staff and other patients, provide correct medical information, inform the staff promptly about any change in the patient's condition and comply with safety instructions. The attendant shall not interfere with professional treatment decisions or independently instruct staff to change prescribed treatment.
          </p>

          <p className="paragraph">
            పేషెంట్ / అటెండర్ రిహాబిలిటేషన్ బృందంతో పూర్తి సహకారం అందించాలి, సెంటర్‌లోని తగిన నియమాలను పాటించాలి, సిబ్బంది మరియు ఇతర పేషెంట్ల పట్ల గౌరవప్రదంగా ప్రవర్తించాలి, సరైన వైద్య సమాచారాన్ని అందించాలి, పేషెంట్ ఆరోగ్య పరిస్థితిలో ఏదైనా మార్పు ఉంటే వెంటనే సిబ్బందికి తెలియజేయాలి మరియు భద్రతా సూచనలను పాటించాలి. వైద్య నిపుణుల చికిత్సా నిర్ణయాల్లో అనవసరంగా జోక్యం చేసుకోకూడదు మరియు సూచించిన చికిత్సను మార్చమని సిబ్బందికి స్వయంగా ఆదేశాలు ఇవ్వకూడదు.
          </p>

          <p className="paragraph">
            The centre expects a safe, peaceful and respectful environment for all patients, attendants and staff. Abusive, threatening, violent, discriminatory or seriously disruptive behaviour shall not be permitted.
          </p>

          <p className="paragraph">
            అన్ని పేషెంట్లు, అటెండర్లు మరియు సిబ్బందికి సురక్షితమైన, ప్రశాంతమైన మరియు గౌరవప్రదమైన వాతావరణం ఉండేలా చూడటం సెంటర్ ఉద్దేశ్యం. దురుసైన, బెదిరింపు, హింసాత్మక, వివక్షతో కూడిన లేదా తీవ్రమైన అంతరాయం కలిగించే ప్రవర్తన అనుమతించబడదు.
          </p>
        </section>

        <section className="section">
          <div className="section-title">
            CONFIDENTIALITY AND COMMUNICATION
          </div>

          <div className="section-title-telugu">
            గోప్యత మరియు సమాచార మార్పిడి
          </div>

          <p className="paragraph">
            The centre shall handle patient information in accordance with applicable professional, privacy and legal requirements. The patient / authorised attendant may be contacted regarding appointments, treatment schedules, care-related matters, billing and necessary administrative communication.
          </p>

          <p className="paragraph">
            సెంటర్ పేషెంట్ సమాచారాన్ని వర్తించే వృత్తిపరమైన, గోప్యతా మరియు చట్టపరమైన నిబంధనలకు అనుగుణంగా నిర్వహిస్తుంది. అపాయింట్‌మెంట్లు, చికిత్స షెడ్యూల్, సంరక్షణకు సంబంధించిన విషయాలు, బిల్లింగ్ మరియు అవసరమైన పరిపాలనా సమాచారానికి సంబంధించి పేషెంట్ / అధీకృత అటెండర్‌ను సంప్రదించవచ్చు.
          </p>

          <div className="field-grid">
            <PrintField
              label="Authorised Contact Person / అధీకృత సంప్రదింపు వ్యక్తి"
              value={form.authorisedContact}
            />

            <PrintField
              label="Relationship / సంబంధం"
              value={form.authorisedRelationship}
            />

            <PrintField
              label="Mobile / మొబైల్"
              value={form.authorisedMobile}
            />
          </div>
        </section>

        <section className="section">
          <div className="section-title">
            LEAVE, DISCHARGE AND TERMINATION OF SERVICES
          </div>

          <div className="section-title-telugu">
            సెలవు, డిశ్చార్జ్ మరియు సేవల ముగింపు
          </div>

          <p className="paragraph">
            Discharge shall ordinarily be planned in consultation with the treating team and centre management. The patient / attendant agrees to complete applicable billing, documentation and discharge formalities before leaving the centre.
          </p>

          <p className="paragraph">
            డిశ్చార్జ్ సాధారణంగా చికిత్సా బృందం మరియు సెంటర్ యాజమాన్యంతో సంప్రదించి ప్రణాళిక చేయబడుతుంది. సెంటర్ నుండి వెళ్లే ముందు వర్తించే బిల్లింగ్, పత్రాల మరియు డిశ్చార్జ్ ప్రక్రియలను పూర్తి చేయడానికి పేషెంట్ / అటెండర్ అంగీకరిస్తున్నారు.
          </p>

          <p className="paragraph">
            If the patient / attendant wishes to discontinue rehabilitation or leave against professional advice, the relevant documentation may be completed and the patient / attendant may be requested to acknowledge the decision in writing.
          </p>

          <p className="paragraph">
            పేషెంట్ / అటెండర్ రిహాబిలిటేషన్‌ను నిలిపివేయాలని లేదా నిపుణుల సూచనకు విరుద్ధంగా సెంటర్‌ను విడిచి వెళ్లాలని కోరుకుంటే, సంబంధిత పత్రాలను పూర్తి చేయవలసి ఉండవచ్చు మరియు ఆ నిర్ణయాన్ని లిఖితపూర్వకంగా ధృవీకరించమని కోరవచ్చు.
          </p>
        </section>

        <section className="section">
          <div className="section-title">
            DECLARATION
          </div>

          <div className="section-title-telugu">
            తుది ప్రకటన
          </div>

          <p className="paragraph">
            I declare that I have read this entire document, or that the contents have been read and explained to me in a language that I understand. I have had an opportunity to ask questions and obtain clarification. I understand the general nature of the rehabilitation and care services, the responsibilities of the patient / attendant, the financial obligations and the procedures applicable in case of an emergency.
          </p>

          <p className="paragraph">
            ఈ మొత్తం పత్రాన్ని నేను చదివాను / నాకు అర్థమయ్యే భాషలో దీని విషయాలను పూర్తిగా చదివి వివరించారు. నాకు ఉన్న సందేహాలను అడిగి తగిన వివరణ పొందే అవకాశం నాకు లభించింది. రిహాబిలిటేషన్ మరియు సంరక్షణ సేవల సాధారణ స్వభావం, పేషెంట్ / అటెండర్ బాధ్యతలు, ఆర్థిక బాధ్యతలు మరియు అత్యవసర పరిస్థితుల్లో అనుసరించే విధానం గురించి నేను అర్థం చేసుకున్నాను.
          </p>

          <p className="paragraph">
            I confirm that I am signing this document voluntarily and that the information provided by me is true and accurate to the best of my knowledge. I agree to comply with the terms stated above and to cooperate with <strong>ROSES Neuro Rehabilitation Centre</strong> for the safe and appropriate care of the patient.
          </p>

          <p className="paragraph">
            నేను ఎటువంటి బలవంతం లేకుండా స్వచ్ఛందంగా ఈ పత్రంపై సంతకం చేస్తున్నాను. నేను అందించిన సమాచారం నా పరిజ్ఞానం మేరకు నిజమైనది మరియు సరైనదని ధృవీకరిస్తున్నాను. పై పేర్కొన్న నిబంధనలను పాటిస్తూ, పేషెంట్‌కు సురక్షితమైన మరియు తగిన సంరక్షణ అందించేందుకు <strong>ROSES Neuro Rehabilitation Centre</strong>తో సహకరించడానికి అంగీకరిస్తున్నాను.
          </p>
        </section>

        <section className="section">
          <div className="section-title">
            SIGNATURES / సంతకాలు
          </div>

          <div className="signatures">
            <SignatureBox
              title="PATIENT / పేషెంట్"
              lines={[
                `Name / పేరు: ${form.patientName || blank}`,
                `Signature / సంతకం: ${blank}`,
                `Date / తేదీ: ${displayDate(
                  form.patientSignatureDate
                )}`,
              ]}
            />

            <SignatureBox
              title="ATTENDER / GUARDIAN / అటెండర్ / సంరక్షకుడు"
              lines={[
                `Name / పేరు: ${form.attenderName || blank}`,
                `Relationship / సంబంధం: ${
                  form.relationship || blank
                }`,
                `Signature / సంతకం: ${blank}`,
                `Date / తేదీ: ${displayDate(
                  form.attenderSignatureDate
                )}`,
              ]}
            />

            <SignatureBox
              title="WITNESS / సాక్షి"
              lines={[
                `Name / పేరు: ${form.witnessName || blank}`,
                `Mobile / మొబైల్: ${
                  form.witnessMobile || blank
                }`,
                `Signature / సంతకం: ${blank}`,
                `Date / తేదీ: ${displayDate(
                  form.witnessSignatureDate
                )}`,
              ]}
            />

            <SignatureBox
              title="FOR ROSES NEURO REHABILITATION CENTRE / సెంటర్ తరఫున"
              lines={[
                `Representative Name / ప్రతినిధి పేరు: ${
                  form.representativeName || blank
                }`,
                `Designation / హోదా: ${
                  form.representativeDesignation ||
                  blank
                }`,
                `Signature / సంతకం: ${blank}`,
                `Date / తేదీ: ${displayDate(
                  form.representativeSignatureDate
                )}`,
                `CENTRE SEAL / సెంటర్ ముద్ర: ${blank}`,
              ]}
            />
          </div>
        </section>

        <section className="section">
          <div className="section-title">
            EMERGENCY CONTACT DETAILS / అత్యవసర సంప్రదింపు వివరాలు
          </div>

          <div className="field-grid">
            <PrintField
              label="Primary Contact / ప్రధాన సంప్రదింపు"
              value={form.primaryContact}
            />

            <PrintField
              label="Relationship / సంబంధం"
              value={form.primaryRelationship}
            />

            <PrintField
              label="Mobile"
              value={form.primaryMobile}
            />

            <PrintField
              label="Alternate Contact / ప్రత్యామ్నాయ సంప్రదింపు"
              value={form.alternateContact}
            />

            <PrintField
              label="Mobile / మొబైల్"
              value={form.alternateMobile}
            />
          </div>
        </section>

        <footer className="footer">
          <div>
            <strong>Document No.:</strong>{" "}
            {form.documentNo || blank}
            {"   "}
            <strong>Revision No.:</strong>{" "}
            {form.revisionNo || blank}
            {"   "}
            <strong>Effective Date:</strong>{" "}
            {displayDate(form.effectiveDate)}
          </div>

          <div style={{ marginTop: 8 }}>
            <strong>
              ROSES NEURO REHABILITATION CENTRE
            </strong>
          </div>

          <div>
            <em>
              Service • Hope • Humanity • Revival • Education
            </em>
          </div>

          <div style={{ marginTop: 10 }}>
            <strong>IMPORTANT:</strong> This is a general patient
            consent / undertaking format. Separate
            informed-consent documents should be used wherever
            a particular medical procedure, investigation,
            intervention or treatment requires specific consent
            under applicable professional or legal requirements.
          </div>
        </footer>
      </main>
    </>
  );
}

function EditorInput({
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
    <div className="editor-field">
      <label>{label}</label>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
      />
    </div>
  );
}

function EditorTextarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="editor-field full">
      <label>{label}</label>

      <textarea
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
      />
    </div>
  );
}

function PrintField({
  label,
  value,
  prefix = "",
}: {
  label: string;
  value: string;
  prefix?: string;
}) {
  return (
    <div className="field">
      <div className="field-label">
        {label}
      </div>

      <div className="field-value">
        {value ? `${prefix}${value}` : "________________"}
      </div>
    </div>
  );
}

function SignatureBox({
  title,
  lines,
}: {
  title: string;
  lines: string[];
}) {
  return (
    <div className="signature-box">
      <div className="signature-title">
        {title}
      </div>

      {lines.map((line, index) => (
        <div
          key={`${line}-${index}`}
          style={{
            fontSize: "9px",
            lineHeight: 1.45,
            marginTop: index === 0 ? 0 : 5,
          }}
        >
          {line}
        </div>
      ))}
    </div>
  );
}