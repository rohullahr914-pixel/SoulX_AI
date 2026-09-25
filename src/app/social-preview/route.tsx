import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export function GET() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "#020817", color: "white" }}>
      <div style={{ display: "flex", color: "#67e8f9", fontSize: 32, letterSpacing: 8 }}>SOULX</div>
      <div style={{ display: "flex", fontSize: 76, fontWeight: 700, marginTop: 35 }}>One AI.</div>
      <div style={{ display: "flex", fontSize: 76, fontWeight: 700 }}>A Thousand Minds.</div>
      <div style={{ display: "flex", fontSize: 28, marginTop: 40, color: "#cbd5e1" }}>Explore ideas through AI conversation · soulxai.tech</div>
    </div>,
    { width: 1200, height: 630 },
  );
}
