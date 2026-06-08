import Image from "next/image";
import { PropensityDashboard } from "@/components/PropensityDashboard";
import { samplePolicyholders } from "@/data/sample-policyholders";

export default function HomePage() {
  return (
    <main className="page">
      <header className="appHeader">
        <Image src="/logo.png" alt="InsuranceMarket.ae" width={200} height={41} priority />
        <h1>Lead Propensity Dashboard</h1>
      </header>

      <PropensityDashboard policyholders={samplePolicyholders} />
    </main>
  );
}
