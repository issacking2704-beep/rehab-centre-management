"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, deleteDoc, doc, getDocs, addDoc, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { recordAudit } from "@/lib/audit";

type Bill = {
  id: string;
  billNo: string;
  patientName: string;
  patientId: string;
  service: string;
  amount: number;
  paid: number;
  paymentMethod: string;
  date: string;
  status: "Paid" | "Partial" | "Pending";
};

const initialBills: Bill[] = [];

export default function PaymentsPage() {
  const [bills, setBills] =
    useState<Bill[]>(initialBills);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBills() {
      try {
        const snapshot = await getDocs(query(collection(db, "payments"), orderBy("createdAt", "desc")));
        setBills(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Bill)));
      } catch (error) { console.error("Failed to load bills", error); }
      finally { setLoading(false); }
    }
    loadBills();
  }, []);

  const [search, setSearch] = useState("");

  const [showForm, setShowForm] =
    useState(false);

  const [patientName, setPatientName] =
    useState("");

  const [patientId, setPatientId] =
    useState("");

  const [service, setService] =
    useState("");

  const [amount, setAmount] =
    useState("");

  const [paid, setPaid] =
    useState("");

  const [paymentMethod, setPaymentMethod] =
    useState("UPI");

  const [date, setDate] =
    useState(
      new Date().toISOString().split("T")[0]
    );

  const filteredBills = useMemo(() => {
    const query = search.toLowerCase().trim();

    if (!query) return bills;

    return bills.filter((bill) =>
      [
        bill.billNo,
        bill.patientName,
        bill.patientId,
        bill.service,
        bill.paymentMethod,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [bills, search]);

  const totalBilled = useMemo(
    () =>
      bills.reduce(
        (total, bill) => total + bill.amount,
        0
      ),
    [bills]
  );

  const totalCollected = useMemo(
    () =>
      bills.reduce(
        (total, bill) => total + bill.paid,
        0
      ),
    [bills]
  );

  const totalOutstanding = Math.max(
    0,
    totalBilled - totalCollected
  );

  function calculateStatus(
    billAmount: number,
    paidAmount: number
  ): Bill["status"] {
    if (paidAmount >= billAmount) {
      return "Paid";
    }

    if (paidAmount > 0) {
      return "Partial";
    }

    return "Pending";
  }

  async function addBill() {
    const billAmount =
      Number(amount) || 0;

    const paidAmount =
      Number(paid) || 0;

    if (!patientName.trim()) {
      alert("Please enter the patient name.");
      return;
    }

    if (!service.trim()) {
      alert("Please enter the service.");
      return;
    }

    if (billAmount <= 0) {
      alert("Please enter a valid bill amount.");
      return;
    }

    if (paidAmount > billAmount) {
      alert(
        "Amount paid cannot be greater than the bill amount."
      );
      return;
    }

    const newBill: Bill = {
      id: "",
      billNo: `BILL-${String(
        bills.length + 1
      ).padStart(3, "0")}`,
      patientName,
      patientId,
      service,
      amount: billAmount,
      paid: paidAmount,
      paymentMethod,
      date,
      status: calculateStatus(
        billAmount,
        paidAmount
      ),
    };

    const created = await addDoc(collection(db, "payments"), { ...newBill, createdAt: new Date().toISOString() });
    setBills((current) => [{ ...newBill, id: created.id }, ...current]);
    void recordAudit({ action: "create", module: "payments", recordId: created.id, description: `Created bill ${newBill.billNo} for ${newBill.patientName}.`, metadata: { amount: billAmount, paid: paidAmount, method: paymentMethod } });

    setPatientName("");
    setPatientId("");
    setService("");
    setAmount("");
    setPaid("");
    setPaymentMethod("UPI");

    setShowForm(false);
  }

  async function deleteBill(id: string) {
    const confirmed = window.confirm(
      "Delete this bill?"
    );

    if (!confirmed) return;

    await deleteDoc(doc(db, "payments", String(id)));
    setBills((current) => current.filter((bill) => bill.id !== id));
    void recordAudit({ action: "delete", module: "payments", recordId: id, description: `Deleted payment/bill ${id}.` });
  }

  async function clearAllBills() {
    const confirmed = window.confirm(
      "Delete all bills from this screen?"
    );

    if (!confirmed) return;

    await Promise.all(bills.map((bill) => deleteDoc(doc(db, "payments", String(bill.id)))));
    setBills([]);
    void recordAudit({ action: "delete", module: "payments", description: `Cleared ${bills.length} payment records from the billing screen.`, metadata: { count: bills.length } });
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      {/* HEADER */}

      <header className="border-b bg-white px-6 py-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              Payments & Bills
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage patient bills, payments and outstanding
              balances.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setShowForm(!showForm)
            }
            className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
          >
            {showForm
              ? "✕ Close"
              : "+ Create New Bill"}
          </button>
        </div>
      </header>

      <div className="space-y-6 p-6">
        {loading && <div className="rounded-xl bg-blue-50 p-3 text-sm text-blue-700">Loading bills…</div>}
        {/* SUMMARY */}

        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard
            title="Total Billed"
            value={formatCurrency(totalBilled)}
            icon="🧾"
          />

          <SummaryCard
            title="Total Collected"
            value={formatCurrency(totalCollected)}
            icon="💰"
          />

          <SummaryCard
            title="Outstanding"
            value={formatCurrency(
              totalOutstanding
            )}
            icon="⏳"
          />
        </div>

        {/* CREATE BILL */}

        {showForm && (
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-bold">
                Create New Bill
              </h2>

              <p className="text-sm text-slate-500">
                Create a bill without GST or tax calculations.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                label="Service / Description"
                value={service}
                onChange={setService}
              />

              <Field
                label="Bill Amount"
                value={amount}
                onChange={setAmount}
                type="number"
              />

              <Field
                label="Amount Paid"
                value={paid}
                onChange={setPaid}
                type="number"
              />

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Payment Method
                </label>

                <select
                  value={paymentMethod}
                  onChange={(event) =>
                    setPaymentMethod(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 p-3"
                >
                  <option>Cash</option>
                  <option>UPI</option>
                  <option>Card</option>
                  <option>Bank Transfer</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Bill Date
                </label>

                <input
                  type="date"
                  value={date}
                  onChange={(event) =>
                    setDate(event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 p-3"
                />
              </div>
            </div>

            {/* LIVE TOTAL */}

            <div className="mt-6 rounded-2xl bg-slate-50 p-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-slate-500">
                    Bill Amount
                  </p>

                  <p className="mt-1 text-lg font-bold">
                    {formatCurrency(
                      Number(amount) || 0
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">
                    Amount Paid
                  </p>

                  <p className="mt-1 text-lg font-bold">
                    {formatCurrency(
                      Number(paid) || 0
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">
                    Balance
                  </p>

                  <p className="mt-1 text-lg font-bold">
                    {formatCurrency(
                      Math.max(
                        0,
                        (Number(amount) || 0) -
                          (Number(paid) || 0)
                      )
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={addBill}
                className="rounded-xl bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700"
              >
                ✓ Save Bill
              </button>
            </div>
          </section>
        )}

        {/* BILL LIST */}

        <section className="rounded-2xl bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold">
                Bills & Payments
              </h2>

              <p className="text-sm text-slate-500">
                {bills.length} bill
                {bills.length !== 1 ? "s" : ""}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search patient, bill..."
                className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
              />

              {bills.length > 0 && (
                <button
                  type="button"
                  onClick={clearAllBills}
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          {/* DESKTOP TABLE */}

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <th className="px-6 py-4">
                    Bill
                  </th>

                  <th className="px-6 py-4">
                    Patient
                  </th>

                  <th className="px-6 py-4">
                    Service
                  </th>

                  <th className="px-6 py-4 text-right">
                    Amount
                  </th>

                  <th className="px-6 py-4 text-right">
                    Paid
                  </th>

                  <th className="px-6 py-4 text-right">
                    Balance
                  </th>

                  <th className="px-6 py-4">
                    Method
                  </th>

                  <th className="px-6 py-4">
                    Status
                  </th>

                  <th className="px-6 py-4">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredBills.map((bill) => (
                  <BillRow
                    key={bill.id}
                    bill={bill}
                    onDelete={() =>
                      deleteBill(bill.id)
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARDS */}

          <div className="space-y-4 p-4 md:hidden">
            {filteredBills.map((bill) => (
              <BillCard
                key={bill.id}
                bill={bill}
                onDelete={() =>
                  deleteBill(bill.id)
                }
              />
            ))}
          </div>

          {filteredBills.length === 0 && (
            <div className="p-12 text-center">
              <div className="text-4xl">
                🧾
              </div>

              <h3 className="mt-3 font-bold">
                No bills found
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Create a new bill to get started.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

/* ================= SUMMARY ================= */

function SummaryCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-500">
          {title}
        </p>

        <span className="text-2xl">
          {icon}
        </span>
      </div>

      <p className="mt-3 text-2xl font-bold">
        {value}
      </p>
    </div>
  );
}

/* ================= DESKTOP ROW ================= */

function BillRow({
  bill,
  onDelete,
}: {
  bill: Bill;
  onDelete: () => void;
}) {
  const balance = Math.max(
    0,
    bill.amount - bill.paid
  );

  return (
    <tr className="border-b last:border-0 hover:bg-slate-50">
      <td className="px-6 py-4">
        <p className="font-semibold">
          {bill.billNo}
        </p>

        <p className="text-xs text-slate-500">
          {formatDate(bill.date)}
        </p>
      </td>

      <td className="px-6 py-4">
        <p className="font-semibold">
          {bill.patientName}
        </p>

        <p className="text-xs text-slate-500">
          {bill.patientId || "—"}
        </p>
      </td>

      <td className="px-6 py-4 text-sm">
        {bill.service}
      </td>

      <td className="px-6 py-4 text-right font-semibold">
        {formatCurrency(bill.amount)}
      </td>

      <td className="px-6 py-4 text-right">
        {formatCurrency(bill.paid)}
      </td>

      <td className="px-6 py-4 text-right font-semibold">
        {formatCurrency(balance)}
      </td>

      <td className="px-6 py-4 text-sm">
        {bill.paymentMethod}
      </td>

      <td className="px-6 py-4">
        <StatusBadge status={bill.status} />
      </td>

      <td className="px-6 py-4">
        <button
          type="button"
          onClick={onDelete}
          className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600"
        >
          Delete
        </button>
      </td>
    </tr>
  );
}

/* ================= MOBILE CARD ================= */

function BillCard({
  bill,
  onDelete,
}: {
  bill: Bill;
  onDelete: () => void;
}) {
  const balance = Math.max(
    0,
    bill.amount - bill.paid
  );

  return (
    <div className="rounded-2xl border p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-bold">
            {bill.billNo}
          </p>

          <p className="text-xs text-slate-500">
            {formatDate(bill.date)}
          </p>
        </div>

        <StatusBadge status={bill.status} />
      </div>

      <div className="mt-4">
        <p className="font-semibold">
          {bill.patientName}
        </p>

        <p className="text-xs text-slate-500">
          {bill.patientId || "No Patient ID"}
        </p>

        <p className="mt-3 text-sm">
          {bill.service}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center">
        <div>
          <p className="text-[10px] text-slate-500">
            Amount
          </p>

          <p className="text-sm font-bold">
            {formatCurrency(bill.amount)}
          </p>
        </div>

        <div>
          <p className="text-[10px] text-slate-500">
            Paid
          </p>

          <p className="text-sm font-bold">
            {formatCurrency(bill.paid)}
          </p>
        </div>

        <div>
          <p className="text-[10px] text-slate-500">
            Balance
          </p>

          <p className="text-sm font-bold">
            {formatCurrency(balance)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-slate-500">
          {bill.paymentMethod}
        </span>

        <button
          type="button"
          onClick={onDelete}
          className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

/* ================= STATUS ================= */

function StatusBadge({
  status,
}: {
  status: Bill["status"];
}) {
  const classes = {
    Paid: "bg-green-50 text-green-700",
    Partial: "bg-yellow-50 text-yellow-700",
    Pending: "bg-red-50 text-red-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold ${classes[status]}`}
    >
      {status}
    </span>
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
        min={type === "number" ? "0" : undefined}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-blue-500"
      />
    </div>
  );
}

/* ================= HELPERS ================= */

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