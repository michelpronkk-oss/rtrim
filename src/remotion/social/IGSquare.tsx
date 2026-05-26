import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { C, FONT_MONO, FONT_SANS } from "../styles";
import { TerminalCard }     from "../components/TerminalCard";
import { VerdictBadge }     from "./components/VerdictBadge";
import { FileChangeList }   from "./components/FileChangeList";
import { ScopeCard }        from "./components/ScopeCard";
import { RestoreCard }      from "./components/RestoreCard";
import { PlanCard }         from "./components/PlanCard";
import { LocalFirstBadge }  from "./components/LocalFirstBadge";
import { ComparisonCard }   from "./components/ComparisonCard";
import { RunVerdictStrip }  from "./components/RunVerdictStrip";
import { RunContractCard }  from "./components/RunContractCard";
import { Logo }             from "./components/Logo";
import type { PostContent, PostVisual } from "./content";

function VisualBlock({ visual, scale }: { visual: PostVisual; scale: number }) {
  if (visual.type === "contract-card") {
    const { type, ...rest } = visual;
    return <RunContractCard {...rest} scale={scale} />;
  }
  switch (visual.type) {
    case "file-change-list":
      return <FileChangeList verdict={visual.verdict} files={visual.files} scale={scale} />;
    case "scope-card":
      return <ScopeCard task={visual.task} paths={visual.paths} scale={scale} />;
    case "restore-card":
      return <RestoreCard snapshots={visual.snapshots} scale={scale} />;
    case "terminal":
      return <TerminalCard lines={visual.lines} width="100%" mode="square" />;
    case "verdict-hero": {
      const sz = (n: number) => Math.round(n * scale);
      const glows: Record<string, string> = {
        PASS: "rgba(77,232,176,0.20)", WARN: "rgba(240,191,114,0.20)", BLOCKED: "rgba(255,107,107,0.20)",
      };
      return (
        <div style={{
          background: "#060610", border: `1px solid ${C.borderMid}`,
          borderRadius: sz(12), padding: `${sz(28)}px ${sz(24)}px`,
          display: "flex", flexDirection: "column", alignItems: "center", gap: sz(14),
          boxShadow: `0 0 50px ${glows[visual.verdict]}, 0 20px 40px rgba(0,0,0,0.5)`,
          textAlign: "center",
        }}>
          <VerdictBadge verdict={visual.verdict} size={sz(20)} />
          <div style={{ fontFamily: FONT_MONO, fontSize: sz(13), color: C.textSub }}>{visual.message}</div>
        </div>
      );
    }
    case "comparison":
      return <ComparisonCard leftText={visual.leftText} rightText={visual.rightText} scale={scale} />;
    case "plan-card":
      return <PlanCard plan={visual.plan} tagline={visual.tagline} features={visual.features} highlighted scale={scale} />;
    case "local-first":
      return <LocalFirstBadge tagline={visual.tagline} items={visual.items} scale={scale} />;
    default:
      return null;
  }
}

// ── IGSquare — static still ────────────────────────────────────────────────────

export function IGSquare(props: PostContent) {
  const { width } = useVideoConfig();

  const s     = (n: number) => Math.round((n * width) / 1080);
  const scale = width / 1080;
  const pH    = s(64);

  return (
    <AbsoluteFill style={{ background: C.bg, fontFamily: FONT_SANS, WebkitFontSmoothing: "antialiased" }}>

      {/* Background grid — matches homepage exactly */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: [
          "linear-gradient(to right,  rgba(255,255,255,0.022) 1px, transparent 1px)",
          "linear-gradient(to bottom, rgba(255,255,255,0.022) 1px, transparent 1px)",
        ].join(", "),
        backgroundSize: "64px 64px",
        maskImage: "radial-gradient(ellipse 75% 75% at 50% 42%, black 30%, transparent 75%)",
        WebkitMaskImage: "radial-gradient(ellipse 75% 75% at 50% 42%, black 30%, transparent 75%)",
      }} />

      {/* Ambient glow */}
      <div style={{
        position: "absolute",
        bottom: s(-60), left: "50%",
        width: s(700), height: s(400),
        transform: "translateX(-50%)",
        background: `radial-gradient(ellipse, ${C.accent}0D 0%, transparent 65%)`,
        pointerEvents: "none",
      }} />

      {/* Top accent line */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, transparent 5%, ${C.accent}65 40%, ${C.mint}45 60%, transparent 95%)`,
      }} />

      {/* Bottom accent line */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, transparent 20%, ${C.border} 50%, transparent 80%)`,
      }} />

      {/* Header */}
      <div style={{
        position: "absolute",
        top: s(38), left: pH, right: pH,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <Logo size={s(24)} wordmarkSize={s(13)} />
        {props.footer && (
          <span style={{ fontFamily: FONT_MONO, fontSize: s(10), color: C.textDim, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            {props.footer}
          </span>
        )}
      </div>

      {/* Main content — centered vertical stack */}
      <div style={{
        position: "absolute",
        top: s(96), bottom: s(76),
        left: pH, right: pH,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: s(28),
      }}>

        {/* Text */}
        <div style={{ display: "flex", flexDirection: "column", gap: s(16) }}>
          {props.eyebrow && (
            <div style={{
              fontFamily: FONT_MONO, fontSize: s(11),
              color: C.accent, letterSpacing: "0.14em", textTransform: "uppercase",
            }}>
              {props.eyebrow}
            </div>
          )}

          <div>
            {props.hook.map((line, i) => (
              <div key={i} style={{
                fontFamily: FONT_SANS,
                fontSize: s(props.hook.length > 2 ? 48 : 56),
                fontWeight: 800,
                letterSpacing: "-0.03em",
                lineHeight: 1.06,
                color: i === props.hook.length - 1 && props.hook.length > 1 ? C.mint : C.text,
              }}>
                {line}
              </div>
            ))}
          </div>

          {props.sub && (
            <p style={{
              fontFamily: FONT_SANS, fontSize: s(17),
              color: C.textSub, lineHeight: 1.6, margin: 0,
            }}>
              {props.sub}
            </p>
          )}
        </div>

        {/* Visual */}
        <VisualBlock visual={props.visual} scale={scale} />
      </div>

      {/* Footer */}
      <div style={{
        position: "absolute",
        bottom: s(28), left: pH, right: pH,
      }}>
        <RunVerdictStrip scale={scale} />
      </div>

    </AbsoluteFill>
  );
}
