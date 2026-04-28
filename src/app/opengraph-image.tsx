import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "RunTrim — Stop paying twice for the same context";
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
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "80px 96px",
          background: "#07071A",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Glow */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: 900,
            height: 400,
            background:
              "radial-gradient(ellipse at 50% 100%, rgba(124,109,250,0.18) 0%, rgba(91,139,255,0.07) 45%, transparent 72%)",
            pointerEvents: "none",
          }}
        />

        {/* Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            border: "1px solid rgba(124,109,250,0.30)",
            borderRadius: 99,
            padding: "6px 14px",
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "#7C6DFA",
            }}
          />
          <span style={{ color: "#9E91FF", fontSize: 14, fontWeight: 600, letterSpacing: "0.05em" }}>
            CLI-first · Free to use
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: "#F5F7FA",
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            maxWidth: 820,
          }}
        >
          Stop paying twice
          <br />
          <span style={{ color: "#A897FF" }}>for the same context.</span>
        </div>

        {/* Sub */}
        <div
          style={{
            marginTop: 28,
            fontSize: 22,
            color: "#7A8EA0",
            lineHeight: 1.5,
            maxWidth: 680,
          }}
        >
          RunTrim tracks AI coding runs, prompts, and estimated savings so every next agent starts from what your project already knows.
        </div>

        {/* Wordmark */}
        <div
          style={{
            position: "absolute",
            top: 52,
            right: 96,
            fontSize: 22,
            fontWeight: 800,
            color: "#F5F7FA",
            letterSpacing: "-0.02em",
          }}
        >
          RunTrim
        </div>
      </div>
    ),
    { ...size }
  );
}
