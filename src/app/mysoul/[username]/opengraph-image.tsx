import { ImageResponse } from "next/og";
import { getMySoulMetadata } from "@/lib/server/mysoul";

export const alt = "Talk to a MySoul AI on SoulX";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profile = await getMySoulMetadata(username, null).catch(() => null);
  const name = profile?.displayName ?? "MySoul";
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "72px", color: "#f8fafc", background: "radial-gradient(circle at 82% 16%, rgba(34,211,238,.2), transparent 28%), linear-gradient(135deg,#030817 0%,#08172d 55%,#0b1025 100%)", fontFamily: "Arial, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}><div style={{ display: "flex", width: "58px", height: "58px", alignItems: "center", justifyContent: "center", borderRadius: "20px", border: "1px solid rgba(103,232,249,.35)", background: "rgba(34,211,238,.12)", color: "#a5f3fc", fontSize: "28px", fontWeight: 800 }}>S</div><span style={{ display: "flex", color: "#a5f3fc", fontSize: "22px", fontWeight: 700, letterSpacing: "5px" }}>SOULX</span></div>
      <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}><span style={{ display: "flex", color: "#67e8f9", fontSize: "20px", fontWeight: 700, letterSpacing: "4px", textTransform: "uppercase" }}>MySoul AI</span><div style={{ display: "flex", maxWidth: "1000px", fontSize: "76px", fontWeight: 800, letterSpacing: "-4px", lineHeight: 1 }}>{name}&apos;s MySoul</div><span style={{ display: "flex", color: "#a9b8ce", fontSize: "28px" }}>Talk about the interests, goals, and experiences shared on SoulX.</span></div>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "#94a3b8", fontSize: "18px" }}><span style={{ display: "flex", width: "11px", height: "11px", borderRadius: "50%", background: "#34d399" }} />A personal AI identity, chosen by its owner</div>
    </div>,
    { ...size },
  );
}
