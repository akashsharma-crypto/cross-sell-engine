import type { Policyholder } from "@/types/policyholder";

export const samplePolicyholders: Policyholder[] = [
  // Motor leads — have car data, no salary/visa
  { name: "Ahmed Khan",      mobile: "501234567", email: "ahmed.khan@email.com",      age: 34, maritalStatus: "Married",  carValue: 85000,  isBankFinanced: true,  salaryBand: null, visaCategory: null },
  { name: "Maria Garcia",    mobile: "584567890", email: "maria.garcia@email.com",    age: 26, maritalStatus: "Single",   carValue: 45000,  isBankFinanced: true,  salaryBand: null, visaCategory: null },
  { name: "Michael Brown",   mobile: "509012345", email: "michael.brown@email.com",   age: 36, maritalStatus: "Married",  carValue: 140000, isBankFinanced: true,  salaryBand: null, visaCategory: null },
  { name: "David Wilson",    mobile: "551122334", email: "david.wilson@email.com",    age: 24, maritalStatus: "Single",   carValue: 38000,  isBankFinanced: true,  salaryBand: null, visaCategory: null },
  { name: "Kevin Lee",       mobile: "503344556", email: "kevin.lee@email.com",       age: 39, maritalStatus: "Married",  carValue: 165000, isBankFinanced: true,  salaryBand: null, visaCategory: null },
  { name: "Bilal Sheikh",    mobile: "507788990", email: "bilal.sheikh@email.com",    age: 33, maritalStatus: "Married",  carValue: 110000, isBankFinanced: true,  salaryBand: null, visaCategory: null },
  { name: "Yusuf Ibrahim",   mobile: "559900112", email: "yusuf.ibrahim@email.com",   age: 47, maritalStatus: "Married",  carValue: 75000,  isBankFinanced: false, salaryBand: null, visaCategory: null },
  { name: "Raj Patel",       mobile: "553456789", email: "raj.patel@email.com",       age: 41, maritalStatus: "Married",  carValue: 350000, isBankFinanced: false, salaryBand: null, visaCategory: null },

  // Health leads — have salary/visa, no car data
  { name: "Sarah Williams",  mobile: "522345678", email: "sarah.williams@email.com",  age: 29, maritalStatus: "Single",   carValue: null, isBankFinanced: null, salaryBand: "More than 12000",               visaCategory: "Sponsored (Employer or Family)" },
  { name: "Priya Sharma",    mobile: "588901234", email: "priya.sharma@email.com",    age: 27, maritalStatus: "Single",   carValue: null, isBankFinanced: null, salaryBand: "4000 - 12000",                  visaCategory: "Sponsored (Employer or Family)" },
  { name: "Fatima Ali",      mobile: "526789012", email: "fatima.ali@email.com",      age: 32, maritalStatus: "Married",  carValue: null, isBankFinanced: null, salaryBand: "No Salary (dependent / Children)", visaCategory: "Sponsored (Employer or Family)" },
  { name: "Aisha Rahman",    mobile: "520123456", email: "aisha.rahman@email.com",    age: 31, maritalStatus: "Married",  carValue: null, isBankFinanced: null, salaryBand: "No Salary (dependent / Children)", visaCategory: "Sponsored (Employer or Family)" },
  { name: "Elena Petrova",   mobile: "524455667", email: "elena.petrova@email.com",   age: 28, maritalStatus: "Single",   carValue: null, isBankFinanced: null, salaryBand: "4000 - 12000",                  visaCategory: "Sponsored (Employer or Family)" },
  { name: "Sophia Johnson",  mobile: "586677889", email: "sophia.johnson@email.com",  age: 22, maritalStatus: "Single",   carValue: null, isBankFinanced: null, salaryBand: "No Salary (dependent / Children)", visaCategory: "Sponsored (Employer or Family)" },
  { name: "Zainab Ahmed",    mobile: "581011223", email: "zainab.ahmed@email.com",    age: 19, maritalStatus: "Single",   carValue: null, isBankFinanced: null, salaryBand: "No Salary (dependent / Children)", visaCategory: "Sponsored (Employer or Family)" },

  // Both — full data available
  { name: "John Smith",      mobile: "557890123", email: "john.smith@email.com",      age: 45, maritalStatus: "Married",  carValue: 650000, isBankFinanced: false, salaryBand: "More than 12000", visaCategory: "Golden Visa" },
  { name: "Noor Abdullah",   mobile: "582233445", email: "noor.abdullah@email.com",   age: 42, maritalStatus: "Married",  carValue: 280000, isBankFinanced: false, salaryBand: "More than 12000", visaCategory: "Golden Visa" },
  { name: "Hassan Mahmood",  mobile: "555566778", email: "hassan.mahmood@email.com",  age: 51, maritalStatus: "Married",  carValue: 420000, isBankFinanced: false, salaryBand: "More than 12000", visaCategory: "Golden Visa" },
  { name: "Chloe Martin",    mobile: "528899001", email: "chloe.martin@email.com",    age: 30, maritalStatus: "Single",   carValue: 180000, isBankFinanced: true,  salaryBand: "More than 12000", visaCategory: "Investor / Partner" },
  { name: "Omar Hassan",     mobile: "505678901", email: "omar.hassan@email.com",     age: 38, maritalStatus: "Married",  carValue: 95000,  isBankFinanced: true,  salaryBand: "4000 - 12000",    visaCategory: "Sponsored (Employer or Family)" },
];
