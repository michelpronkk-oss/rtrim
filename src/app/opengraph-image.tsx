import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "RunTrim — Stop paying twice for context your project already created.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
const RUNTRIM_ICON_DATA_URI =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><defs><linearGradient id="mark" x1="18" y1="18" x2="84" y2="86" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#6E8DFF"/><stop offset="100%" stop-color="#7A4DFF"/></linearGradient></defs><rect width="100" height="100" rx="22" fill="#0A0B1F"/><rect x="25" y="20" width="58" height="13" fill="url(#mark)"/><polygon points="83,20 56,47 83,33" fill="url(#mark)"/><rect x="25" y="20" width="13" height="68" fill="url(#mark)"/><polygon points="38,46 52,46 80,88 66,88" fill="url(#mark)"/></svg>`
  );

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          background: "#07071A",
          position: "relative",
          overflow: "hidden",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
        }}
      >
        {/* ── Background layers ──────────────────────────────── */}

        {/* Dot grid */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.09) 1.5px, transparent 1.5px)",
            backgroundSize: "30px 30px",
            display: "flex",
          }}
        />

        {/* Primary glow — rises from bottom centre */}
        <div
          style={{
            position: "absolute",
            bottom: -80,
            left: "50%",
            width: 900,
            height: 500,
            marginLeft: -450,
            background:
              "radial-gradient(ellipse at 50% 100%, rgba(124,109,250,0.38) 0%, rgba(100,80,240,0.14) 45%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* Secondary cool-blue accent — top right */}
        <div
          style={{
            position: "absolute",
            top: -60,
            right: -40,
            width: 480,
            height: 360,
            background:
              "radial-gradient(ellipse at 80% 20%, rgba(91,139,255,0.12) 0%, transparent 65%)",
            display: "flex",
          }}
        />

        {/* Corner vignette — fades extreme edges */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 85% 85% at 50% 50%, transparent 48%, rgba(7,7,26,0.92) 100%)",
            display: "flex",
          }}
        />

        {/* ── Main layout: left text, right terminal ─────────── */}
        <div
          style={{
            position: "relative",
            display: "flex",
            width: "100%",
            height: "100%",
            padding: "52px 60px",
            gap: 0,
          }}
        >
          {/* Left column */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              flex: "0 0 610px",
              paddingRight: 48,
            }}
          >
            {/* Wordmark - uses canonical RunTrim favicon-equivalent icon */}
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <img
                src={RUNTRIM_ICON_DATA_URI}
                alt=""
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  flexShrink: 0,
                }}
              />
              <span style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: "#EDEEFF",
                  letterSpacing: "-0.02em",
                }}
              >
                RunTrim
              </span>
            </div>

            {/* Headline block */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Badge */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  alignSelf: "flex-start",
                  gap: 8,
                  background: "rgba(124,109,250,0.12)",
                  border: "1px solid rgba(124,109,250,0.28)",
                  borderRadius: 20,
                  padding: "6px 14px",
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#7C6DFA",
                    display: "flex",
                  }}
                />
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#9E91FF",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  CLI guard layer for AI coding runs
                </span>
              </div>

              {/* Main headline */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 0,
                }}
              >
                <span
                  style={{
                    fontSize: 56,
                    fontWeight: 800,
                    color: "#EDEEFF",
                    letterSpacing: "-0.04em",
                    lineHeight: 1.07,
                  }}
                >
                  Stop paying twice
                </span>
                <span
                  style={{
                    fontSize: 56,
                    fontWeight: 800,
                    color: "#EDEEFF",
                    letterSpacing: "-0.04em",
                    lineHeight: 1.07,
                  }}
                >
                  for context your
                </span>
                <span
                  style={{
                    fontSize: 56,
                    fontWeight: 800,
                    color: "rgba(237,238,255,0.36)",
                    letterSpacing: "-0.04em",
                    lineHeight: 1.07,
                  }}
                >
                  project already built.
                </span>
              </div>
            </div>

            {/* Bottom feature pills */}
            <div style={{ display: "flex", gap: 8 }}>
              {["Run history", "Prompt memory", "Local-first"].map((label) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    padding: "6px 14px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.09)",
                    borderRadius: 6,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      color: "#7F8CAA",
                      fontWeight: 500,
                    }}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right column — terminal card */}
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
            }}
          >
            <div
              style={{
                width: 440,
                display: "flex",
                flexDirection: "column",
                background: "#0A0920",
                border: "1px solid rgba(124,109,250,0.28)",
                borderRadius: 14,
                overflow: "hidden",
                boxShadow:
                  "0 0 0 1px rgba(255,255,255,0.04), 0 24px 56px rgba(0,0,0,0.7), 0 0 60px rgba(124,109,250,0.12)",
              }}
            >
              {/* Title bar */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "12px 16px",
                  background: "rgba(255,255,255,0.03)",
                  borderBottom: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <div style={{ display: "flex", gap: 6 }}>
                  {["#FF5F57", "#FFBD2E", "#28CA41"].map((c) => (
                    <div
                      key={c}
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: c,
                        opacity: 0.7,
                        display: "flex",
                      }}
                    />
                  ))}
                </div>
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: 11,
                    color: "rgba(255,255,255,0.22)",
                    marginLeft: 4,
                  }}
                >
                  runtrim — guard
                </span>
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5 }}>
                  <div
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: "#7C6DFA",
                      display: "flex",
                    }}
                  />
                  <span style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(124,109,250,0.65)" }}>
                    live
                  </span>
                </div>
              </div>

              {/* Terminal content */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: "18px 20px",
                  gap: 0,
                  fontFamily: "monospace",
                  fontSize: 12.5,
                  lineHeight: 1.75,
                }}
              >
                {/* Prompt */}
                <span style={{ color: "#9E91FF", fontWeight: 600 }}>
                  {'$ runtrim guard "fix checkout redirect"'}
                </span>

                <div style={{ height: 8, display: "flex" }} />

                {/* Divider */}
                <span style={{ color: "rgba(255,255,255,0.09)" }}>
                  {"─".repeat(38)}
                </span>
                <span style={{ color: "rgba(255,255,255,0.40)", fontWeight: 600, letterSpacing: "0.06em", fontSize: 11 }}>
                  AUDIT REPORT
                </span>
                <span style={{ color: "rgba(255,255,255,0.09)" }}>
                  {"─".repeat(38)}
                </span>

                <div style={{ height: 6, display: "flex" }} />

                {/* KV rows */}
                <div style={{ display: "flex", gap: 0 }}>
                  <span style={{ color: "rgba(255,255,255,0.30)", width: 72 }}>Score   </span>
                  <span style={{ color: "#7BAEFF" }}>47/100  →  92/100  (+45)</span>
                </div>
                <div style={{ display: "flex" }}>
                  <span style={{ color: "rgba(255,255,255,0.30)", width: 72 }}>Risk    </span>
                  <span style={{ color: "#4DE8B0" }}>HIGH  →  LOW</span>
                </div>
                <div style={{ display: "flex" }}>
                  <span style={{ color: "rgba(255,255,255,0.30)", width: 72 }}>Tokens  </span>
                  <span style={{ color: "#C4B8FF" }}>~27,000 trimmed (est.)</span>
                </div>

                <div style={{ height: 10, display: "flex" }} />

                {/* Divider */}
                <span style={{ color: "rgba(255,255,255,0.09)" }}>
                  {"─".repeat(38)}
                </span>
                <span style={{ color: "rgba(255,255,255,0.40)", fontWeight: 600, letterSpacing: "0.06em", fontSize: 11 }}>
                  GUARDED CONTRACT
                </span>
                <span style={{ color: "rgba(255,255,255,0.09)" }}>
                  {"─".repeat(38)}
                </span>

                <div style={{ height: 6, display: "flex" }} />

                <span style={{ color: "rgba(255,255,255,0.35)" }}>OBJECTIVE</span>
                <span style={{ color: "rgba(200,212,223,0.85)" }}>
                  Fix checkout redirect at the
                </span>
                <span style={{ color: "rgba(200,212,223,0.85)" }}>
                  smallest relevant surface.
                </span>

                <div style={{ height: 10, display: "flex" }} />

                {/* Success line */}
                <span style={{ color: "#4DE8B0", fontWeight: 600 }}>
                  Contract copied. Paste into Claude.
                </span>
              </div>

              {/* Bottom accent bar */}
              <div
                style={{
                  height: 2,
                  background: "linear-gradient(90deg, transparent, #7C6DFA, #9966FF, transparent)",
                  display: "flex",
                }}
              />
            </div>
          </div>
        </div>

        {/* ── Bottom accent line ──────────────────────────────── */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 2,
            background:
              "linear-gradient(90deg, transparent 5%, rgba(124,109,250,0.6) 30%, rgba(153,102,255,0.6) 55%, rgba(91,139,255,0.4) 75%, transparent 95%)",
            display: "flex",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
