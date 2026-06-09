import type { Policyholder } from "@/types/policyholder";

export interface ScoreComponent {
  key: string;
  label: string;
  points: number;
  max: number;
  note: string;
}

export type BucketCategory = "Life" | "Savings";
export type LeadType = "Motor" | "Health" | "Both";

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

// ─── Lead type detection ──────────────────────────────────────────────────────

function detectLeadType(p: Policyholder): LeadType {
  const hasMotor = p.carValue !== null || p.isBankFinanced !== null;
  const hasHealth = p.salaryBand !== null || p.visaCategory !== null;
  if (hasMotor && hasHealth) return "Both";
  if (hasMotor) return "Motor";
  return "Health";
}

// ─── Shared components (Age + Marital Status) ─────────────────────────────────

function ageLifeComponent(age: number): ScoreComponent {
  const points =
    age >= 30 && age <= 45 ? 30 :
    age >= 25 && age <= 29 ? 20 :
    age >= 46 && age <= 55 ? 15 :
    age > 55               ? 10 : 5;

  const note =
    age >= 30 && age <= 45 ? "Age 30–45 — peak life insurance need, most likely to have dependents and active income to protect." :
    age >= 25 && age <= 29 ? "Age 25–29 — early career stage, growing need as responsibilities build." :
    age >= 46 && age <= 55 ? "Age 46–55 — still relevant but dependents may be more independent." :
    age > 55               ? "Over 55 — protection still relevant but nature of need shifts." :
                             "Under 25 — limited dependents or financial obligations typically.";

  return { key: "age_life", label: "Age", points, max: 30, note };
}

function ageSavingsComponent(age: number): ScoreComponent {
  const points =
    age >= 31 && age <= 40 ? 30 :
    age <= 30               ? 25 :
    age >= 41 && age <= 50  ? 20 : 10;

  const note =
    age >= 31 && age <= 40 ? "Age 31–40 — peak earning years with urgency to start; best window for a savings plan to compound." :
    age <= 30               ? "Under 30 — longest investment horizon; compounding works hardest at this age." :
    age >= 41 && age <= 50  ? "Age 41–50 — runway is shortening, urgency to act is high." :
                              "Over 50 — limited accumulation runway; near-term income products may suit better.";

  return { key: "age_savings", label: "Age", points, max: 30, note };
}

function maritalLifeComponent(status: string): ScoreComponent {
  const points =
    status === "Married"  ? 25 :
    status === "Divorced" ? 15 :
    status === "Widowed"  ? 10 : 5;

  const note =
    status === "Married"  ? "Married — spouse and likely children depend on this income; highest protection need." :
    status === "Divorced" ? "Divorced — likely has children or financial obligations from the relationship." :
    status === "Widowed"  ? "Widowed — may have dependents; protection still relevant." :
                            "Single — limited dependents on record; lower immediate need.";

  return { key: "marital_life", label: "Marital Status", points, max: 25, note };
}

function maritalSavingsComponent(status: string): ScoreComponent {
  const points =
    status === "Married"  ? 20 :
    status === "Divorced" ? 15 :
    status === "Widowed"  ? 12 : 10;

  const note =
    status === "Married"  ? "Married — family savings goals (education, retirement together) add strong motivation to plan." :
    status === "Divorced" ? "Divorced — independent financial planning becomes more important." :
    status === "Widowed"  ? "Widowed — sole financial planner for the household." :
                            "Single — individual wealth accumulation focus.";

  return { key: "marital_savings", label: "Marital Status", points, max: 20, note };
}

// ─── Motor-specific components ────────────────────────────────────────────────

function carDebtLifeComponent(carValue: number | null, isBankFinanced: boolean | null): ScoreComponent {
  if (carValue === null || isBankFinanced === null) {
    return { key: "car_debt_life", label: "Car Value & Financing", points: 0, max: 45, note: "No car data available." };
  }

  let points = 0;
  let note = "";

  if (isBankFinanced) {
    if (carValue > 300_000)       { points = 45; note = `Bank-financed vehicle at AED ${carValue.toLocaleString()} — high-value debt that would fall directly to survivors.`; }
    else if (carValue > 150_000)  { points = 35; note = `Bank-financed vehicle at AED ${carValue.toLocaleString()} — significant outstanding loan creating a strong protection case.`; }
    else                          { points = 20; note = `Bank-financed vehicle at AED ${carValue.toLocaleString()} — moderate debt obligation in the event of loss of income.`; }
  } else {
    if (carValue > 300_000)       { points = 10; note = `Owns a high-value vehicle (AED ${carValue.toLocaleString()}) outright — wealth signal, but no active debt obligation.`; }
    else                          { points = 0;  note = `Vehicle not financed — no debt obligation to factor into life cover.`; }
  }

  return { key: "car_debt_life", label: "Car Value & Financing", points, max: 45, note };
}

function carWealthSavingsComponent(carValue: number | null, isBankFinanced: boolean | null): ScoreComponent {
  if (carValue === null || isBankFinanced === null) {
    return { key: "car_wealth_savings", label: "Car Value & Financing", points: 0, max: 50, note: "No car data available." };
  }

  let points = 0;
  let note = "";

  if (!isBankFinanced) {
    if (carValue > 300_000)       { points = 50; note = `Owns a AED ${carValue.toLocaleString()} vehicle outright — strong HNI signal with clear disposable wealth to invest.`; }
    else if (carValue > 200_000)  { points = 40; note = `AED ${carValue.toLocaleString()} vehicle, unfinanced — solid wealth base, good candidate for a structured savings plan.`; }
    else if (carValue > 150_000)  { points = 30; note = `AED ${carValue.toLocaleString()} vehicle, unfinanced — moderate wealth signal, capacity to save likely.`; }
    else if (carValue > 80_000)   { points = 15; note = `AED ${carValue.toLocaleString()} vehicle, unfinanced — some discretionary wealth but limited signal.`; }
    else                          { points = 5;  note = `Lower-value unfinanced vehicle — limited wealth signal from car data alone.`; }
  } else {
    if (carValue > 200_000)       { points = 20; note = `High-value vehicle (AED ${carValue.toLocaleString()}) but bank-financed — income is likely strong but current cash is committed to repayments.`; }
    else                          { points = 5;  note = `Financed vehicle — income committed to repayments; limited free capital for savings right now.`; }
  }

  return { key: "car_wealth_savings", label: "Car Value & Financing", points, max: 50, note };
}

// ─── Health-specific components ───────────────────────────────────────────────

function salaryLifeComponent(salaryBand: string | null): ScoreComponent {
  if (salaryBand === null) {
    return { key: "salary_life", label: "Salary Band", points: 0, max: 25, note: "No salary data available." };
  }

  const points =
    salaryBand === "More than 12000"                ? 25 :
    salaryBand === "4000 - 12000"                   ? 15 :
    salaryBand === "No Salary Commission Only"      ? 10 :
    salaryBand === "Below 4000"                     ? 5  : 0;

  const note =
    salaryBand === "More than 12000"                ? "Top salary band — largest income gap to replace if this person is lost; strongest life cover case." :
    salaryBand === "4000 - 12000"                   ? "Mid salary band — meaningful income that dependents would need replaced." :
    salaryBand === "No Salary Commission Only"      ? "Commission-based income — variable and less predictable; dependents face real uncertainty." :
    salaryBand === "Below 4000"                     ? "Lower salary band — smaller income gap but protection still relevant if there are dependents." :
                                                      "No independent income recorded — protection less driven by income replacement.";

  return { key: "salary_life", label: "Salary Band", points, max: 25, note };
}

function visaLifeComponent(visaCategory: string | null): ScoreComponent {
  if (visaCategory === null) {
    return { key: "visa_life", label: "Visa Category", points: 0, max: 20, note: "No visa data available." };
  }

  const points =
    visaCategory === "Sponsored (Employer or Family)" ? 20 :
    visaCategory === "Self Employed / Freelancer"      ? 15 :
    visaCategory === "Investor / Partner"              ? 10 : 8;

  const note =
    visaCategory === "Sponsored (Employer or Family)" ? "Sponsored visa — family's UAE residency tied to this person's employment; loss of income threatens their legal status." :
    visaCategory === "Self Employed / Freelancer"      ? "Self-employed — no employer-provided life or disability cover to fall back on." :
    visaCategory === "Investor / Partner"              ? "Investor/Partner visa — residency is independent of a single employer." :
                                                         "Golden Visa — long-term stable residency; less acute visa dependency risk.";

  return { key: "visa_life", label: "Visa Category", points, max: 20, note };
}

function salarySavingsComponent(salaryBand: string | null): ScoreComponent {
  if (salaryBand === null) {
    return { key: "salary_savings", label: "Salary Band", points: 0, max: 30, note: "No salary data available." };
  }

  const points =
    salaryBand === "More than 12000"                ? 30 :
    salaryBand === "4000 - 12000"                   ? 18 :
    salaryBand === "No Salary Commission Only"      ? 10 :
    salaryBand === "Below 4000"                     ? 5  : 0;

  const note =
    salaryBand === "More than 12000"                ? "Top salary band — highest capacity to commit to a regular savings or investment plan." :
    salaryBand === "4000 - 12000"                   ? "Mid salary band — meaningful disposable income; structured saving is realistic." :
    salaryBand === "No Salary Commission Only"      ? "Commission-based — income is variable; a savings plan with flexibility would suit." :
    salaryBand === "Below 4000"                     ? "Lower salary band — limited disposable income; smaller regular savings still possible." :
                                                      "No independent income — limited capacity to commit to a savings plan currently.";

  return { key: "salary_savings", label: "Salary Band", points, max: 30, note };
}

function visaSavingsComponent(visaCategory: string | null): ScoreComponent {
  if (visaCategory === null) {
    return { key: "visa_savings", label: "Visa Category", points: 0, max: 20, note: "No visa data available." };
  }

  const points =
    visaCategory === "Golden Visa"                     ? 20 :
    visaCategory === "Investor / Partner"              ? 18 :
    visaCategory === "Self Employed / Freelancer"      ? 15 :
                                                         8;

  const note =
    visaCategory === "Golden Visa"                     ? "Golden Visa — explicit long-term UAE residency; long-horizon investment plans make strong sense." :
    visaCategory === "Investor / Partner"              ? "Investor/Partner — business roots in the UAE suggest a long-term stay; savings plans are well-suited." :
    visaCategory === "Self Employed / Freelancer"      ? "Self-employed — no End-of-Service gratuity from an employer; building their own retirement fund is urgent." :
                                                         "Sponsored visa — residency tied to employment; less certainty on long-term UAE stay.";

  return { key: "visa_savings", label: "Visa Category", points, max: 20, note };
}

// ─── Score normalisation ──────────────────────────────────────────────────────

function normalizeScore(components: ScoreComponent[]): number {
  const totalPoints = components.reduce((s, c) => s + c.points, 0);
  const totalMax = components.reduce((s, c) => s + c.max, 0);
  if (totalMax === 0) return 0;
  return Math.round((totalPoints / totalMax) * 100);
}

// ─── Build component lists by lead type ───────────────────────────────────────

function buildLifeComponents(p: Policyholder, leadType: LeadType): ScoreComponent[] {
  const shared = [ageLifeComponent(p.age), maritalLifeComponent(p.maritalStatus)];
  if (leadType === "Motor") return [...shared, carDebtLifeComponent(p.carValue, p.isBankFinanced)];
  if (leadType === "Health") return [...shared, salaryLifeComponent(p.salaryBand), visaLifeComponent(p.visaCategory)];
  // Both — all signals
  return [...shared, carDebtLifeComponent(p.carValue, p.isBankFinanced), salaryLifeComponent(p.salaryBand), visaLifeComponent(p.visaCategory)];
}

function buildSavingsComponents(p: Policyholder, leadType: LeadType): ScoreComponent[] {
  const shared = [ageSavingsComponent(p.age), maritalSavingsComponent(p.maritalStatus)];
  if (leadType === "Motor") return [...shared, carWealthSavingsComponent(p.carValue, p.isBankFinanced)];
  if (leadType === "Health") return [...shared, salarySavingsComponent(p.salaryBand), visaSavingsComponent(p.visaCategory)];
  // Both — all signals
  return [...shared, carWealthSavingsComponent(p.carValue, p.isBankFinanced), salarySavingsComponent(p.salaryBand), visaSavingsComponent(p.visaCategory)];
}

// ─── Campaign bucket routing ──────────────────────────────────────────────────

function deriveBuckets(p: Policyholder, lifeScore: number, savingsScore: number): Bucket[] {
  const buckets: Bucket[] = [];

  if (lifeScore > BUCKET_THRESHOLD) {
    if (p.maritalStatus === "Married") {
      buckets.push({
        category: "Life",
        name: "Family Protection",
        reason: "Married — spouse and likely children depend on this income.",
      });
    }
    if (p.isBankFinanced === true) {
      buckets.push({
        category: "Life",
        name: "Debt Protection",
        reason: "Bank-financed vehicle — an outstanding loan that would fall to survivors.",
      });
    }
  }

  if (savingsScore > BUCKET_THRESHOLD) {
    const isFreelancer = p.visaCategory === "Self Employed / Freelancer";
    const hasHighCarWealth = p.carValue !== null && p.carValue > 150_000 && p.isBankFinanced === false;
    const hasHighSalary = p.salaryBand === "More than 12000";

    if (p.age > 40 || isFreelancer) {
      buckets.push({
        category: "Savings",
        name: "Retirement",
        reason: isFreelancer
          ? "Self-employed — no employer gratuity or pension; building their own retirement fund is urgent."
          : "Over 40 — retirement runway is shortening; a structured plan is timely.",
      });
    }

    if ((hasHighCarWealth || hasHighSalary) && p.age < 45) {
      buckets.push({
        category: "Savings",
        name: "Wealth Accumulation",
        reason: hasHighCarWealth
          ? "High-value unfinanced vehicle signals disposable wealth and appetite for investment."
          : "Top salary band with time on their side — ideal profile for a structured wealth plan.",
      });
    }

    if (p.maritalStatus === "Married") {
      buckets.push({
        category: "Savings",
        name: "Education",
        reason: "Married — likely to have children whose future education costs benefit from early, structured saving.",
      });
    }
  }

  return buckets;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function scorePolicyholder(person: Policyholder): ScoredPolicyholder {
  const leadType = detectLeadType(person);
  const life = buildLifeComponents(person, leadType);
  const savings = buildSavingsComponents(person, leadType);
  const lifeScore = normalizeScore(life);
  const savingsScore = normalizeScore(savings);

  return {
    person,
    leadType,
    life,
    savings,
    lifeScore,
    savingsScore,
    buckets: deriveBuckets(person, lifeScore, savingsScore),
  };
}

export function tierOf(value: number): PropensityTier {
  if (value >= 75) return "Very High";
  if (value >= 55) return "High";
  if (value >= 35) return "Moderate";
  return "Low";
}
