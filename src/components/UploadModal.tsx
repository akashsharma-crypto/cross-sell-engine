"use client";

import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { parseWorkbook } from "@/lib/upload/parse-workbook";
import type { Policyholder } from "@/types/policyholder";
import styles from "./UploadModal.module.css";

interface Props {
  onClose: () => void;
  onLoaded: (policyholders: Policyholder[]) => void;
}

export function UploadModal({ onClose, onLoaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  function downloadTemplate() {
    // Columns marked (optional) can be left blank — Motor leads won't have Salary Band / Visa Category;
    // Health leads won't have Car Value / Is Bank Financed?
    // Lead Type column tells the system which scoring model to use.
    // Valid Lead Type values: Motor | Health | Both
    const data = [
      ["Name", "Mobile", "Email", "Age", "Marital Status", "Lead Type", "Car Value", "Is Bank Financed?", "Salary Band", "Visa Category"],
      ["Ahmed Khan",     "501234567", "ahmed.khan@email.com",     34, "Married", "Motor",  85000,  "Yes", "",                ""],
      ["Sarah Williams", "522345678", "sarah.williams@email.com", 29, "Single",  "Health", "",     "",    "More than 12000", "Sponsored (Employer or Family)"],
      ["Raj Patel",      "553456789", "raj.patel@email.com",      41, "Married", "Both",   350000, "No",  "More than 12000", "Investor / Partner"],
      ["Maria Garcia",   "584567890", "maria.garcia@email.com",   26, "Single",  "Motor",  45000,  "Yes", "",                ""],
    ];

    // Notes row at bottom so the user knows valid values
    const notes = [
      [],
      ["--- Valid values ---"],
      ["Lead Type:", "", "Motor | Health | Both"],
      ["Marital Status:", "", "Married | Single | Divorced | Widowed"],
      ["Is Bank Financed?:", "", "Yes | No"],
      ["Salary Band:", "", "Below 4000 | 4000 - 12000 | More than 12000 | No Salary (dependent / Children) | No Salary Commission Only"],
      ["Visa Category:", "", "Sponsored (Employer or Family) | Investor / Partner | Golden Visa | Self Employed / Freelancer"],
      [],
      ["--- Notes ---"],
      ["Motor leads:", "", "Fill Age, Marital Status, Car Value, Is Bank Financed. Leave Health + Home fields blank."],
      ["Health leads:", "", "Fill Age, Marital Status, Salary Band, Visa Category. Leave Motor + Home fields blank."],
      ["Both:", "", "Fill Age, Marital Status + all Motor and Health fields."],
      ["Home leads:", "", "Fill Ownership Type, Property Type, Claims History, Coverage Type, Contents Value, Personal Belongings Value, Location Area. Age + Marital Status not required."],
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([...data, ...notes]);
    // Set column widths
    ws["!cols"] = [{ wch: 20 }, { wch: 14 }, { wch: 28 }, { wch: 6 }, { wch: 16 }, { wch: 10 }, { wch: 12 }, { wch: 18 }, { wch: 30 }, { wch: 34 }];
    XLSX.utils.book_append_sheet(wb, ws, "Leads");
    XLSX.writeFile(wb, "leads-template.xlsx");
  }

  async function handleFile(file: File) {
    setFileName(file.name);
    setStatus("idle");
    setMessage("");
    setWarnings([]);

    try {
      const buffer = await file.arrayBuffer();
      const { policyholders, warnings } = parseWorkbook(buffer);

      if (policyholders.length === 0) {
        setStatus("error");
        setMessage("No records could be scored. Download the template to check the required column names and valid field values.");
        return;
      }

      setWarnings(warnings);
      setStatus("success");
      setMessage(`${policyholders.length} lead${policyholders.length === 1 ? "" : "s"} loaded and scored.`);
      setTimeout(() => {
        onLoaded(policyholders);
        onClose();
      }, 900);
    } catch {
      setStatus("error");
      setMessage("Could not read this file. Make sure it is a valid .xlsx workbook.");
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Upload Leads</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>

        <p className={styles.hint}>
          Upload a single Excel sheet with all lead columns. Download the template below to see the exact format and valid field values.
        </p>

        <button className={styles.templateBtn} onClick={downloadTemplate}>
          ↓ Download Template
        </button>

        <div
          className={`${styles.dropzone} ${dragging ? styles.dropzoneDrag : ""} ${status === "success" ? styles.dropzoneSuccess : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <input ref={inputRef} type="file" accept=".xlsx,.xls" onChange={onInputChange} className={styles.hiddenInput} />
          <div className={styles.dropIcon}>{status === "success" ? "✓" : "↑"}</div>
          <p className={styles.dropTitle}>
            {fileName ?? "Drop your .xlsx file here or click to browse"}
          </p>
          {!fileName && <p className={styles.dropSub}>Supports .xlsx and .xls</p>}
        </div>

        {status === "success" && <p className={styles.successMsg}>{message}</p>}
        {status === "error" && <p className={styles.errorMsg}>{message}</p>}

        {warnings.length > 0 && (
          <details className={styles.warnings}>
            <summary>{warnings.length} row{warnings.length === 1 ? "" : "s"} skipped or flagged</summary>
            <ul>
              {warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}
