import type { Metadata } from "next";
export const metadata: Metadata = { title: "SoulX Administration", robots: { index: false, follow: true } };
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
