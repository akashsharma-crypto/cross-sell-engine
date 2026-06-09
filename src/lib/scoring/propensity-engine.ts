import type { Policyholder } from "@/types/policyholder";

export interface ScoreComponent {
  key: string;
  label: string;
  points: number;
  max: number;
  note: string;
}

export type BucketCategory = "Life" | "Savings";
export type LeadType = "Motor" | "Health" | "Both" | "Home";

export interface Bucket {
  category: BucketCategory;
  name: string;
  reason: string;
}

export interface ScoredPolicyholder {
  person: Policyholder;
  leadType: LeadType;
  life: ScoreComponent[];
  savings: ScoreComponent[];
  lifeScore: number;
  savingsScore: number;
  buckets: Bucket[];
}

export type PropensityTier = "Low" | "Moderate" | "High" | "Very High";

const BUCKET_THRESHOLD = 50;

const PREMIUM_LOCATIONS = [
  "dubai marina", "downtown dubai", "palm jumeirah", "difc", "business bay",
  "jumeirah beach residence", "jbr", "emirates hills", "jumeirah", "arabian ranches",
  "city walk", "la mer", "bluewaters", "dubai hills", "creek harbour",
];
const MID_LOCATIONS = [
  "jvc", "jumeirah village circle", "sports city", "al barsha", "motor city",
  "discovery gardens", "dubai silicon oasis", "mirdif", "deira", "bur dubai",
  "international city", "al nahda", "al qusais",
];

// Contents value band → numeric midpoint (AED)
const CONTENTS_MIDPOINT: Record<string, number> = {
  "AED 1-50,000":        25_000,
  "AED 50,001-100,000":  75_000,
  "AED 100,001-150,000": 125_000,
  "AED 150,001-200,000": 175_000,
  "AED 200,001-250,000": 225_000,
  "AED 250,001-300,000": 275_000,
  "AED 300,001-400,000": 350_000,
};

const BELONGINGS_MIDPOINT: Record<string, number> = {
  "AED 1-25,000":         12_500,
  "AED 25,001-50,000":    37_500,
  "AED 50,001-100,000":   75_000,
  "AED 100,001-150,000":  125_000,
  "AED 150,001 and Above":175_000,
};

function combinedContentsValue(p: Policyholder): number {
  const c = p.contentsValue ? (CONTENTS_MIDPOINT[p.contentsValue] ?? 0) : 0;
  const b = p.personalBelongingsValue ? (BELONGINGS_MIDPOINT[p.personalBelongingsValue] ?? 0) : 0;
  return c + b;
}

function locationTier(area: string | null): "premium" | "mid" | "standard" {
  if (!area) return "standard";
  const lower = area.toLowerCase();
  if (PREMIUM_LOCATIONS.some((l) => lower.includes(l))) return "premium";
  if (MID_LOCATIONS.some((l) => lower.includes(l))) return "mid";
  return "standard";
}

// ─── Lead type detection ──────────────────────────────────────────────────────

function detectLeadType(p: Policyholder): LeadType {
  const hasMotor  = p.carValue !== null || p.isBankFinanced !== null;
  const hasHealth = p.salaryBand !== null || p.visaCategory !== null;
  const hasHome   = p.ownershipType !== null || p.propertyType !== null || p.contentsValue !== null;
  if (hasHome && !hasMotor && !hasHealth) return "Home";
  if (hasMotor && hasHealth) return "Both";
  if (hasMotor) return "Motor";
  return "Health";
}

// ─── Shared components ────────────────────────────────────────────────────────

function ageLifeComponent(age: number | null): ScoreComponent {
  if (age === null) return { key: "age_life", label: "Age", points: 0, max: 30, note: "Age not provided." };
  const points = age >= 30 && age <= 45 ? 30 : age >= 25 ? 20 : age <= 55 ? 15 : age > 55 ? 10 : 5;
  const note =
    age >= 30 && age <= 45 ? "Age 30–45 — peak life insurance need." :
    age >= 25              ? "Age 25–29 — growing need as responsibilities build." :
    age <= 55              ? "Age 46–55 — still relevant, dependents may be maturing." :
                             age > 55 ? "Over 55 — protection still relevant." : "Under 25 — limited obligations typically.";
  return { key: "age_life", label: "Age", points, max: 30, note };
}

function ageSavingsComponent(age: number | null): ScoreComponent {
  if (age === null) return { key: "age_savings", label: "Age", points: 0, max: 30, note: "Age not provided." };
  const points = age >= 31 && age <= 40 ? 30 : age <= 30 ? 25 : age <= 50 ? 20 : 10;
  const note =
    age >= 31 && age <= 40 ? "Age 31–40 — peak earning years, best window for a savings plan." :
    age <= 30               ? "Under 30 — longest investment horizon." :
    age <= 50               ? "Age 41–50 — urgency building, runway shortening." :
                              "Over 50 — near-term products may suit better.";
  return { key: "age_savings", label: "Age", points, max: 30, note };
}

function maritalLifeComponent(status: string | null): ScoreComponent {
  if (status === null) return { key: "marital_life", label: "Marital Status", points: 0, max: 25, note: "Marital status not provided." };
  const points = status === "Married" ? 25 : status === "Divorced" ? 15 : status === "Widowed" ? 10 : 5;
  const note =
    status === "Married"  ? "Married — spouse and likely children depend on this income." :
    status === "Divorced" ? "Divorced — likely has children or financial obligations." :
    status === "Widowed"  ? "Widowed — may have dependents." : "Single — limited dependents on record.";
  return { key: "marital_life", label: "Marital Status", points, max: 25, note };
}

function maritalSavingsComponent(status: string | null): ScoreComponent {
  if (status === null) return { key: "marital_savings", label: "Marital Status", points: 0, max: 20, note: "Marital status not provided." };
  const points = status === "Married" ? 20 : status === "Divorced" ? 15 : status === "Widowed" ? 12 : 10;
  const note =
    status === "Married"  ? "Married — family savings goals add strong motivation to plan." :
    status === "Divorced" ? "Divorced — independent financial planning more important." :
    status === "Widowed"  ? "Widowed — sole financial planner for the household." : "Single — individual wealth accumulation focus.";
  return { key: "marital_savings", label: "Marital Status", points, max: 20, note };
}

// ─── Motor components ─────────────────────────────────────────────────────────

function carDebtLifeComponent(carValue: number | null, isBankFinanced: boolean | null): ScoreComponent {
  if (carValue === null || isBankFinanced === null)
    return { key: "car_debt_life", label: "Car Value & Financing", points: 0, max: 45, note: "No car data available." };
  let points = 0; let note = "";
  if (isBankFinanced) {
    if (carValue > 300_000)      { points = 45; note = `Financed at AED ${carValue.toLocaleString()} — high-value debt that falls to survivors.`; }
    else if (carValue > 150_000) { points = 35; note = `Financed at AED ${carValue.toLocaleString()} — significant outstanding loan.`; }
    else                         { points = 20; note = `Financed at AED ${carValue.toLocaleString()} — moderate debt obligation.`; }
  } else {
    if (carValue > 300_000)      { points = 10; note = `Owns AED ${carValue.toLocaleString()} vehicle outright — wealth signal, no active debt.`; }
    else                         { points = 0;  note = "Vehicle not financed — no debt obligation."; }
  }
  return { key: "car_debt_life", label: "Car Value & Financing", points, max: 45, note };
}

function carWealthSavingsComponent(carValue: number | null, isBankFinanced: boolean | null): ScoreComponent {
  if (carValue === null || isBankFinanced === null)
    return { key: "car_wealth_savings", label: "Car Value & Financing", points: 0, max: 50, note: "No car data available." };
  let points = 0; let note = "";
  if (!isBankFinanced) {
    if (carValue > 300_000)      { points = 50; note = `AED ${carValue.toLocaleString()} unfinanced — strong HNI signal with clear disposable wealth.`; }
    else if (carValue > 200_000) { points = 40; note = `AED ${carValue.toLocaleString()} unfinanced — solid wealth base.`; }
    else if (carValue > 150_000) { points = 30; note = `AED ${carValue.toLocaleString()} unfinanced — moderate wealth signal.`; }
    else if (carValue > 80_000)  { points = 15; note = `AED ${carValue.toLocaleString()} unfinanced — some discretionary wealth.`; }
    else                         { points = 5;  note = "Lower-value unfinanced vehicle — limited wealth signal."; }
  } else {
    if (carValue > 200_000)      { points = 20; note = `High-value financed vehicle — income likely strong but cash committed to repayments.`; }
    else                         { points = 5;  note = "Financed vehicle — limited free capital currently."; }
  }
  return { key: "car_wealth_savings", label: "Car Value & Financing", points, max: 50, note };
}

// ─── Health components ────────────────────────────────────────────────────────

function salaryLifeComponent(salaryBand: string | null): ScoreComponent {
  if (salaryBand === null) return { key: "salary_life", label: "Salary Band", points: 0, max: 25, note: "No salary data available." };
  const points = salaryBand === "More than 12000" ? 25 : salaryBand === "4000 - 12000" ? 15 : salaryBand === "No Salary Commission Only" ? 10 : salaryBand === "Below 4000" ? 5 : 0;
  const note =
    salaryBand === "More than 12000"           ? "Top salary — largest income gap to replace." :
    salaryBand === "4000 - 12000"              ? "Mid salary — meaningful income dependents would need replaced." :
    salaryBand === "No Salary Commission Only" ? "Commission-based — variable income; dependents face uncertainty." :
    salaryBand === "Below 4000"                ? "Lower salary — smaller gap but protection still relevant." : "No independent income recorded.";
  return { key: "salary_life", label: "Salary Band", points, max: 25, note };
}

function visaLifeComponent(visaCategory: string | null): ScoreComponent {
  if (visaCategory === null) return { key: "visa_life", label: "Visa Category", points: 0, max: 20, note: "No visa data available." };
  const points = visaCategory === "Sponsored (Employer or Family)" ? 20 : visaCategory === "Self Employed / Freelancer" ? 15 : visaCategory === "Investor / Partner" ? 10 : 8;
  const note =
    visaCategory === "Sponsored (Employer or Family)" ? "Sponsored — family's UAE residency tied to this person's employment." :
    visaCategory === "Self Employed / Freelancer"      ? "Self-employed — no employer life or disability cover." :
    visaCategory === "Investor / Partner"              ? "Investor — residency independent of a single employer." : "Golden Visa — stable long-term residency.";
  return { key: "visa_life", label: "Visa Category", points, max: 20, note };
}

function salarySavingsComponent(salaryBand: string | null): ScoreComponent {
  if (salaryBand === null) return { key: "salary_savings", label: "Salary Band", points: 0, max: 30, note: "No salary data available." };
  const points = salaryBand === "More than 12000" ? 30 : salaryBand === "4000 - 12000" ? 18 : salaryBand === "No Salary Commission Only" ? 10 : salaryBand === "Below 4000" ? 5 : 0;
  const note =
    salaryBand === "More than 12000"           ? "Top salary — highest capacity for a regular savings plan." :
    salaryBand === "4000 - 12000"              ? "Mid salary — structured saving is realistic." :
    salaryBand === "No Salary Commission Only" ? "Commission-based — flexible savings plan would suit." :
    salaryBand === "Below 4000"                ? "Lower salary — smaller regular savings still possible." : "No independent income — limited saving capacity.";
  return { key: "salary_savings", label: "Salary Band", points, max: 30, note };
}

function visaSavingsComponent(visaCategory: string | null): ScoreComponent {
  if (visaCategory === null) return { key: "visa_savings", label: "Visa Category", points: 0, max: 20, note: "No visa data available." };
  const points = visaCategory === "Golden Visa" ? 20 : visaCategory === "Investor / Partner" ? 18 : visaCategory === "Self Employed / Freelancer" ? 15 : 8;
  const note =
    visaCategory === "Golden Visa"                     ? "Golden Visa — long-term UAE residency; long-horizon plans make strong sense." :
    visaCategory === "Investor / Partner"              ? "Investor — business roots in UAE suggest long-term stay." :
    visaCategory === "Self Employed / Freelancer"      ? "Self-employed — no End-of-Service gratuity; urgent to build own retirement fund." : "Sponsored — residency tied to employment.";
  return { key: "visa_savings", label: "Visa Category", points, max: 20, note };
}

// ─── Home components ──────────────────────────────────────────────────────────

function ownershipLifeComponent(p: Policyholder): ScoreComponent {
  const points = p.ownershipType === "Homeowner Living in Property" ? 35 : p.ownershipType === "Homeowner Renting Out Property" ? 25 : 15;
  const note =
    p.ownershipType === "Homeowner Living in Property"  ? "Homeowner living in property — family likely present, possibly mortgaged, highest protection need." :
    p.ownershipType === "Homeowner Renting Out Property"? "Renting out property — has assets to protect; income from rental could be disrupted." :
                                                          "Tenant — renting; moderate protection signal.";
  return { key: "ownership_life", label: "Ownership Type", points, max: 35, note };
}

function contentsLifeComponent(p: Policyholder): ScoreComponent {
  const combined = combinedContentsValue(p);
  const points = combined > 300_000 ? 30 : combined > 200_000 ? 22 : combined > 100_000 ? 15 : combined > 50_000 ? 8 : 3;
  const note = `Combined insured value ~AED ${combined.toLocaleString()} — ${combined > 200_000 ? "significant assets to protect." : combined > 100_000 ? "moderate asset base." : "lower asset base."}`;
  return { key: "contents_life", label: "Contents & Belongings Value", points, max: 30, note };
}

function coverageLifeComponent(p: Policyholder): ScoreComponent {
  const points = p.coverageType === "Contents & Personal Belongings" ? 20 : 10;
  const note = p.coverageType === "Contents & Personal Belongings"
    ? "Insuring contents and personal belongings — protecting more assets, stronger life cover case."
    : "Contents only coverage — moderate asset protection.";
  return { key: "coverage_life", label: "Coverage Type", points, max: 20, note };
}

function propertyLocationLifeComponent(p: Policyholder): ScoreComponent {
  const tier = locationTier(p.locationArea);
  let points = 0;
  if (p.propertyType === "Villa") points += 8;
  if (tier === "premium") points += 7;
  else if (tier === "mid") points += 4;
  const note = `${p.propertyType ?? "Property"} in ${p.locationArea ?? "unknown area"} — ${tier === "premium" ? "premium location, high-value asset." : tier === "mid" ? "mid-tier area." : "standard area."}`;
  return { key: "property_location_life", label: "Property & Location", points, max: 15, note };
}

function ownershipSavingsComponent(p: Policyholder): ScoreComponent {
  const points = p.ownershipType === "Homeowner Renting Out Property" ? 35 : p.ownershipType === "Homeowner Living in Property" ? 20 : 10;
  const note =
    p.ownershipType === "Homeowner Renting Out Property" ? "Renting out property — clear investor mindset; strongest savings and wealth accumulation signal." :
    p.ownershipType === "Homeowner Living in Property"   ? "Homeowner — has a property asset; savings plan complements existing wealth building." :
                                                           "Tenant — may be saving to buy; a structured savings plan is timely.";
  return { key: "ownership_savings", label: "Ownership Type", points, max: 35, note };
}

function contentsSavingsComponent(p: Policyholder): ScoreComponent {
  const combined = combinedContentsValue(p);
  const points = combined > 300_000 ? 30 : combined > 200_000 ? 22 : combined > 100_000 ? 15 : combined > 50_000 ? 8 : 3;
  const note = `Combined insured value ~AED ${combined.toLocaleString()} — ${combined > 200_000 ? "high-value lifestyle, strong disposable wealth signal." : "moderate asset base."}`;
  return { key: "contents_savings", label: "Contents & Belongings Value", points, max: 30, note };
}

function locationSavingsComponent(p: Policyholder): ScoreComponent {
  const tier = locationTier(p.locationArea);
  const points = tier === "premium" ? 20 : tier === "mid" ? 12 : 5;
  const note =
    tier === "premium" ? `${p.locationArea} — premium area; high disposable income likely.` :
    tier === "mid"     ? `${p.locationArea} — mid-tier area; moderate income signal.` :
                         `${p.locationArea ?? "Unknown area"} — standard area.`;
  return { key: "location_savings", label: "Location", points, max: 20, note };
}

function claimsSavingsComponent(p: Policyholder): ScoreComponent {
  if (p.claimsHistory === null) return { key: "claims_savings", label: "Claims History", points: 0, max: 15, note: "Claims history not provided." };
  const points = p.claimsHistory === false ? 15 : 5;
  const note = p.claimsHistory === false
    ? "No claims in past 5 years — financially stable, no major disruptions."
    : "Has made claims — some financial disruption in past 5 years.";
  return { key: "claims_savings", label: "Claims History", points, max: 15, note };
}

// ─── Score normalisation ──────────────────────────────────────────────────────

function normalizeScore(components: ScoreComponent[]): number {
  const totalPoints = components.reduce((s, c) => s + c.points, 0);
  const totalMax    = components.reduce((s, c) => s + c.max, 0);
  if (totalMax === 0) return 0;
  return Math.round((totalPoints / totalMax) * 100);
}

// ─── Build component lists by lead type ───────────────────────────────────────

function buildLifeComponents(p: Policyholder, leadType: LeadType): ScoreComponent[] {
  if (leadType === "Home") {
    return [ownershipLifeComponent(p), contentsLifeComponent(p), coverageLifeComponent(p), propertyLocationLifeComponent(p)];
  }
  const shared = [ageLifeComponent(p.age), maritalLifeComponent(p.maritalStatus)];
  if (leadType === "Motor")  return [...shared, carDebtLifeComponent(p.carValue, p.isBankFinanced)];
  if (leadType === "Health") return [...shared, salaryLifeComponent(p.salaryBand), visaLifeComponent(p.visaCategory)];
  return [...shared, carDebtLifeComponent(p.carValue, p.isBankFinanced), salaryLifeComponent(p.salaryBand), visaLifeComponent(p.visaCategory)];
}

function buildSavingsComponents(p: Policyholder, leadType: LeadType): ScoreComponent[] {
  if (leadType === "Home") {
    return [ownershipSavingsComponent(p), contentsSavingsComponent(p), locationSavingsComponent(p), claimsSavingsComponent(p)];
  }
  const shared = [ageSavingsComponent(p.age), maritalSavingsComponent(p.maritalStatus)];
  if (leadType === "Motor")  return [...shared, carWealthSavingsComponent(p.carValue, p.isBankFinanced)];
  if (leadType === "Health") return [...shared, salarySavingsComponent(p.salaryBand), visaSavingsComponent(p.visaCategory)];
  return [...shared, carWealthSavingsComponent(p.carValue, p.isBankFinanced), salarySavingsComponent(p.salaryBand), visaSavingsComponent(p.visaCategory)];
}

// ─── Campaign routing ─────────────────────────────────────────────────────────

function deriveBuckets(p: Policyholder, leadType: LeadType, lifeScore: number, savingsScore: number): Bucket[] {
  const buckets: Bucket[] = [];

  if (lifeScore > BUCKET_THRESHOLD) {
    if (leadType === "Home") {
      if (p.ownershipType === "Homeowner Living in Property") {
        buckets.push({ category: "Life", name: "Family Protection", reason: "Homeowner living in property — family likely present, high protection need." });
      }
      if (p.propertyType === "Villa") {
        buckets.push({ category: "Life", name: "Debt Protection", reason: "Villa owner — higher likelihood of a mortgage or large financial commitment." });
      }
    } else {
      if (p.maritalStatus === "Married") {
        buckets.push({ category: "Life", name: "Family Protection", reason: "Married — spouse and likely children depend on this income." });
      }
      if (p.isBankFinanced === true) {
        buckets.push({ category: "Life", name: "Debt Protection", reason: "Bank-financed vehicle — outstanding loan that would fall to survivors." });
      }
    }
  }

  if (savingsScore > BUCKET_THRESHOLD) {
    if (leadType === "Home") {
      const combined = combinedContentsValue(p);
      if (p.ownershipType === "Homeowner Renting Out Property" || combined > 200_000) {
        buckets.push({ category: "Savings", name: "Retirement", reason: p.ownershipType === "Homeowner Renting Out Property" ? "Property investor — clear long-term wealth mindset; retirement planning is a natural next step." : "High-value assets insured — financially active profile suited to retirement planning." });
      }
      if (p.ownershipType === "Homeowner Renting Out Property" && locationTier(p.locationArea) === "premium") {
        buckets.push({ category: "Savings", name: "Wealth Accumulation", reason: "Property investor in a premium area — strong wealth accumulation profile." });
      }
      if (p.ownershipType === "Homeowner Living in Property") {
        buckets.push({ category: "Savings", name: "Education", reason: "Homeowner living in property — family likely present; education savings plan is timely." });
      }
    } else {
      const isFreelancer    = p.visaCategory === "Self Employed / Freelancer";
      const hasHighCarWealth = p.carValue !== null && p.carValue > 150_000 && p.isBankFinanced === false;
      const hasHighSalary   = p.salaryBand === "More than 12000";

      if (p.age !== null && (p.age > 40 || isFreelancer)) {
        buckets.push({ category: "Savings", name: "Retirement", reason: isFreelancer ? "Self-employed — no employer gratuity; building own retirement fund is urgent." : "Over 40 — retirement runway shortening; a structured plan is timely." });
      }
      if ((hasHighCarWealth || hasHighSalary) && (p.age === null || p.age < 45)) {
        buckets.push({ category: "Savings", name: "Wealth Accumulation", reason: hasHighCarWealth ? "High-value unfinanced vehicle — disposable wealth and investment appetite." : "Top salary with time to grow — ideal for a structured wealth plan." });
      }
      if (p.maritalStatus === "Married") {
        buckets.push({ category: "Savings", name: "Education", reason: "Married — likely has children whose education costs benefit from early saving." });
      }
    }
  }

  return buckets;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function scorePolicyholder(person: Policyholder): ScoredPolicyholder {
  const leadType    = detectLeadType(person);
  const life        = buildLifeComponents(person, leadType);
  const savings     = buildSavingsComponents(person, leadType);
  const lifeScore   = normalizeScore(life);
  const savingsScore = normalizeScore(savings);
  return { person, leadType, life, savings, lifeScore, savingsScore, buckets: deriveBuckets(person, leadType, lifeScore, savingsScore) };
}

export function tierOf(value: number): PropensityTier {
  if (value >= 75) return "Very High";
  if (value >= 55) return "High";
  if (value >= 35) return "Moderate";
  return "Low";
}
