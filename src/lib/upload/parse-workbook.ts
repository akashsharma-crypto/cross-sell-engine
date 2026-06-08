import * as XLSX from "xlsx";
import type { HealthRow, MaritalStatus, MotorRow, Policyholder, SalaryBand, VisaCategory } from "@/types/policyholder";

/**
 * Parses an uploaded policyholder workbook and merges Motor + Health records
 * into one scoring-ready profile per customer.
 *
 * Expected workbook shape: two sheets, named "Motor" and "Health" (case-insensitive),
 * with columns matching the existing export format (Name, Mobile, Email, Age,
 * Marital Status, Car Value, Is Bank Financed? / Salary Band, Visa Category).
 *
 * Records are matched by email (case-insensitive) — the same customer commonly
 * appears in both sheets since they hold both Motor and Health policies. A record
 * needs both halves to be scored: Motor supplies car value + financing (debt signal),
 * Health supplies salary band + visa category (income/commitment signal).
 */
export interface ParseResult {
  policyholders: Policyholder[];
  warnings: string[];
}

export function parseWorkbook(buffer: ArrayBuffer): ParseResult {
  const workbook = XLSX.read(buffer, { type: "array" });
  const warnings: string[] = [];

  const motorSheet = findSheet(workbook, "motor");
  const healthSheet = findSheet(workbook, "health");

  if (!motorSheet) warnings.push('No "Motor" sheet found — Motor-derived signals (car value, financing) will be unavailable.');
  if (!healthSheet) warnings.push('No "Health" sheet found — Health-derived signals (salary, visa) will be unavailable.');

  const motorRows = motorSheet ? XLSX.utils.sheet_to_json<MotorRow>(motorSheet) : [];
  const healthRows = healthSheet ? XLSX.utils.sheet_to_json<HealthRow>(healthSheet) : [];

  const motorByEmail = new Map<string, MotorRow>();
  for (const row of motorRows) {
    const email = normalizeEmail(row.Email);
    if (email) motorByEmail.set(email, row);
  }

  const healthByEmail = new Map<string, HealthRow>();
  for (const row of healthRows) {
    const email = normalizeEmail(row.Email);
    if (email) healthByEmail.set(email, row);
  }

  const allEmails = new Set([...motorByEmail.keys(), ...healthByEmail.keys()]);
  const policyholders: Policyholder[] = [];

  for (const email of allEmails) {
    const motor = motorByEmail.get(email);
    const health = healthByEmail.get(email);

    if (!motor || !health) {
      const name = motor?.Name ?? health?.Name ?? email;
      warnings.push(`Skipped "${name}" — present in only one sheet (${motor ? "Motor" : "Health"} only); both are required to score.`);
      continue;
    }

    const merged = mergeRecord(motor, health, warnings);
    if (merged) policyholders.push(merged);
  }

  return { policyholders, warnings };
}

function findSheet(workbook: XLSX.WorkBook, nameContains: string): XLSX.WorkSheet | null {
  const sheetName = workbook.SheetNames.find((n) => n.toLowerCase().includes(nameContains));
  return sheetName ? workbook.Sheets[sheetName] : null;
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

function mergeRecord(motor: MotorRow, health: HealthRow, warnings: string[]): Policyholder | null {
  const name = (motor.Name ?? health.Name ?? "").toString().trim();
  const mobile = (motor.Mobile ?? health.Mobile ?? "").toString().trim();
  const email = normalizeEmail(motor.Email) ?? normalizeEmail(health.Email) ?? "";

  const maritalStatus = parseMaritalStatus(motor["Marital Status"] ?? health["Marital Status"]);
  const salaryBand = parseSalaryBand(health["Salary Band"]);
  const visaCategory = parseVisaCategory(health["Visa Category"]);
  const carValue = toNumber(motor["Car Value"]);
  const isBankFinanced = parseYesNo(motor["Is Bank Financed?"]);
  const age = toNumber(motor.Age ?? health.Age);

  if (!name || !email) {
    warnings.push(`Skipped a row near "${name || email || "(unknown)"}" — missing name or email.`);
    return null;
  }
  if (maritalStatus === null || salaryBand === null || visaCategory === null || carValue === null || isBankFinanced === null || age === null) {
    warnings.push(`Skipped "${name}" — one or more fields could not be read (check Marital Status, Salary Band, Visa Category, Car Value, Is Bank Financed?, Age).`);
    return null;
  }

  if (motor.Age !== health.Age) {
    warnings.push(`"${name}" has mismatched ages across sheets (Motor: ${motor.Age}, Health: ${health.Age}) — used Motor's value.`);
  }

  return { name, mobile, email, age, maritalStatus, carValue, isBankFinanced, salaryBand, visaCategory };
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value.replace(/[, ]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function parseYesNo(value: unknown): boolean | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  if (v === "yes") return true;
  if (v === "no") return false;
  return null;
}

const MARITAL_STATUSES: MaritalStatus[] = ["Married", "Single", "Divorced", "Widowed"];
function parseMaritalStatus(value: unknown): MaritalStatus | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return (MARITAL_STATUSES.find((m) => m.toLowerCase() === trimmed.toLowerCase()) as MaritalStatus) ?? null;
}

const SALARY_BANDS: SalaryBand[] = [
  "Below 4000",
  "4000 - 12000",
  "More than 12000",
  "No Salary (dependent / Children)",
  "No Salary Commission Only",
];
function parseSalaryBand(value: unknown): SalaryBand | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  return (SALARY_BANDS.find((b) => b.toLowerCase() === trimmed.toLowerCase()) as SalaryBand) ?? null;
}

const VISA_CATEGORIES: VisaCategory[] = [
  "Sponsored (Employer or Family)",
  "Investor / Partner",
  "Golden Visa",
  "Self Employed / Freelancer",
];
function parseVisaCategory(value: unknown): VisaCategory | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  return (VISA_CATEGORIES.find((c) => c.toLowerCase() === trimmed.toLowerCase()) as VisaCategory) ?? null;
}
