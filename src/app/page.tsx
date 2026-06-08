"use client";

import { useState } from "react";
import Image from "next/image";
import { UploadPanel } from "@/components/UploadPanel";
import { PropensityDashboard } from "@/components/PropensityDashboard";
import type { Policyholder } from "@/types/policyholder";

export default function HomePage() {
  const [policyholders, setPolicyholders] = useState<Policyholder[] | null>(null);

  return (
    <main className="page">
      <header className="appHeader">
        <Image src="/logo.png" alt="InsuranceMarket.ae" width={200} height={41} priority />
        <h1>Lead Propensity Dashboard</h1>
      </header>

      <UploadPanel onLoaded={setPolicyholders} />

      {policyholders && policyholders.length > 0 ? (
        <PropensityDashboard policyholders={policyholders} />
      ) : (
        <p className="emptyHint">Upload a policyholder workbook to score and rank leads for Life and Savings cross-sell campaigns.</p>
      )}
    </main>
  );
}
