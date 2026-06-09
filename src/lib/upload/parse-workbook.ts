import * as XLSX from "xlsx";
import type { MaritalStatus, Policyholder, SalaryBand, VisaCategory } from "@/types/policyholder";

export interface ParseResult {
  policyholders: Policyholder[];
  warnings: string[];
}

/**
 * Parses a single-sheet workbook. The first sheet found is used regardless of name.
 * Expected columns: Name, Mobile, Email, Age, Marital Status, Car Value,
 * Is Bank Financed?, Salary Band, Visa Category
 */
export function parseWorkbook(buffer: ArrayBuffer): ParseResult {
  const workbook = XLSX.read(buffer, { type: "array" });
  const warnings: string[] = [];

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    warnings.push("The workbook appears to be empty — no sheets found.");
    return { policyholders: [], warnings };
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

  const policyholders: Policyholder[] = [];

  for (const row of rows) {
    const name = str(row["Name"] ?? row["name"]);
    const mobile = str(row["Mobile"] ?? row["mobile"] ?? row["Phone"] ?? row["phone"] ?? "");
    const email = normalizeEmail(row["Email"] ?? row["email"]);
    const age = toNumber(row["Age"] ?? row["age"]);
    const maritalStatus = parseMaritalStatus(row["Marital Status"] ?? row["marital_status"] ?? row["MaritalStatus"]);
    const carValue = toNumber(row["Car Value"] ?? row["Car Value (optional)"] ?? row["car_value"] ?? row["CarValue"] ?? row["Car value"]);
    const isBankFinanced = parseYesNo(row["Is Bank Financed?"] ?? row["Is Bank Financed? (optional)"] ?? row["Is Bank Financed"] ?? row["Bank Financed"] ?? row["isBankFinanced"]);
    const salaryBand = parseSalaryBand(row["Salary Band"] ?? row["Salary Band (optional)"] ?? row["salary_band"] ?? row["SalaryBand"] ?? row["Salary band"]);
    const visaCategory = parseVisaCategory(row["Visa Category"] ?? row["Visa Category (optional)"] ?? row["visa_category"] ?? row["VisaCategory"] ?? row["Visa category"]);

    if (!name || !email) {
      warnings.push(`Skipped a row — missing name or email.`);
      continue;
    }
    if (age === null || maritalStatus === null) {
      warnings.push(`Skipped "${name}" — Age and Marital Status are required.`);
      continue;
    }

    // Lead Type column is optional — engine auto-detects from available fields.
    // If provided, validate it matches the data and warn if inconsistent.
    const leadTypeRaw = str(row["Lead Type"] ?? row["lead_type"] ?? row["LeadType"] ?? "").toLowerCase();
    if (leadTypeRaw === "motor" && (salaryBand !== null || visaCategory !== null)) {
      warnings.push(`"${name}" is marked Motor but has Health data — scored as Both.`);
    }
    if (leadTypeRaw === "health" && (carValue !== null || isBankFinanced !== null)) {
      warnings.push(`"${name}" is marked Health but has Motor data — scored as Both.`);
    }

    policyholders.push({ name, mobile, email, age, maritalStatus, carValue, isBankFinanced, salaryBand, visaCategory });
  }

  return { policyholders, warnings };
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "";
}

function normalizeEmail(value: unknown): string {
  const s = str(value).toLowerCase();
  return s;
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
  return (MARITAL_STATUSES.find((m) => m.toLowerCase() === value.trim().toLowerCase()) as MaritalStatus) ?? null;
}

const SALARY_BANDS: SalaryBand[] = [
  "Below 4000", "4000 - 12000", "More than 12000",
  "No Salary (dependent / Children)", "No Salary Commission Only",
];
function parseSalaryBand(value: unknown): SalaryBand | null {
  if (typeof value !== "string") return null;
  return (SALARY_BANDS.find((b) => b.toLowerCase() === value.trim().replace(/\s+/g, " ").toLowerCase()) as SalaryBand) ?? null;
}

const VISA_CATEGORIES: VisaCategory[] = [
  "Sponsored (Employer or Family)", "Investor / Partner",
  "Golden Visa", "Self Employed / Freelancer",
];
function parseVisaCategory(value: unknown): VisaCategory | null {
  if (typeof value !== "string") return null;
  return (VISA_CATEGORIES.find((c) => c.toLowerCase() === value.trim().replace(/\s+/g, " ").toLowerCase()) as VisaCategory) ?? null;
}
