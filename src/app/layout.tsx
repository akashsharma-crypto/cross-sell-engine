import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "InsuranceMarket.ae — Lead Propensity Dashboard",
  description: "Internal advisor tool for scoring Motor and Health policyholders for Life and Savings cross-sell campaigns.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
