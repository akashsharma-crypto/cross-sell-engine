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

/**
 * A single policyholder record ready for scoring.
 * carValue, isBankFinanced, salaryBand, visaCategory are nullable —
 * Motor-only leads won't have salary/visa; Health-only leads won't have car data.
 * The scoring engine treats null as a neutral signal (0 points for that component).
 */
export interface Policyholder {
  name: string;
  mobile: string;
  email: string;
  age: number;
  maritalStatus: MaritalStatus;
  carValue: number | null;
  isBankFinanced: boolean | null;
  salaryBand: SalaryBand | null;
  visaCategory: VisaCategory | null;
}
