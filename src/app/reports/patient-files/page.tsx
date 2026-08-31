"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useState } from "react";

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

type PatientFile = {
  id: string;
  patientId: string;
  patientName: string;
  folder: string;
  fileName: string;
  fileType: string;
  size: number;
  uploadedAt: string;
  description: string;
  category: string;
};

const PATIENTS_KEY = "rehab-centre-patients";
const FILES_KEY = "rehab-centre-patient-files";

const defaultFolders = [
  "General",
  "Diagnostic Reports",
  "Medical Records",
  "Prescriptions",
  "Discharge Documents",
  "Other",
];

function formatDate(value: string) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatSize(bytes: number) {
  if (!bytes) return "0 KB";

  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(fileType: string) {
  if (fileType.includes("pdf")) return "📕";
  if (fileType.startsWith("image/")) return "🖼️";
  if (fileType.includes("word") || fileType.includes("document")) {
    return "📘";
  }
  if (fileType.includes("excel") || fileType.includes("spreadsheet")) {
    return "📗";
  }

  return "📄";
}

export default function PatientFilesPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [files, setFiles] = useState<PatientFile[]>([]);

  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedFolder, setSelectedFolder] = useState("All");

  const [folders, setFolders] = useState<string[]>(defaultFolders);

  const [search, setSearch] = useState("");

  const [showFolderForm, setShowFolderForm] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadCategory, setUploadCategory] =
    useState("Diagnostic Reports");
  const [uploadFolder, setUploadFolder] = useState("Diagnostic Reports");
  const [uploadDescription, setUploadDescription] = useState("");

  const [editingFile, setEditingFile] =
    useState<PatientFile | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const savedPatients = localStorage.getItem(PATIENTS_KEY);
      const savedFiles = localStorage.getItem(FILES_KEY);
      const savedFolders = localStorage.getItem(
        "rehab-centre-patient-folders"
      );

      if (savedPatients) {
        const parsed = JSON.parse(savedPatients);

        if (Array.isArray(parsed)) {
          setPatients(parsed);
        }
      }

      if (savedFiles) {
        const parsed = JSON.parse(savedFiles);

        if (Array.isArray(parsed)) {
          setFiles(parsed);
        }
      }

      if (savedFolders) {
        const parsed = JSON.parse(savedFolders);

        if (Array.isArray(parsed) && parsed.length > 0) {
          setFolders(parsed);
        }
      }
    } catch (error) {
      console.error("Unable to load patient files data", error);
    }

    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;

    localStorage.setItem(FILES_KEY, JSON.stringify(files));
    localStorage.setItem(
      "rehab-centre-patient-folders",
      JSON.stringify(folders)
    );
  }, [files, folders, loaded]);

  const selectedPatient = patients.find(
    (patient) => patient.id === selectedPatientId
  );

  const patientFiles = useMemo(() => {
    return files.filter(
      (file) => file.patientId === selectedPatientId
    );
  }, [files, selectedPatientId]);

  const filteredFiles = useMemo(() => {
    const query = search.toLowerCase().trim();

    return patientFiles.filter((file) => {
      const matchesSearch =
        !query ||
        [
          file.fileName,
          file.category,
          file.folder,
          file.description,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);

      const matchesFolder =
        selectedFolder === "All" ||
        file.folder === selectedFolder;

      return matchesSearch && matchesFolder;
    });
  }, [patientFiles, search, selectedFolder]);

  function selectPatient(id: string) {
    setSelectedPatientId(id);
    setSelectedFolder("All");
    setSearch("");
    setShowUploadForm(false);
  }

  function createFolder() {
    const folder = newFolderName.trim();

    if (!folder) {
      alert("Please enter a folder name.");
      return;
    }

    if (
      folders.some(
        (existing) =>
          existing.toLowerCase() === folder.toLowerCase()
      )
    ) {
      alert("This folder already exists.");
      return;
    }

    setFolders((current) => [...current, folder]);
    setNewFolderName("");
    setShowFolderForm(false);
  }

  function deleteFolder(folder: string) {
    if (defaultFolders.includes(folder)) {
      alert("Default folders cannot be deleted.");
      return;
    }

    const hasFiles = files.some(
      (file) =>
        file.patientId === selectedPatientId &&
        file.folder === folder
    );

    if (hasFiles) {
      alert(
        "This folder contains documents. Move or delete those documents first."
      );
      return;
    }

    if (!window.confirm(`Delete folder "${folder}"?`)) {
      return;
    }

    setFolders((current) =>
      current.filter((item) => item !== folder)
    );

    if (selectedFolder === folder) {
      setSelectedFolder("All");
    }
  }

  function openUploadForm() {
    if (!selectedPatient) {
      alert("Please select a patient first.");
      return;
    }

    setUploadFolder(
      selectedFolder !== "All"
        ? selectedFolder
        : "Diagnostic Reports"
    );

    setUploadCategory("Diagnostic Reports");
    setUploadDescription("");
    setShowUploadForm(true);
  }

  function handleFileSelection(
    event: ChangeEvent<HTMLInputElement>
  ) {
    if (!selectedPatient) {
      alert("Please select a patient first.");
      return;
    }

    const selectedFiles = event.target.files;

    if (!selectedFiles || selectedFiles.length === 0) {
      return;
    }

    const newFiles: PatientFile[] = Array.from(
      selectedFiles
    ).map((file) => ({
      id: crypto.randomUUID(),
      patientId: selectedPatient.id,
      patientName: selectedPatient.name,
      folder: uploadFolder,
      fileName: file.name,
      fileType: file.type || "application/octet-stream",
      size: file.size,
      uploadedAt: new Date().toISOString(),
      description: uploadDescription.trim(),
      category: uploadCategory,
    }));

    setFiles((current) => [...newFiles, ...current]);

    setShowUploadForm(false);
    setUploadDescription("");

    /*
     * The browser File object is intentionally not stored here.
     * This page currently stores the document metadata only.
     *
     * Actual document storage should be connected to a secure
     * file-storage service before this is used for real patient records.
     */
    alert(
      `${newFiles.length} document ${
        newFiles.length === 1 ? "record" : "records"
      } added to the patient's file register.`
    );

    event.target.value = "";
  }

  function openRename(file: PatientFile) {
    setEditingFile(file);
    setRenameValue(file.fileName);
  }

  function saveRename() {
    if (!editingFile) return;

    const name = renameValue.trim();

    if (!name) {
      alert("File name cannot be empty.");
      return;
    }

    setFiles((current) =>
      current.map((file) =>
        file.id === editingFile.id
          ? {
              ...file,
              fileName: name,
            }
          : file
      )
    );

    setEditingFile(null);
    setRenameValue("");
  }

  function deleteFile(file: PatientFile) {
    if (
      !window.confirm(
        `Delete "${file.fileName}" from the patient file register?`
      )
    ) {
      return;
    }

    setFiles((current) =>
      current.filter((item) => item.id !== file.id)
    );
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-7xl p-4 sm:p-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-600">
              REPORTS / PATIENT FILES
            </p>

            <h1 className="mt-1 text-3xl font-bold text-slate-900">
              Patient Files
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Organise patient documents, diagnostic reports and
              discharge records.
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              href="/documents"
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              📄 Documents & Letters
            </Link>

            <Link
              href="/reports"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              ← Reports
            </Link>
          </div>
        </div>

        <section className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Select Patient
          </label>

          {patients.length === 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              No patients were found in your existing patient
              records. Add a patient from the Patients module first.
            </div>
          ) : (
            <select
              value={selectedPatientId}
              onChange={(event) =>
                selectPatient(event.target.value)
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 sm:max-w-xl"
            >
              <option value="">Choose a patient...</option>

              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.id} — {patient.name}
                </option>
              ))}
            </select>
          )}
        </section>

        {selectedPatient && (
          <>
            <section className="mb-6 rounded-2xl bg-slate-900 p-5 text-white shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm text-slate-400">
                    Selected Patient
                  </p>

                  <h2 className="mt-1 text-2xl font-bold">
                    {selectedPatient.name}
                  </h2>

                  <p className="mt-1 text-sm text-slate-300">
                    {selectedPatient.id} • Age{" "}
                    {selectedPatient.age} •{" "}
                    {selectedPatient.gender}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="rounded-xl bg-white/10 px-5 py-3">
                    <div className="text-2xl font-bold">
                      {patientFiles.length}
                    </div>
                    <div className="text-xs text-slate-400">
                      Documents
                    </div>
                  </div>

                  <div className="rounded-xl bg-white/10 px-5 py-3">
                    <div className="text-2xl font-bold">
                      {folders.length}
                    </div>
                    <div className="text-xs text-slate-400">
                      Folders
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-[250px_1fr]">
              <aside className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-bold text-slate-900">
                    Folders
                  </h3>

                  <button
                    type="button"
                    onClick={() => setShowFolderForm(true)}
                    className="rounded-lg bg-blue-50 px-2 py-1 text-sm font-bold text-blue-600 hover:bg-blue-100"
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedFolder("All")}
                  className={`mb-1 w-full rounded-xl px-3 py-2 text-left text-sm ${
                    selectedFolder === "All"
                      ? "bg-blue-600 font-semibold text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  📁 All Documents
                </button>

                {folders.map((folder) => (
                  <div
                    key={folder}
                    className="group flex items-center gap-1"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedFolder(folder)
                      }
                      className={`min-w-0 flex-1 rounded-xl px-3 py-2 text-left text-sm ${
                        selectedFolder === folder
                          ? "bg-blue-600 font-semibold text-white"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      📂 {folder}
                    </button>

                    {!defaultFolders.includes(folder) && (
                      <button
                        type="button"
                        onClick={() => deleteFolder(folder)}
                        className="rounded-lg px-2 py-1 text-xs text-red-500 opacity-0 hover:bg-red-50 group-hover:opacity-100"
                        title="Delete folder"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                ))}

                <div className="mt-6 border-t border-slate-200 pt-4">
                  <Link
                    href="/documents"
                    className="block rounded-xl bg-slate-100 px-3 py-2 text-center text-sm font-semibold text-slate-700 hover:bg-slate-200"
                  >
                    📄 Create Document
                  </Link>
                </div>
              </aside>

              <section className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">
                      {selectedFolder === "All"
                        ? "All Documents"
                        : selectedFolder}
                    </h3>

                    <p className="text-sm text-slate-500">
                      {filteredFiles.length} document
                      {filteredFiles.length === 1 ? "" : "s"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={openUploadForm}
                    className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    + Add Document
                  </button>
                </div>

                <div className="mt-5">
                  <input
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder="Search documents..."
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  />
                </div>

                {filteredFiles.length === 0 ? (
                  <div className="mt-6 rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center">
                    <div className="text-4xl">📂</div>

                    <h4 className="mt-3 font-bold text-slate-900">
                      No documents found
                    </h4>

                    <p className="mt-1 text-sm text-slate-500">
                      Add diagnostic reports, prescriptions or
                      other patient documents.
                    </p>

                    <button
                      type="button"
                      onClick={openUploadForm}
                      className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                    >
                      + Add Document
                    </button>
                  </div>
                ) : (
                  <div className="mt-5 space-y-3">
                    {filteredFiles.map((file) => (
                      <div
                        key={file.id}
                        className="rounded-xl border border-slate-200 p-4 hover:border-blue-200 hover:bg-slate-50"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl">
                              {getFileIcon(file.fileType)}
                            </div>

                            <div className="min-w-0">
                              <h4 className="truncate font-semibold text-slate-900">
                                {file.fileName}
                              </h4>

                              <p className="mt-1 text-xs text-slate-500">
                                {file.category} •{" "}
                                {file.folder} •{" "}
                                {formatSize(file.size)}
                              </p>

                              <p className="mt-1 text-xs text-slate-400">
                                Added{" "}
                                {formatDate(file.uploadedAt)}
                              </p>

                              {file.description && (
                                <p className="mt-2 text-sm text-slate-600">
                                  {file.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex shrink-0 gap-2">
                            <button
                              type="button"
                              onClick={() => openRename(file)}
                              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                            >
                              Rename
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                deleteFile(file)
                              }
                              className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </>
        )}

        {!selectedPatient && patients.length > 0 && (
          <section className="rounded-2xl bg-white p-12 text-center shadow-sm">
            <div className="text-5xl">👤</div>

            <h2 className="mt-4 text-xl font-bold text-slate-900">
              Select a patient
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Choose a patient above to view and manage their
              documents.
            </p>
          </section>
        )}
      </div>

      {showFolderForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-slate-900">
              Create Folder
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Create a folder for this patient&apos;s documents.
            </p>

            <input
              autoFocus
              value={newFolderName}
              onChange={(event) =>
                setNewFolderName(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  createFolder();
                }
              }}
              placeholder="e.g. X-Ray Reports"
              className="mt-5 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
            />

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowFolderForm(false);
                  setNewFolderName("");
                }}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={createFolder}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Create Folder
              </button>
            </div>
          </div>
        </div>
      )}

      {showUploadForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-slate-900">
              Add Patient Document
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Patient: {selectedPatient?.name}
            </p>

            <div className="mt-5 grid gap-4">
              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Folder
                </label>

                <select
                  value={uploadFolder}
                  onChange={(event) =>
                    setUploadFolder(event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                >
                  {folders.map((folder) => (
                    <option key={folder} value={folder}>
                      {folder}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Category
                </label>

                <select
                  value={uploadCategory}
                  onChange={(event) =>
                    setUploadCategory(event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                >
                  <option>Diagnostic Reports</option>
                  <option>Medical Records</option>
                  <option>Prescriptions</option>
                  <option>Discharge Documents</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Description
                </label>

                <textarea
                  value={uploadDescription}
                  onChange={(event) =>
                    setUploadDescription(event.target.value)
                  }
                  rows={3}
                  placeholder="Optional description..."
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Select Documents
                </label>

                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                  onChange={handleFileSelection}
                  className="block w-full rounded-xl border border-slate-300 p-3 text-sm"
                />

                <p className="mt-2 text-xs text-slate-400">
                  Current version records document metadata.
                  Connect secure file storage before storing
                  actual medical documents.
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowUploadForm(false)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {editingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-slate-900">
              Rename Document
            </h2>

            <input
              autoFocus
              value={renameValue}
              onChange={(event) =>
                setRenameValue(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  saveRename();
                }
              }}
              className="mt-5 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
            />

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingFile(null)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveRename}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Save Name
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}