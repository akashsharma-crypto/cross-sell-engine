"use client";

import { useState } from "react";
import Image from "next/image";
import { PropensityDashboard } from "@/components/PropensityDashboard";
import { UploadModal } from "@/components/UploadModal";
import { samplePolicyholders } from "@/data/sample-policyholders";
import type { Policyholder } from "@/types/policyholder";

export default function HomePage() {
  const [policyholders, setPolicyholders] = useState<Policyholder[]>(samplePolicyholders);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <main className="page">
      <header className="appHeader">
        <Image src="/logo.png" alt="InsuranceMarket.ae" width={200} height={41} priority />
        <h1>Lead Propensity Dashboard</h1>
        <button className="uploadBtn" onClick={() => setModalOpen(true)}>
          ↑ Upload Leads
        </button>
      </header>

      <PropensityDashboard policyholders={policyholders} />

      {modalOpen && (
        <UploadModal
          onClose={() => setModalOpen(false)}
          onLoaded={(data) => { setPolicyholders(data); }}
        />
      )}
    </main>
  );
}
