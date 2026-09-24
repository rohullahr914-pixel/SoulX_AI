"use client";

import dynamic from "next/dynamic";

const AccountBootstrap = dynamic(
  () => import("@/components/account-bootstrap").then((mod) => mod.AccountBootstrap),
  { ssr: false, loading: () => null },
);
const AnalyticsTracker = dynamic(
  () => import("@/components/analytics-tracker").then((mod) => mod.AnalyticsTracker),
  { ssr: false, loading: () => null },
);
const InstallPrompt = dynamic(
  () => import("@/components/install-prompt").then((mod) => mod.InstallPrompt),
  { ssr: false, loading: () => null },
);
const ServiceWorkerRegistration = dynamic(
  () => import("@/components/service-worker-registration").then((mod) => mod.ServiceWorkerRegistration),
  { ssr: false, loading: () => null },
);

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AccountBootstrap />
      <AnalyticsTracker />
      <InstallPrompt />
      <ServiceWorkerRegistration />
      {children}
    </>
  );
}
