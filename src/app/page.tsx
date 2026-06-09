"use client";

import { useState } from "react";
import Image from "next/image";
import * as XLSX from "xlsx";
import { PropensityDashboard } from "@/components/PropensityDashboard";
import { UploadModal } from "@/components/UploadModal";
import { samplePolicyholders } from "@/data/sample-policyholders";
import { scorePolicyholder } from "@/lib/scoring/propensity-engine";
import type { Policyholder } from "@/types/policyholder";

export default function HomePage() {
  const [policyholders, setPolicyholders] = useState<Policyholder[]>(samplePolicyholders);
  const [modalOpen, setModalOpen] = useState(false);

  function exportLeads() {
    const rows = policyholders.map((p) => {
      const scored = scorePolicyholder(p);
      const inBucket = (name: string) => scored.buckets.some((b) => b.name === name) ? "Yes" : "No";
      return {
        "Name": p.name,
        "Lead Type": scored.leadType,
        "Mobile": p.mobile,
        "Email": p.email,
        "Age": p.age,
        "Marital Status": p.maritalStatus,
        "Car Value": p.carValue ?? "—",
        "Is Bank Financed?": p.isBankFinanced !== null ? (p.isBankFinanced ? "Yes" : "No") : "—",
        "Salary Band": p.salaryBand ?? "—",
        "Visa Category": p.visaCategory ?? "—",
        "Life Propensity": scored.lifeScore,
        "Savings Propensity": scored.savingsScore,
        "Family Protection": inBucket("Family Protection"),
        "Debt Protection": inBucket("Debt Protection"),
        "Retirement": inBucket("Retirement"),
        "Wealth Accumulation": inBucket("Wealth Accumulation"),
        "Education": inBucket("Education"),
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 20 }, { wch: 14 }, { wch: 28 }, { wch: 6 }, { wch: 16 },
      { wch: 12 }, { wch: 18 }, { wch: 30 }, { wch: 34 },
      { wch: 16 }, { wch: 18 },
      { wch: 20 }, { wch: 18 }, { wch: 14 }, { wch: 22 }, { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, "Scored Leads");
    XLSX.writeFile(wb, "scored-leads.xlsx");
  }

  return (
    <main className="page">
      <header className="appHeader">
        <Image src="/logo.png" alt="InsuranceMarket.ae" width={200} height={41} priority />
        <h1>Lead Propensity Dashboard</h1>
        <div className="headerActions">
          <button className="exportBtn" onClick={exportLeads}>
            ↓ Export Scored Leads
          </button>
          <button className="uploadBtn" onClick={() => setModalOpen(true)}>
            ↑ Upload Leads
          </button>
        </div>
      </header>

      <PropensityDashboard policyholders={policyholders} />

      {modalOpen && (
        <UploadModal
          onClose={() => setModalOpen(false)}
          onLoaded={(data) => setPolicyholders(data)}
        />
      )}
    </main>
  );
}
