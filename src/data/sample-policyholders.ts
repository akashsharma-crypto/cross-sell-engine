import type { Policyholder } from "@/types/policyholder";

const NONE = { ownershipType: null, propertyType: null, claimsHistory: null, coverageType: null, contentsValue: null, personalBelongingsValue: null, locationArea: null } as const;

export const samplePolicyholders: Policyholder[] = [
  // ── Motor leads ──────────────────────────────────────────────────────────────
  { name: "Ahmed Khan",    mobile: "501234567", email: "ahmed.khan@email.com",    age: 34, maritalStatus: "Married", carValue: 85000,  isBankFinanced: true,  salaryBand: null, visaCategory: null, ...NONE },
  { name: "Maria Garcia",  mobile: "584567890", email: "maria.garcia@email.com",  age: 26, maritalStatus: "Single",  carValue: 45000,  isBankFinanced: true,  salaryBand: null, visaCategory: null, ...NONE },
  { name: "Michael Brown", mobile: "509012345", email: "michael.brown@email.com", age: 36, maritalStatus: "Married", carValue: 140000, isBankFinanced: true,  salaryBand: null, visaCategory: null, ...NONE },
  { name: "Kevin Lee",     mobile: "503344556", email: "kevin.lee@email.com",     age: 39, maritalStatus: "Married", carValue: 165000, isBankFinanced: true,  salaryBand: null, visaCategory: null, ...NONE },
  { name: "Raj Patel",     mobile: "553456789", email: "raj.patel@email.com",     age: 41, maritalStatus: "Married", carValue: 350000, isBankFinanced: false, salaryBand: null, visaCategory: null, ...NONE },
  { name: "Yusuf Ibrahim", mobile: "559900112", email: "yusuf.ibrahim@email.com", age: 47, maritalStatus: "Married", carValue: 75000,  isBankFinanced: false, salaryBand: null, visaCategory: null, ...NONE },

  // ── Health leads ─────────────────────────────────────────────────────────────
  { name: "Sarah Williams", mobile: "522345678", email: "sarah.williams@email.com", age: 29, maritalStatus: "Single",  carValue: null, isBankFinanced: null, salaryBand: "More than 12000",                visaCategory: "Sponsored (Employer or Family)", ...NONE },
  { name: "Priya Sharma",   mobile: "588901234", email: "priya.sharma@email.com",   age: 27, maritalStatus: "Single",  carValue: null, isBankFinanced: null, salaryBand: "4000 - 12000",                   visaCategory: "Sponsored (Employer or Family)", ...NONE },
  { name: "Fatima Ali",     mobile: "526789012", email: "fatima.ali@email.com",     age: 32, maritalStatus: "Married", carValue: null, isBankFinanced: null, salaryBand: "No Salary (dependent / Children)", visaCategory: "Sponsored (Employer or Family)", ...NONE },
  { name: "Elena Petrova",  mobile: "524455667", email: "elena.petrova@email.com",  age: 28, maritalStatus: "Single",  carValue: null, isBankFinanced: null, salaryBand: "4000 - 12000",                   visaCategory: "Sponsored (Employer or Family)", ...NONE },
  { name: "Bilal Sheikh",   mobile: "507788990", email: "bilal.sheikh@email.com",   age: 33, maritalStatus: "Married", carValue: null, isBankFinanced: null, salaryBand: "4000 - 12000",                   visaCategory: "Sponsored (Employer or Family)", ...NONE },

  // ── Home leads ───────────────────────────────────────────────────────────────
  { name: "John Smith",     mobile: "557890123", email: "john.smith@email.com",     age: null, maritalStatus: null, carValue: null, isBankFinanced: null, salaryBand: null, visaCategory: null, ownershipType: "Homeowner Living in Property",  propertyType: "Villa",     claimsHistory: false, coverageType: "Contents & Personal Belongings", contentsValue: "AED 300,001-400,000", personalBelongingsValue: "AED 100,001-150,000", locationArea: "Dubai Marina" },
  { name: "Noor Abdullah",  mobile: "582233445", email: "noor.abdullah@email.com",  age: null, maritalStatus: null, carValue: null, isBankFinanced: null, salaryBand: null, visaCategory: null, ownershipType: "Homeowner Renting Out Property", propertyType: "Apartment", claimsHistory: false, coverageType: "Contents & Personal Belongings", contentsValue: "AED 200,001-250,000", personalBelongingsValue: "AED 50,001-100,000",  locationArea: "Downtown Dubai" },
  { name: "Chloe Martin",   mobile: "528899001", email: "chloe.martin@email.com",   age: null, maritalStatus: null, carValue: null, isBankFinanced: null, salaryBand: null, visaCategory: null, ownershipType: "Tenant Renting Property",        propertyType: "Apartment", claimsHistory: true,  coverageType: "Contents Only",                  contentsValue: "AED 50,001-100,000",  personalBelongingsValue: "AED 25,001-50,000",   locationArea: "JVC" },
  { name: "Hassan Mahmood", mobile: "555566778", email: "hassan.mahmood@email.com", age: null, maritalStatus: null, carValue: null, isBankFinanced: null, salaryBand: null, visaCategory: null, ownershipType: "Homeowner Living in Property",  propertyType: "Villa",     claimsHistory: false, coverageType: "Contents & Personal Belongings", contentsValue: "AED 250,001-300,000", personalBelongingsValue: "AED 100,001-150,000", locationArea: "Arabian Ranches" },
  { name: "Aisha Rahman",   mobile: "520123456", email: "aisha.rahman@email.com",   age: null, maritalStatus: null, carValue: null, isBankFinanced: null, salaryBand: null, visaCategory: null, ownershipType: "Homeowner Renting Out Property", propertyType: "Apartment", claimsHistory: false, coverageType: "Contents Only",                  contentsValue: "AED 100,001-150,000", personalBelongingsValue: null,                          locationArea: "Business Bay" },
];
