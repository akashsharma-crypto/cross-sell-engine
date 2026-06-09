"use client";

import { useMemo, useState } from "react";
import type { Policyholder } from "@/types/policyholder";
import { scorePolicyholder, tierOf, type Bucket, type ScoreComponent, type ScoredPolicyholder } from "@/lib/scoring/propensity-engine";
import styles from "./PropensityDashboard.module.css";

interface Props {
  policyholders: Policyholder[];
}

type SortKey = "life" | "savings";
type LogEntry = { name: string; category: string; bucketName: string };

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
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);

  const scored: ScoredPolicyholder[] = useMemo(() => policyholders.map(scorePolicyholder), [policyholders]);

  const stats = useMemo(
    () => ({
      total: scored.length,
      lifeHigh: scored.filter((r) => r.lifeScore >= 55).length,
      savingsHigh: scored.filter((r) => r.savingsScore >= 55).length,
      multi: scored.filter((r) => r.buckets.length >= 2).length,
    }),
    [scored]
  );

  const rows = useMemo(() => {
    let list = scored;
    if (bucketFilter !== "all") {
      list = list.filter((r) => r.buckets.some((b) => b.name === bucketFilter));
    }
    return [...list].sort((a, b) => (sortKey === "life" ? b.lifeScore - a.lifeScore : b.savingsScore - a.savingsScore));
  }, [scored, bucketFilter, sortKey]);

  function simulateClick(person: Policyholder, bucket: Bucket) {
    setLog((prev) => [{ name: person.name, category: bucket.category, bucketName: bucket.name }, ...prev]);
  }

  return (
    <div>
      <div className={styles.stats}>
        <Stat num={stats.total} label="Policyholders scored" />
        <Stat num={stats.lifeHigh} label="High+ Life propensity" accent="life" />
        <Stat num={stats.savingsHigh} label="High+ Savings propensity" accent="savings" />
        <Stat num={stats.multi} label="Eligible for 2+ campaigns" />
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
                  onSimulateClick={simulateClick}
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

      <section className={styles.logSection}>
        <h2>IMCRM Activity Log</h2>
        {log.length === 0 ? (
          <p className={styles.logEmpty}>No campaign clicks recorded yet.</p>
        ) : (
          <ul className={styles.logList}>
            {log.map((entry, i) => (
              <li key={i}>
                <span className={styles.logDot} />
                <span>
                  <strong>{entry.name}</strong> clicked the &ldquo;{entry.bucketName}&rdquo; campaign link — lead created in IMCRM under{" "}
                  <strong>
                    {entry.category} &rarr; {entry.bucketName}
                  </strong>
                  .
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ num, label, accent }: { num: number; label: string; accent?: "life" | "savings" }) {
  return (
    <div className={`${styles.stat} ${accent === "life" ? styles.statLife : accent === "savings" ? styles.statSavings : ""}`}>
      <div className={styles.statNum}>{num}</div>
      <div className={styles.statLabel}>{label}</div>
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
  onSimulateClick: (person: Policyholder, bucket: Bucket) => void;
}

function RowGroup({ row, isExpanded, onToggle, onSimulateClick }: RowGroupProps) {
  const p = row.person;
  return (
    <>
      <tr className={isExpanded ? styles.rowExpanded : ""} onClick={onToggle}>
        <td data-label="Policyholder" className={styles.nameCell}>
          <div className={styles.name}>{p.name}</div>
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
            <DetailPanel row={row} onSimulateClick={onSimulateClick} />
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
          <span className={styles.reasonText}>{c.note}</span>
          <span className={styles.reasonPts}>+{c.points}</span>
        </li>
      ))}
    </ul>
  );
}

function DetailPanel({ row, onSimulateClick }: { row: ScoredPolicyholder; onSimulateClick: RowGroupProps["onSimulateClick"] }) {
  const p = row.person;
  const lifeTier = tierOf(row.lifeScore);
  const savingsTier = tierOf(row.savingsScore);

  return (
    <div className={styles.detail}>
      <div className={styles.detailGrid}>
        <div>
          <h4>Policyholder profile</h4>
          <ul className={styles.profileList}>
            <ProfileRow k="Mobile" v={`+971 ${p.mobile}`} />
            <ProfileRow k="Email" v={p.email} />
            <ProfileRow k="Age" v={String(p.age)} />
            <ProfileRow k="Marital status" v={p.maritalStatus} />
            <ProfileRow k="Car value" v={`AED ${p.carValue.toLocaleString()}`} />
            <ProfileRow k="Bank financed" v={p.isBankFinanced ? "Yes" : "No"} />
            <ProfileRow k="Salary band" v={p.salaryBand} />
            <ProfileRow k="Visa category" v={p.visaCategory} />
          </ul>
        </div>
        <div>
          <h4>
            Why this Life score &mdash; {row.lifeScore}/100 &middot; {lifeTier}
          </h4>
          <ReasonList components={row.life} kind="life" />
        </div>
        <div>
          <h4>
            Why this Savings score &mdash; {row.savingsScore}/100 &middot; {savingsTier}
          </h4>
          <ReasonList components={row.savings} kind="savings" />
        </div>
      </div>

      <h4 style={{ marginTop: "1.25rem" }}>Recommended campaigns</h4>
      {row.buckets.length === 0 ? (
        <p className={styles.muted}>Neither propensity score clears the routing threshold (50/100) — no campaign recommended at this time.</p>
      ) : (
        row.buckets.map((bucket) => (
          <div className={styles.actionCard} key={bucket.name}>
            <div className={styles.actionHead}>
              <span className={`${styles.tag} ${bucket.category === "Life" ? styles.tagLife : styles.tagSavings}`}>
                {bucket.category} &middot; {bucket.name}
              </span>
            </div>
            <p>
              {bucket.reason} Routes to the &ldquo;{bucket.name}&rdquo; email campaign; a click creates a {bucket.category} lead in IMCRM
              tagged &ldquo;{bucket.name}&rdquo;.
            </p>
            <button className={styles.btnQuiet} onClick={(e) => { e.stopPropagation(); onSimulateClick(p, bucket); }}>
              Simulate campaign click &rarr; create IMCRM lead
            </button>
          </div>
        ))
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
