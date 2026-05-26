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

// ── Visual renderer ────────────────────────────────────────────────────────────

function VisualArea({ visual, scale }: { visual: PostVisual; scale: number }) {
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
      return <TerminalCard lines={visual.lines} width="100%" mode="landscape" />;
    case "verdict-hero": {
      const glows: Record<string, string> = {
        PASS: "rgba(77,232,176,0.18)", WARN: "rgba(240,191,114,0.18)", BLOCKED: "rgba(255,107,107,0.18)",
      };
      const sz = (n: number) => Math.round(n * scale);
      return (
        <div style={{
          background: "#060610", border: `1px solid ${C.borderMid}`,
          borderRadius: sz(12), padding: `${sz(36)}px ${sz(28)}px`,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: sz(18), boxShadow: `0 0 60px ${glows[visual.verdict]}, 0 20px 50px rgba(0,0,0,0.5)`,
          textAlign: "center",
        }}>
          <VerdictBadge verdict={visual.verdict} size={sz(24)} />
          <div style={{ fontFamily: FONT_MONO, fontSize: sz(14), color: C.textSub }}>
            {visual.message}
          </div>
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

// ── XPost — static still ───────────────────────────────────────────────────────

export function XPost(props: PostContent) {
  const { width } = useVideoConfig();

  const s     = (n: number) => Math.round((n * width) / 1600);
  const scale = width / 1600;
  const pH    = s(80);

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
        maskImage: "radial-gradient(ellipse 85% 70% at 50% 45%, black 30%, transparent 78%)",
        WebkitMaskImage: "radial-gradient(ellipse 85% 70% at 50% 45%, black 30%, transparent 78%)",
      }} />

      {/* Ambient glow — right side behind visual */}
      <div style={{
        position: "absolute",
        top: "50%", right: s(-60),
        width: s(700), height: s(600),
        transform: "translateY(-50%)",
        background: `radial-gradient(ellipse, ${C.accent}0D 0%, transparent 60%)`,
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

      {/* Header — logo left, optional footer label right */}
      <div style={{
        position: "absolute",
        top: s(38), left: pH, right: pH,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <Logo size={s(26)} wordmarkSize={s(14)} />
        {props.footer && (
          <span style={{
            fontFamily: FONT_MONO, fontSize: s(10),
            color: C.textDim, letterSpacing: "0.1em", textTransform: "uppercase",
          }}>
            {props.footer}
          </span>
        )}
      </div>

      {/* Main content — split: text left, visual right */}
      <div style={{
        position: "absolute",
        top: s(104), bottom: s(80),
        left: pH, right: pH,
        display: "flex",
        alignItems: "center",
        gap: s(72),
      }}>

        {/* Left: eyebrow + hook + sub */}
        <div style={{
          width: s(500),
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          gap: s(20),
        }}>

          {props.eyebrow && (
            <div style={{
              fontFamily: FONT_MONO,
              fontSize: s(11),
              color: C.accent,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}>
              {props.eyebrow}
            </div>
          )}

          <div>
            {props.hook.map((line, i) => (
              <div key={i} style={{
                fontFamily: FONT_SANS,
                fontSize: s(props.hook.length > 2 ? 56 : 64),
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
              fontFamily: FONT_SANS,
              fontSize: s(18),
              color: C.textSub,
              lineHeight: 1.65,
              margin: 0,
              maxWidth: s(440),
            }}>
              {props.sub}
            </p>
          )}
        </div>

        {/* Right: visual */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <VisualArea visual={props.visual} scale={scale} />
        </div>
      </div>

      {/* Footer */}
      <div style={{
        position: "absolute",
        bottom: s(32), left: pH, right: pH,
      }}>
        <RunVerdictStrip scale={scale} />
      </div>

    </AbsoluteFill>
  );
}
