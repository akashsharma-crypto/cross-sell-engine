"use client";

import { useMemo, useState } from "react";
import type { Policyholder } from "@/types/policyholder";
import { scorePolicyholder, tierOf, type LeadType, type ScoreComponent, type ScoredPolicyholder } from "@/lib/scoring/propensity-engine";
import styles from "./PropensityDashboard.module.css";

interface Props {
  policyholders: Policyholder[];
}

type SortKey = "life" | "savings";

const BUCKET_NAMES = ["Family Protection", "Debt Protection", "Retirement", "Wealth Accumulation", "Education"];

const TIER_VAR: Record<string, string> = {
  "Very High": "var(--very-high)",
  High: "var(--high)",
  Moderate: "var(--moderate)",
  Low: "var(--low)",
};
const TIER_CLASS: Record<string, string> = {
  "Very High": styles.tierVeryHigh,
  High: styles.tierHigh,
  Moderate: styles.tierModerate,
  Low: styles.tierLow,
};

export function PropensityDashboard({ policyholders }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("life");
  const [bucketFilter, setBucketFilter] = useState<string>("all");
  const [leadTypeFilter, setLeadTypeFilter] = useState<LeadType | "all">("all");
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);

  const scored: ScoredPolicyholder[] = useMemo(() => policyholders.map(scorePolicyholder), [policyholders]);

  const stats = useMemo(() => ({
    total:  scored.length,
    motor:  scored.filter((r) => r.leadType === "Motor").length,
    health: scored.filter((r) => r.leadType === "Health").length,
    home:   scored.filter((r) => r.leadType === "Home").length,
    both:   scored.filter((r) => r.leadType === "Both").length,
  }), [scored]);

  const rows = useMemo(() => {
    let list = scored;
    if (leadTypeFilter !== "all") list = list.filter((r) => r.leadType === leadTypeFilter);
    if (bucketFilter !== "all")   list = list.filter((r) => r.buckets.some((b) => b.name === bucketFilter));
    return [...list].sort((a, b) => sortKey === "life" ? b.lifeScore - a.lifeScore : b.savingsScore - a.savingsScore);
  }, [scored, leadTypeFilter, bucketFilter, sortKey]);

  function toggleLeadType(type: LeadType) {
    setLeadTypeFilter((prev) => prev === type ? "all" : type);
    setExpandedEmail(null);
  }

  return (
    <div>
      <div className={styles.stats}>
        <Stat num={stats.total}  label="Total leads"    active={leadTypeFilter === "all"}    onClick={() => setLeadTypeFilter("all")} />
        <Stat num={stats.motor}  label="Motor leads"    active={leadTypeFilter === "Motor"}  onClick={() => toggleLeadType("Motor")}  accent="motor" />
        <Stat num={stats.health} label="Health leads"   active={leadTypeFilter === "Health"} onClick={() => toggleLeadType("Health")} accent="health" />
        <Stat num={stats.home}   label="Home leads"     active={leadTypeFilter === "Home"}   onClick={() => toggleLeadType("Home")}   accent="home" />
      </div>

      <div className={styles.controls}>
        <div className={styles.controlsGroup}>
          <label>Filter by bucket</label>
          <button className={`${styles.chip} ${bucketFilter === "all" ? styles.chipActive : ""}`} onClick={() => setBucketFilter("all")}>
            All
          </button>
          {BUCKET_NAMES.map((name) => (
            <button
              key={name}
              className={`${styles.chip} ${bucketFilter === name ? styles.chipActive : ""}`}
              onClick={() => setBucketFilter(name)}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Policyholder</th>
              <th>
                <button className={sortKey === "life" ? styles.sortActive : ""} onClick={() => setSortKey("life")}>
                  Life Propensity
                </button>
              </th>
              <th>
                <button className={sortKey === "savings" ? styles.sortActive : ""} onClick={() => setSortKey("savings")}>
                  Savings Propensity
                </button>
              </th>
              <th>Recommended Campaign(s)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isExpanded = expandedEmail === row.person.email;
              return (
                <RowGroup
                  key={row.person.email}
                  row={row}
                  isExpanded={isExpanded}
                  onToggle={() => setExpandedEmail(isExpanded ? null : row.person.email)}
                />
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className={styles.emptyState}>
                  No policyholders match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}

function Stat({ num, label, accent, active, onClick }: {
  num: number; label: string; active?: boolean; onClick?: () => void;
  accent?: "motor" | "health" | "home" | "life" | "savings";
}) {
  const accentClass =
    accent === "motor"   ? styles.statMotor :
    accent === "health"  ? styles.statHealth :
    accent === "home"    ? styles.statHome :
    accent === "life"    ? styles.statLife :
    accent === "savings" ? styles.statSavings : "";
  return (
    <div
      className={`${styles.stat} ${accentClass} ${active ? styles.statActive : ""} ${onClick ? styles.statClickable : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className={styles.statNum}>{num}</div>
      <div className={styles.statLabel}>{label}</div>
      {active && onClick && <div className={styles.statActiveHint}>click to clear</div>}
    </div>
  );
}

function PropensityCell({ score }: { score: number }) {
  const tier = tierOf(score);
  return (
    <div className={styles.propCell}>
      <span className={styles.scoreNum}>{score}</span>
      <div className={styles.barTrack}>
        <div className={styles.barFill} style={{ width: `${score}%`, background: TIER_VAR[tier] }} />
      </div>
    </div>
  );
}

interface RowGroupProps {
  row: ScoredPolicyholder;
  isExpanded: boolean;
  onToggle: () => void;
}

function RowGroup({ row, isExpanded, onToggle }: RowGroupProps) {
  const p = row.person;
  return (
    <>
      <tr className={isExpanded ? styles.rowExpanded : ""} onClick={onToggle}>
        <td data-label="Policyholder" className={styles.nameCell}>
          <div className={styles.nameRow}>
            <span className={styles.name}>{p.name}</span>
            <LeadTypeBadge type={row.leadType} />
          </div>
          <div className={styles.contact}>
            +971 {p.mobile} &middot; {p.email}
          </div>
        </td>
        <td data-label="Life Propensity">
          <PropensityCell score={row.lifeScore} />
        </td>
        <td data-label="Savings Propensity">
          <PropensityCell score={row.savingsScore} />
        </td>
        <td data-label="Recommended Campaign(s)">
          {row.buckets.length > 0 ? (
            <div className={styles.bucketTags}>
              {row.buckets.map((b) => (
                <span key={b.name} className={`${styles.tag} ${b.category === "Life" ? styles.tagLife : styles.tagSavings}`}>
                  {b.name}
                </span>
              ))}
            </div>
          ) : (
            <span className={styles.muted}>None</span>
          )}
        </td>
        <td className={styles.chevronCell}>
          <span className={styles.chevron}>{isExpanded ? "▲ collapse" : "▼ details"}</span>
        </td>
      </tr>
      {isExpanded && (
        <tr className={styles.detailRow}>
          <td colSpan={5}>
            <DetailPanel row={row} />
          </td>
        </tr>
      )}
    </>
  );
}

function ReasonList({ components, kind }: { components: ScoreComponent[]; kind: "life" | "savings" }) {
  const contributing = [...components].filter((c) => c.points > 0).sort((a, b) => b.points - a.points);
  if (contributing.length === 0) {
    return <p className={styles.muted}>No contributing factors identified.</p>;
  }
  return (
    <ul className={styles.reasonList}>
      {contributing.map((c) => (
        <li key={c.key}>
          <span className={styles.reasonDot} style={{ background: kind === "life" ? "var(--brand-blue)" : "var(--green)" }} />
          <span className={styles.reasonText}>
            <strong>{c.label}:</strong> {c.note}
          </span>
          <span className={styles.reasonPts}>+{c.points}</span>
        </li>
      ))}
    </ul>
  );
}

function DetailPanel({ row }: { row: ScoredPolicyholder }) {
  const p = row.person;
  const lifeTier = tierOf(row.lifeScore);
  const savingsTier = tierOf(row.savingsScore);

  return (
    <div className={styles.detail}>
      <div className={styles.detailGrid}>
        <div>
          <h4>Profile</h4>
          <ul className={styles.profileList}>
            <ProfileRow k="Lead type" v={row.leadType} />
            <ProfileRow k="Mobile" v={`+971 ${p.mobile}`} />
            <ProfileRow k="Email" v={p.email} />
            {p.age !== null && <ProfileRow k="Age" v={String(p.age)} />}
            {p.maritalStatus !== null && <ProfileRow k="Marital status" v={p.maritalStatus} />}
            {p.carValue !== null && <ProfileRow k="Car value" v={`AED ${p.carValue.toLocaleString()}`} />}
            {p.isBankFinanced !== null && <ProfileRow k="Bank financed" v={p.isBankFinanced ? "Yes" : "No"} />}
            {p.salaryBand !== null && <ProfileRow k="Salary band" v={p.salaryBand} />}
            {p.visaCategory !== null && <ProfileRow k="Visa category" v={p.visaCategory} />}
            {p.ownershipType !== null && <ProfileRow k="Ownership" v={p.ownershipType} />}
            {p.propertyType !== null && <ProfileRow k="Property type" v={p.propertyType} />}
            {p.locationArea !== null && <ProfileRow k="Location" v={p.locationArea} />}
            {p.coverageType !== null && <ProfileRow k="Coverage type" v={p.coverageType} />}
            {p.contentsValue !== null && <ProfileRow k="Contents value" v={p.contentsValue} />}
            {p.personalBelongingsValue !== null && <ProfileRow k="Belongings value" v={p.personalBelongingsValue} />}
            {p.claimsHistory !== null && <ProfileRow k="Claims history" v={p.claimsHistory ? "Yes" : "No"} />}
          </ul>
        </div>
        <div>
          <h4>Life score: {row.lifeScore}/100 ({lifeTier})</h4>
          <ReasonList components={row.life} kind="life" />
        </div>
        <div>
          <h4>Savings score: {row.savingsScore}/100 ({savingsTier})</h4>
          <ReasonList components={row.savings} kind="savings" />
        </div>
      </div>

      <h4 style={{ marginTop: "1.25rem" }}>Recommended campaigns</h4>
      {row.buckets.length === 0 ? (
        <p className={styles.muted}>Score below threshold — no campaign recommended yet.</p>
      ) : (
        <div className={styles.bucketTags} style={{ marginTop: "0.5rem" }}>
          {row.buckets.map((bucket) => (
            <span key={bucket.name} className={`${styles.tag} ${bucket.category === "Life" ? styles.tagLife : styles.tagSavings}`}>
              {bucket.category} · {bucket.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileRow({ k, v }: { k: string; v: string }) {
  return (
    <li>
      <span className={styles.k}>{k}</span>
      <span className={styles.v}>{v}</span>
    </li>
  );
}

function LeadTypeBadge({ type }: { type: LeadType }) {
  return (
    <span className={`${styles.leadTypeBadge} ${type === "Motor" ? styles.leadMotor : type === "Health" ? styles.leadHealth : type === "Home" ? styles.leadHome : styles.leadBoth}`}>
      {type}
    </span>
  );
}
