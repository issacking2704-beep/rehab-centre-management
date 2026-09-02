"use client";

import { useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

type InvoiceItem = {
  id: number;
  description: string;
  quantity: number;
  rate: number;
  discount: number;
};

const initialItems: InvoiceItem[] = [
  {
    id: 1,
    description: "Rehabilitation / Therapy Services",
    quantity: 1,
    rate: 2500,
    discount: 0,
  },
];

export default function InvoicePage() {
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

  const [invoiceNo, setInvoiceNo] = useState(
    `INV-${new Date().getFullYear()}-001`
  );

  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [dueDate, setDueDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [patientName, setPatientName] = useState("");
  const [patientId, setPatientId] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientAddress, setPatientAddress] = useState("");

  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [amountPaid, setAmountPaid] = useState("0");

  const [notes, setNotes] = useState(
    "Thank you for choosing our rehabilitation centre."
  );

  const [terms, setTerms] = useState(
    "Payment is subject to the terms and conditions of the rehabilitation centre."
  );

  const [signatureName, setSignatureName] = useState(
    "Authorized Signatory"
  );

  const [logo, setLogo] = useState<string | null>(null);

  const [items, setItems] =
    useState<InvoiceItem[]>(initialItems);

  /* ================= PATIENT PROFILE INTEGRATION ================= */

  useEffect(() => {
    const queryPatientId = new URLSearchParams(
      window.location.search
    ).get("patientId");

    if (!queryPatientId) return;

    const patientIdFromUrl = queryPatientId;

    async function loadPatient() {
      try {
        const patientRef = doc(
          db,
          "patients",
          patientIdFromUrl
        );

        const patientSnap = await getDoc(patientRef);

        if (!patientSnap.exists()) {
          console.warn(
            "Patient not found:",
            queryPatientId
          );
          return;
        }

        const patient = patientSnap.data();

        const name =
          patient.name ??
          patient.patientName ??
          patient.fullName ??
          "";

        const phone =
          patient.phone ??
          patient.mobile ??
          patient.attenderMobile ??
          "";

        const patientAddr =
          patient.address ??
          patient.permanentAddress ??
          "";

        setPatientId(patientIdFromUrl);
        setPatientName(String(name));
        setPatientPhone(String(phone));
        setPatientAddress(String(patientAddr));
      } catch (error) {
        console.error(
          "Error loading patient for invoice:",
          error
        );
      }
    }

    loadPatient();
  }, []);

  /* ================= CALCULATIONS ================= */

  const subtotal = useMemo(() => {
    return items.reduce(
      (total, item) =>
        total + item.quantity * item.rate,
      0
    );
  }, [items]);

  const discountTotal = useMemo(() => {
    return items.reduce(
      (total, item) => total + item.discount,
      0
    );
  }, [items]);

  const grandTotal = Math.max(
    0,
    subtotal - discountTotal
  );

  const paid = Math.min(
    grandTotal,
    Math.max(0, Number(amountPaid) || 0)
  );

  const balance = Math.max(
    0,
    grandTotal - paid
  );

  /* ================= ITEMS ================= */

  function updateItem(
    id: number,
    field: keyof InvoiceItem,
    value: string
  ) {
    setItems((current) =>
      current.map((item) => {
        if (item.id !== id) return item;

        if (field === "description") {
          return {
            ...item,
            description: value,
          };
        }

        return {
          ...item,
          [field]: Number(value) || 0,
        };
      })
    );
  }

  function addItem() {
    setItems((current) => [
      ...current,
      {
        id: Date.now(),
        description: "",
        quantity: 1,
        rate: 0,
        discount: 0,
      },
    ]);
  }

  function removeItem(id: number) {
    if (items.length === 1) return;

    setItems((current) =>
      current.filter((item) => item.id !== id)
    );
  }

  /* ================= LOGO ================= */

  function handleLogo(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      setLogo(reader.result as string);
    };

    reader.readAsDataURL(file);
  }

  function printInvoice() {
    window.print();
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      {/* HEADER */}

      <header className="no-print border-b bg-white px-6 py-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              Invoice Generator
            </h1>

            <p className="text-sm text-slate-500">
              Create professional invoices for your
              rehabilitation centre.
            </p>
          </div>

          <button
            type="button"
            onClick={printInvoice}
            className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
          >
            🖨️ Print / Save PDF
          </button>
        </div>
      </header>

      <div className="no-print grid gap-6 p-6 xl:grid-cols-[430px_1fr]">
        {/* LEFT SETTINGS */}

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">
            Invoice Details
          </h2>

          <p className="mb-6 text-sm text-slate-500">
            Enter the information required for the invoice.
          </p>

          {/* CENTRE */}

          <div>
            <h3 className="mb-3 font-semibold text-blue-700">
              Centre Information
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

          {/* INVOICE */}

          <div className="mt-6 border-t pt-6">
            <h3 className="mb-3 font-semibold text-blue-700">
              Invoice Information
            </h3>

            <div className="space-y-3">
              <Field
                label="Invoice Number"
                value={invoiceNo}
                onChange={setInvoiceNo}
              />

              <DateField
                label="Invoice Date"
                value={invoiceDate}
                onChange={setInvoiceDate}
              />

              <DateField
                label="Due Date"
                value={dueDate}
                onChange={setDueDate}
              />
            </div>
          </div>

          {/* PATIENT */}

          <div className="mt-6 border-t pt-6">
            <h3 className="mb-3 font-semibold text-blue-700">
              Patient Information
            </h3>

            <div className="space-y-3">
              <Field
                label="Patient Name"
                value={patientName}
                onChange={setPatientName}
              />

              <Field
                label="Patient ID"
                value={patientId}
                onChange={setPatientId}
              />

              <Field
                label="Patient Phone"
                value={patientPhone}
                onChange={setPatientPhone}
              />

              <TextArea
                label="Patient Address"
                value={patientAddress}
                onChange={setPatientAddress}
              />
            </div>
          </div>

          {/* PAYMENT */}

          <div className="mt-6 border-t pt-6">
            <h3 className="mb-3 font-semibold text-blue-700">
              Payment Information
            </h3>

            <div className="space-y-3">
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Payment Method
                </label>

                <select
                  value={paymentMethod}
                  onChange={(event) =>
                    setPaymentMethod(event.target.value)
                  }
                  className="w-full rounded-xl border p-3"
                >
                  <option>Cash</option>
                  <option>UPI</option>
                  <option>Card</option>
                  <option>Bank Transfer</option>
                  <option>Other</option>
                </select>
              </div>

              <Field
                label="Amount Paid"
                value={amountPaid}
                onChange={setAmountPaid}
                type="number"
              />
            </div>
          </div>

          {/* FOOTER */}

          <div className="mt-6 border-t pt-6">
            <h3 className="mb-3 font-semibold text-blue-700">
              Footer
            </h3>

            <div className="space-y-3">
              <TextArea
                label="Notes"
                value={notes}
                onChange={setNotes}
              />

              <TextArea
                label="Terms & Conditions"
                value={terms}
                onChange={setTerms}
              />

              <Field
                label="Authorized Signatory"
                value={signatureName}
                onChange={setSignatureName}
              />
            </div>
          </div>
        </section>

        {/* ITEMS */}

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">
                Invoice Items
              </h2>

              <p className="text-sm text-slate-500">
                Add therapy sessions, services, room charges,
                etc.
              </p>
            </div>

            <button
              type="button"
              onClick={addItem}
              className="rounded-xl bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700"
            >
              + Add Item
            </button>
          </div>

          <div className="space-y-4">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="rounded-2xl border p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-semibold">
                    Item {index + 1}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      removeItem(item.id)
                    }
                    className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-600"
                  >
                    Remove
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                  <div className="lg:col-span-2">
                    <label className="mb-2 block text-xs font-semibold">
                      Description
                    </label>

                    <input
                      value={item.description}
                      onChange={(event) =>
                        updateItem(
                          item.id,
                          "description",
                          event.target.value
                        )
                      }
                      placeholder="Service / Item"
                      className="w-full rounded-xl border p-3"
                    />
                  </div>

                  <NumberField
                    label="Quantity"
                    value={item.quantity}
                    onChange={(value) =>
                      updateItem(
                        item.id,
                        "quantity",
                        value
                      )
                    }
                  />

                  <NumberField
                    label="Rate"
                    value={item.rate}
                    onChange={(value) =>
                      updateItem(
                        item.id,
                        "rate",
                        value
                      )
                    }
                  />

                  <NumberField
                    label="Discount"
                    value={item.discount}
                    onChange={(value) =>
                      updateItem(
                        item.id,
                        "discount",
                        value
                      )
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ================= A4 INVOICE ================= */}

      <section className="invoice-page mx-auto my-6 min-h-[297mm] w-[210mm] bg-white p-[15mm] shadow-xl">
        {/* HEADER */}

        <div className="flex items-start justify-between border-b-2 border-slate-900 pb-6">
          <div className="flex items-start gap-4">
            {logo ? (
              <img
                src={logo}
                alt="Centre Logo"
                className="h-20 w-20 object-contain"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-xl border-2 border-dashed text-xs text-slate-400">
                LOGO
              </div>
            )}

            <div>
              <h1 className="text-2xl font-bold uppercase">
                {centreName}
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                {tagline}
              </p>

              <p className="mt-3 whitespace-pre-line text-xs leading-5 text-slate-600">
                {address}
              </p>

              <p className="text-xs text-slate-600">
                {phone} • {email}
              </p>

              <p className="text-xs text-slate-600">
                {website}
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-sm font-semibold uppercase text-slate-500">
              Invoice
            </p>

            <p className="text-xl font-bold">
              {invoiceNo}
            </p>

            <p className="mt-3 text-xs text-slate-500">
              Invoice Date
            </p>

            <p className="text-sm font-semibold">
              {formatDate(invoiceDate)}
            </p>

            <p className="mt-2 text-xs text-slate-500">
              Due Date
            </p>

            <p className="text-sm font-semibold">
              {formatDate(dueDate)}
            </p>
          </div>
        </div>

        {/* PATIENT */}

        <div className="mt-7 grid grid-cols-2 gap-8">
          <div>
            <p className="text-xs font-bold uppercase text-slate-500">
              Bill To
            </p>

            <p className="mt-2 text-lg font-bold">
              {patientName || "Patient Name"}
            </p>

            <p className="text-sm text-slate-600">
              Patient ID: {patientId || "—"}
            </p>

            {patientPhone && (
              <p className="text-sm text-slate-600">
                Phone: {patientPhone}
              </p>
            )}

            {patientAddress && (
              <p className="mt-1 whitespace-pre-line text-sm text-slate-600">
                {patientAddress}
              </p>
            )}
          </div>

          <div className="text-right">
            <p className="text-xs font-bold uppercase text-slate-500">
              Payment Method
            </p>

            <p className="mt-2 font-semibold">
              {paymentMethod}
            </p>
          </div>
        </div>

        {/* TABLE */}

        <div className="mt-8">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-y-2 border-slate-900 text-left text-xs uppercase">
                <th className="px-2 py-3">
                  Description
                </th>

                <th className="px-2 py-3 text-center">
                  Qty
                </th>

                <th className="px-2 py-3 text-right">
                  Rate
                </th>

                <th className="px-2 py-3 text-right">
                  Discount
                </th>

                <th className="px-2 py-3 text-right">
                  Amount
                </th>
              </tr>
            </thead>

            <tbody>
              {items.map((item) => {
                const amount = Math.max(
                  0,
                  item.quantity * item.rate -
                    item.discount
                );

                return (
                  <tr
                    key={item.id}
                    className="border-b border-slate-200"
                  >
                    <td className="px-2 py-4 text-sm">
                      {item.description ||
                        "Service / Item"}
                    </td>

                    <td className="px-2 py-4 text-center text-sm">
                      {item.quantity}
                    </td>

                    <td className="px-2 py-4 text-right text-sm">
                      {formatCurrency(item.rate)}
                    </td>

                    <td className="px-2 py-4 text-right text-sm">
                      {formatCurrency(item.discount)}
                    </td>

                    <td className="px-2 py-4 text-right text-sm font-semibold">
                      {formatCurrency(amount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* TOTALS */}

        <div className="mt-8 flex justify-end">
          <div className="w-80 space-y-3">
            <TotalRow
              label="Subtotal"
              value={formatCurrency(subtotal)}
            />

            <TotalRow
              label="Discount"
              value={`- ${formatCurrency(discountTotal)}`}
            />

            <div className="border-t-2 border-slate-900 pt-3">
              <TotalRow
                label="Grand Total"
                value={formatCurrency(grandTotal)}
                large
              />
            </div>

            <TotalRow
              label="Amount Paid"
              value={formatCurrency(paid)}
            />

            <div className="rounded-xl bg-slate-100 p-3">
              <TotalRow
                label="Balance Due"
                value={formatCurrency(balance)}
                large
              />
            </div>
          </div>
        </div>

        {/* FOOTER */}

        <div className="mt-10 grid grid-cols-2 gap-8">
          <div>
            <p className="text-xs font-bold uppercase">
              Notes
            </p>

            <p className="mt-2 whitespace-pre-line text-xs leading-5 text-slate-600">
              {notes}
            </p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase">
              Terms & Conditions
            </p>

            <p className="mt-2 whitespace-pre-line text-xs leading-5 text-slate-600">
              {terms}
            </p>
          </div>
        </div>

        {/* SIGNATURE */}

        <div className="mt-16 flex justify-end">
          <div className="w-52 text-center">
            <div className="mb-2 border-b border-slate-400" />

            <p className="text-sm font-semibold">
              {signatureName}
            </p>

            <p className="text-xs text-slate-500">
              Authorized Signatory
            </p>
          </div>
        </div>

        <div className="mt-12 border-t pt-4 text-center">
          <p className="text-xs text-slate-400">
            This is a computer-generated invoice.
          </p>
        </div>
      </section>

      {/* PRINT */}

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

          .invoice-page {
            width: 210mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </main>
  );
}

/* ================= COMPONENTS ================= */

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
        className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-blue-500"
      />
    </div>
  );
}

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
        className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-blue-500"
      />
    </div>
  );
}

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

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold">
        {label}
      </label>

      <input
        type="number"
        min="0"
        step="0.01"
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-xl border p-3"
      />
    </div>
  );
}

function TotalRow({
  label,
  value,
  large = false,
}: {
  label: string;
  value: string;
  large?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between ${
        large ? "text-lg font-bold" : "text-sm"
      }`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(value: string) {
  if (!value) return "—";

  const date = new Date(`${value}T00:00:00`);

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}