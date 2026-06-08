import type { Policyholder } from "@/types/policyholder";

/**
 * Propensity scoring engine.
 *
 * Each score (Life, Savings) is assembled from named, explainable components —
 * not flat single-field point grants — so the dominant component both explains
 * the score AND drives which campaign bucket the lead is routed to. This is the
 * rules-based MVP behind the "propensity score": it is intentionally structured
 * so a learned model can later replace the component functions without changing
 * the score contract (0-100 + named component breakdown).
 */

export interface ScoreComponent {
  key: string;
  label: string;
  points: number;
  max: number;
  note: string;
}

export type BucketCategory = "Life" | "Savings";

export interface Bucket {
  category: BucketCategory;
  name: string;
  reason: string;
}

export interface ScoredPolicyholder {
  person: Policyholder;
  life: ScoreComponent[];
  savings: ScoreComponent[];
  lifeScore: number;
  savingsScore: number;
  buckets: Bucket[];
}

export type PropensityTier = "Low" | "Moderate" | "High" | "Very High";

const SALARY_RANK: Record<string, number> = {
  "Below 4000": 0,
  "No Salary (dependent / Children)": 0,
  "No Salary Commission Only": 0,
  "4000 - 12000": 1,
  "More than 12000": 2,
};

const HIGH_VALUE_CAR = 150_000;
const BUCKET_THRESHOLD = 50;

function lifeComponents(p: Policyholder): ScoreComponent[] {
  const married = p.maritalStatus === "Married";
  const primeAge = p.age > 30;
  const sponsored = p.visaCategory === "Sponsored (Employer or Family)";
  const freelancer = p.visaCategory === "Self Employed / Freelancer";
  const wealthVisa = p.visaCategory === "Golden Visa" || p.visaCategory === "Investor / Partner";

  const dependencyRisk = !married ? 0 : primeAge ? 35 : 20;

  let visaVulnerability = 0;
  if (sponsored) visaVulnerability = married ? 20 : 8;
  else if (freelancer) visaVulnerability = 10;
  else if (wealthVisa) visaVulnerability = 5;

  let debtObligation = 0;
  if (p.isBankFinanced) debtObligation = p.carValue > HIGH_VALUE_CAR ? 25 : 15;

  const incomeReplacement = SALARY_RANK[p.salaryBand] === 2 ? 20 : SALARY_RANK[p.salaryBand] === 1 ? 10 : 0;

  return [
    {
      key: "dependency",
      label: "Dependency risk (marital status + age)",
      points: dependencyRisk,
      max: 35,
      note: !married
        ? "Single — no spouse/dependents on record."
        : primeAge
        ? "Married, over 30 — spouse and likely children depend on this income."
        : "Married, under 30 — spouse depends on this income; family may still be growing.",
    },
    {
      key: "visa",
      label: "Sponsorship vulnerability",
      points: visaVulnerability,
      max: 20,
      note: sponsored && married
        ? "Family's UAE residency is sponsored by this person — loss of income jeopardises their status."
        : sponsored
        ? "On a sponsored visa — some dependency, but no family on record yet."
        : freelancer
        ? "Self-employed — no employer-provided life cover to fall back on."
        : wealthVisa
        ? "Golden Visa / Investor profile — residency is independent of a single employer."
        : "No notable sponsorship exposure.",
    },
    {
      key: "debt",
      label: "Debt obligation (car financing)",
      points: debtObligation,
      max: 25,
      note: p.isBankFinanced
        ? `Bank-financed vehicle (AED ${p.carValue.toLocaleString()}) — an outstanding loan that would fall to survivors.`
        : "No outstanding vehicle finance on record.",
    },
    {
      key: "income",
      label: "Income to replace (salary band)",
      points: incomeReplacement,
      max: 20,
      note: SALARY_RANK[p.salaryBand] === 2
        ? "Top salary band — largest income gap to cover for dependents."
        : SALARY_RANK[p.salaryBand] === 1
        ? "Mid salary band — moderate income to replace."
        : "Limited standalone income to replace.",
    },
  ];
}

function savingsComponents(p: Policyholder): ScoreComponent[] {
  const highSalary = SALARY_RANK[p.salaryBand] === 2;
  const midSalary = SALARY_RANK[p.salaryBand] === 1;
  const freelancer = p.visaCategory === "Self Employed / Freelancer";
  const golden = p.visaCategory === "Golden Visa";
  const investor = p.visaCategory === "Investor / Partner";

  let capacity = highSalary ? 25 : midSalary ? 12 : 0;
  if (p.carValue > HIGH_VALUE_CAR && !p.isBankFinanced) capacity += 10;

  let horizon: number, horizonNote: string;
  if (p.age <= 35) {
    horizon = 25;
    horizonNote = "20s-mid 30s — long runway for compounding to work in their favour.";
  } else if (p.age <= 45) {
    horizon = 15;
    horizonNote = "Late 30s-mid 40s — solid runway, structured saving still highly effective.";
  } else {
    horizon = 5;
    horizonNote = "Mid-40s or older — shorter accumulation runway; urgency matters more than horizon.";
  }

  let urgency = 0;
  let urgencyNote = "Standard runway to retirement — no acute trigger identified.";
  if (freelancer && p.age > 42) {
    urgency = 25;
    urgencyNote = "Self-employed AND past 42 — no End-of-Service benefit and a shrinking runway. Acute need.";
  } else if (freelancer) {
    urgency = 15;
    urgencyNote = "Self-employed — no employer gratuity / pension safety net to rely on.";
  } else if (p.age > 42) {
    urgency = 10;
    urgencyNote = "Past 42 — retirement runway shortening, worth raising proactively.";
  }

  let commitment: number, commitmentNote: string;
  if (golden) {
    commitment = 15;
    commitmentNote = "Golden Visa — explicit long-term UAE residency; long-horizon plans make sense.";
  } else if (investor) {
    commitment = 10;
    commitmentNote = "Investor/Partner — business roots in the UAE suggest a long-term stay.";
  } else if (freelancer) {
    commitment = 8;
    commitmentNote = "Self-employed and established locally — moderate long-term likelihood.";
  } else {
    commitment = 5;
    commitmentNote = "Sponsored/employment-tied visa — residency is linked to a single employer.";
  }

  return [
    {
      key: "capacity",
      label: "Capacity to save (income + assets)",
      points: capacity,
      max: 35,
      note: highSalary
        ? "Top salary band" +
          (p.carValue > HIGH_VALUE_CAR && !p.isBankFinanced
            ? ", plus an unencumbered high-value asset — genuine disposable wealth."
            : " — meaningful disposable income.")
        : midSalary
        ? "Mid salary band — some room to save with the right structure."
        : "Limited disposable income on record today.",
    },
    { key: "horizon", label: "Investment horizon (age)", points: horizon, max: 25, note: horizonNote },
    { key: "urgency", label: "Retirement urgency (no safety net + age)", points: urgency, max: 25, note: urgencyNote },
    { key: "commitment", label: "Long-term UAE commitment (visa)", points: commitment, max: 15, note: commitmentNote },
  ];
}

function findComponent(components: ScoreComponent[], key: string): number {
  return components.find((c) => c.key === key)?.points ?? 0;
}

function deriveBuckets(
  p: Policyholder,
  life: ScoreComponent[],
  savings: ScoreComponent[],
  lifeScore: number,
  savingsScore: number
): Bucket[] {
  const buckets: Bucket[] = [];

  if (lifeScore > BUCKET_THRESHOLD) {
    if (p.maritalStatus === "Married") {
      buckets.push({
        category: "Life",
        name: "Family Protection",
        reason: "Has dependents whose financial stability relies on this person's income.",
      });
    }
    if (findComponent(life, "debt") > 0) {
      buckets.push({
        category: "Life",
        name: "Debt Protection",
        reason: "Carrying vehicle finance that would otherwise become a liability for survivors.",
      });
    }
  }

  if (savingsScore > BUCKET_THRESHOLD) {
    if (findComponent(savings, "urgency") >= 15) {
      buckets.push({
        category: "Savings",
        name: "Retirement",
        reason: "Limited employer safety net and/or a shortening runway to retirement.",
      });
    }
    if (findComponent(savings, "horizon") >= 25 && findComponent(savings, "capacity") >= 12) {
      buckets.push({
        category: "Savings",
        name: "Wealth Accumulation",
        reason: "Young, earning, and has a long runway for a structured investment plan to compound.",
      });
    }
    if (p.maritalStatus === "Married") {
      buckets.push({
        category: "Savings",
        name: "Education",
        reason: "Likely to have children whose future education costs benefit from early, structured saving.",
      });
    }
  }

  return buckets;
}

export function scorePolicyholder(person: Policyholder): ScoredPolicyholder {
  const life = lifeComponents(person);
  const savings = savingsComponents(person);
  const lifeScore = life.reduce((sum, c) => sum + c.points, 0);
  const savingsScore = savings.reduce((sum, c) => sum + c.points, 0);
  return {
    person,
    life,
    savings,
    lifeScore,
    savingsScore,
    buckets: deriveBuckets(person, life, savings, lifeScore, savingsScore),
  };
}

export function tierOf(value: number): PropensityTier {
  if (value >= 75) return "Very High";
  if (value >= 55) return "High";
  if (value >= 35) return "Moderate";
  return "Low";
}
