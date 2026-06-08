"use client";

import { useRef, useState } from "react";
import { parseWorkbook } from "@/lib/upload/parse-workbook";
import type { Policyholder } from "@/types/policyholder";
import styles from "./UploadPanel.module.css";

interface Props {
  onLoaded: (policyholders: Policyholder[]) => void;
}

/**
 * File-upload control for the dashboard. Parsing happens entirely client-side
 * (via the `xlsx` library) — the workbook never leaves the browser, so there's
 * no API route or storage to provision for the MVP.
 */
export function UploadPanel({ onLoaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setWarnings([]);
    setCount(null);
    setFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const { policyholders, warnings } = parseWorkbook(buffer);

      if (policyholders.length === 0) {
        setError("No matching policyholder records found. Check that the workbook has \"Motor\" and \"Health\" sheets with matching emails.");
        return;
      }

      setWarnings(warnings);
      setCount(policyholders.length);
      onLoaded(policyholders);
    } catch {
      setError("Could not read this file. Make sure it's a valid .xlsx or .xls workbook.");
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div className={styles.panel}>
      <div
        className={styles.dropzone}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={onInputChange}
          className={styles.hiddenInput}
        />
        <p className={styles.dropTitle}>
          {fileName ? fileName : "Upload policyholder workbook"}
        </p>
        <p className={styles.dropHint}>
          Drop a .xlsx file here or click to browse — must contain "Motor" and "Health" sheets
        </p>
      </div>

      {count !== null && (
        <p className={styles.success}>Loaded and scored {count} merged policyholder record{count === 1 ? "" : "s"}.</p>
      )}
      {error && <p className={styles.error}>{error}</p>}
      {warnings.length > 0 && (
        <details className={styles.warnings}>
          <summary>{warnings.length} row{warnings.length === 1 ? "" : "s"} skipped or flagged</summary>
          <ul>
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
