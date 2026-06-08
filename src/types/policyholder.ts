/**
 * Domain types for the propensity engine — matches the columns in the
 * Motor and Health policyholder Excel exports (merged by name/email into
 * one record per customer before scoring).
 */

export type MaritalStatus = "Married" | "Single" | "Divorced" | "Widowed";

export type SalaryBand =
  | "Below 4000"
  | "4000 - 12000"
  | "More than 12000"
  | "No Salary (dependent / Children)"
  | "No Salary Commission Only";

export type VisaCategory =
  | "Sponsored (Employer or Family)"
  | "Investor / Partner"
  | "Golden Visa"
  | "Self Employed / Freelancer";

/** A single merged policyholder record, ready for scoring. */
export interface Policyholder {
  name: string;
  mobile: string;
  email: string;
  age: number;
  maritalStatus: MaritalStatus;
  carValue: number;
  isBankFinanced: boolean;
  salaryBand: SalaryBand;
  visaCategory: VisaCategory;
}

/** Raw row shape as it appears in the uploaded Motor sheet. */
export interface MotorRow {
  Name: string;
  Mobile: string | number;
  Email: string;
  Age: number;
  "Marital Status": string;
  "Car Value": number;
  "Is Bank Financed?": string;
}

/** Raw row shape as it appears in the uploaded Health sheet. */
export interface HealthRow {
  Name: string;
  Mobile: string | number;
  Email: string;
  Age: number;
  "Marital Status": string;
  "Salary Band": string;
  "Visa Category": string;
}
