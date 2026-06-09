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

export type OwnershipType =
  | "Homeowner Living in Property"
  | "Homeowner Renting Out Property"
  | "Tenant Renting Property";

export type PropertyType = "Apartment" | "Villa";

export type CoverageType = "Contents Only" | "Contents & Personal Belongings";

export type ContentsValueBand =
  | "AED 1-50,000"
  | "AED 50,001-100,000"
  | "AED 100,001-150,000"
  | "AED 150,001-200,000"
  | "AED 200,001-250,000"
  | "AED 250,001-300,000"
  | "AED 300,001-400,000";

export type PersonalBelongingsValueBand =
  | "AED 1-25,000"
  | "AED 25,001-50,000"
  | "AED 50,001-100,000"
  | "AED 100,001-150,000"
  | "AED 150,001 and Above";

export interface Policyholder {
  name: string;
  mobile: string;
  email: string;
  // Age + Marital Status: present on Motor/Health leads, null on Home-only leads
  age: number | null;
  maritalStatus: MaritalStatus | null;
  // Motor fields
  carValue: number | null;
  isBankFinanced: boolean | null;
  // Health fields
  salaryBand: SalaryBand | null;
  visaCategory: VisaCategory | null;
  // Home fields
  ownershipType: OwnershipType | null;
  propertyType: PropertyType | null;
  claimsHistory: boolean | null;
  coverageType: CoverageType | null;
  contentsValue: ContentsValueBand | null;
  personalBelongingsValue: PersonalBelongingsValueBand | null;
  locationArea: string | null;
}
