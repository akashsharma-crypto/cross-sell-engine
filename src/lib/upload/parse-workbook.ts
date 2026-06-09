import * as XLSX from "xlsx";
import type {
  ContentsValueBand, CoverageType, MaritalStatus, OwnershipType,
  PersonalBelongingsValueBand, Policyholder, PropertyType, SalaryBand, VisaCategory,
} from "@/types/policyholder";

export interface ParseResult {
  policyholders: Policyholder[];
  warnings: string[];
}

export function parseWorkbook(buffer: ArrayBuffer): ParseResult {
  const workbook = XLSX.read(buffer, { type: "array" });
  const warnings: string[] = [];
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    warnings.push("The workbook appears to be empty.");
    return { policyholders: [], warnings };
  }
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName]);
  const policyholders: Policyholder[] = [];

  for (const row of rows) {
    const name   = str(row["Name"] ?? row["Full Name"] ?? row["full_name"] ?? row["name"]);
    const mobile = str(row["Mobile"] ?? row["Phone"] ?? row["phone_number"] ?? row["mobile"] ?? "");
    const email  = str(row["Email"] ?? row["email"] ?? "").trim().toLowerCase();

    if (!name || !email) { warnings.push("Skipped a row — missing name or email."); continue; }

    // Age + Marital Status — required for Motor/Health, not for Home
    const age           = toNumber(row["Age"] ?? row["age"]);
    const maritalStatus = parseEnum(row["Marital Status"] ?? row["marital_status"], MARITAL_STATUSES);

    // Motor fields
    const carValue      = toNumber(row["Car Value"] ?? row["car_value"]);
    const isBankFinanced = parseYesNo(row["Is Bank Financed?"] ?? row["Is Bank Financed"] ?? row["Bank Financed"]);

    // Health fields
    const salaryBand    = parseEnum(row["Salary Band"] ?? row["salary_band"], SALARY_BANDS);
    const visaCategory  = parseEnum(row["Visa Category"] ?? row["visa_category"], VISA_CATEGORIES);

    // Home fields
    const ownershipType = parseEnum(
      row["Ownership Type"] ?? row["ownership_type"] ?? row["Do you own or rent your property?"],
      OWNERSHIP_TYPES
    );
    const propertyType  = parseEnum(row["Property Type"] ?? row["property_type"] ?? row["Type of Property"], PROPERTY_TYPES);
    const claimsHistory = parseYesNo(
      row["Claims History"] ?? row["claims_history"] ??
      row["Have you made any claims or experienced any losses in the past 5 years?"]
    );
    const coverageType  = parseEnum(
      row["Coverage Type"] ?? row["coverage_type"] ?? row["Type of Coverage You Need"],
      COVERAGE_TYPES
    );
    const contentsValue = parseEnum(row["Contents Value"] ?? row["contents_value"], CONTENTS_VALUE_BANDS);
    const personalBelongingsValue = parseEnum(
      row["Personal Belongings Value"] ?? row["personal_belongings_value"],
      PERSONAL_BELONGINGS_BANDS
    );
    const locationArea  = str(row["Location Area"] ?? row["location_area"] ?? row["Location"] ?? "") || null;

    // Determine if this is a home lead
    const isHomeLead = ownershipType !== null || propertyType !== null || contentsValue !== null;
    const isMotorHealthLead = carValue !== null || isBankFinanced !== null || salaryBand !== null || visaCategory !== null;

    // Age + Marital Status required only for Motor/Health leads
    if (!isHomeLead && isMotorHealthLead && (age === null || maritalStatus === null)) {
      warnings.push(`Skipped "${name}" — Age and Marital Status are required for Motor/Health leads.`);
      continue;
    }

    // Lead Type column validation (optional — just for consistency warnings)
    const leadTypeRaw = str(row["Lead Type"] ?? row["lead_type"] ?? "").toLowerCase();
    if (leadTypeRaw === "motor" && (salaryBand !== null || visaCategory !== null))
      warnings.push(`"${name}" is marked Motor but has Health data — scored as Both.`);
    if (leadTypeRaw === "health" && (carValue !== null || isBankFinanced !== null))
      warnings.push(`"${name}" is marked Health but has Motor data — scored as Both.`);

    policyholders.push({
      name, mobile, email,
      age: age ?? null,
      maritalStatus: (maritalStatus as MaritalStatus) ?? null,
      carValue, isBankFinanced,
      salaryBand: (salaryBand as SalaryBand) ?? null,
      visaCategory: (visaCategory as VisaCategory) ?? null,
      ownershipType: (ownershipType as OwnershipType) ?? null,
      propertyType: (propertyType as PropertyType) ?? null,
      claimsHistory,
      coverageType: (coverageType as CoverageType) ?? null,
      contentsValue: (contentsValue as ContentsValueBand) ?? null,
      personalBelongingsValue: (personalBelongingsValue as PersonalBelongingsValueBand) ?? null,
      locationArea: locationArea ?? null,
    });
  }

  return { policyholders, warnings };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "";
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;                              // empty string → null, not 0
    const n = Number(trimmed.replace(/[, ]/g, ""));
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

function parseEnum<T extends string>(value: unknown, list: readonly T[]): T | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  return list.find((item) => item.toLowerCase() === trimmed.toLowerCase()) ?? null;
}

const MARITAL_STATUSES     = ["Married", "Single", "Divorced", "Widowed"] as const;
const SALARY_BANDS         = ["Below 4000", "4000 - 12000", "More than 12000", "No Salary (dependent / Children)", "No Salary Commission Only"] as const;
const VISA_CATEGORIES      = ["Sponsored (Employer or Family)", "Investor / Partner", "Golden Visa", "Self Employed / Freelancer"] as const;
const OWNERSHIP_TYPES      = ["Homeowner Living in Property", "Homeowner Renting Out Property", "Tenant Renting Property"] as const;
const PROPERTY_TYPES       = ["Apartment", "Villa"] as const;
const COVERAGE_TYPES       = ["Contents Only", "Contents & Personal Belongings"] as const;
const CONTENTS_VALUE_BANDS = ["AED 1-50,000", "AED 50,001-100,000", "AED 100,001-150,000", "AED 150,001-200,000", "AED 200,001-250,000", "AED 250,001-300,000", "AED 300,001-400,000"] as const;
const PERSONAL_BELONGINGS_BANDS = ["AED 1-25,000", "AED 25,001-50,000", "AED 50,001-100,000", "AED 100,001-150,000", "AED 150,001 and Above"] as const;
