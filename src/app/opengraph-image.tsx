import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "RunTrim | Scope the run before the agent touches your repo.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "52px 64px",
          background: "#07071A",
          color: "#EDEEFF",
          fontFamily: "Inter, system-ui, sans-serif",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at 70% 100%, rgba(124,109,250,0.22) 0%, rgba(124,109,250,0.06) 40%, transparent 72%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            opacity: 0.2,
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 12, zIndex: 2 }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              border: "1px solid rgba(124,109,250,0.4)",
              background: "rgba(124,109,250,0.16)",
            }}
          />
          <div style={{ fontWeight: 700, fontSize: 30, letterSpacing: "-0.02em" }}>RunTrim</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18, zIndex: 2, maxWidth: 900 }}>
          <div style={{ fontSize: 64, lineHeight: 1.05, fontWeight: 800, letterSpacing: "-0.03em" }}>
            Scope the run before the agent touches your repo.
          </div>
          <div style={{ fontSize: 30, lineHeight: 1.3, color: "#A7B2C6" }}>
            Local-first CLI for AI coding agents.
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
