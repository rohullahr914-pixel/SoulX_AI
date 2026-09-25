import type { Metadata } from "next";
export const metadata: Metadata = { title: "Your Profile", robots: { index: false, follow: true } };
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
