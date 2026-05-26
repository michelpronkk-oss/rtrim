import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { C, FONT_MONO, FONT_SANS, easeOut, slideY, scaleFrom } from "../styles";
import { TerminalCard }     from "../components/TerminalCard";
import { VerdictBadge }     from "./components/VerdictBadge";
import { FileChangeList }   from "./components/FileChangeList";
import { ScopeCard }        from "./components/ScopeCard";
import { RestoreCard }      from "./components/RestoreCard";
import { PlanCard }         from "./components/PlanCard";
import { LocalFirstBadge }  from "./components/LocalFirstBadge";
import { ComparisonCard }   from "./components/ComparisonCard";
import { Logo }             from "./components/Logo";
import type { CarouselContent, CarouselSlide, PostVisual } from "./content";

// ── Config ────────────────────────────────────────────────────────────────────

const FRAMES_PER_SLIDE = 90;   // 3s per slide at 30fps
const FADE_FRAMES      = 10;

// ── Visual renderer ───────────────────────────────────────────────────────────

function SlideVisual({ visual, scale }: { visual: PostVisual; scale: number }) {
  switch (visual.type) {
    case "file-change-list":
      return <FileChangeList verdict={visual.verdict} files={visual.files} scale={scale} />;
    case "scope-card":
      return <ScopeCard task={visual.task} paths={visual.paths} scale={scale} />;
    case "restore-card":
      return <RestoreCard snapshots={visual.snapshots} scale={scale} />;
    case "verdict-hero": {
      const sz = (n: number) => Math.round(n * scale);
      const cfg: Record<string, string> = { BLOCKED: "#FF7B5C", WARN: "#F0BF72", PASS: "#3DDAB4" };
      const glow = cfg[visual.verdict] ?? "#7C6DFA";
      return (
        <div style={{
          background: "#060610",
          border: `1px solid ${C.borderMid}`,
          borderRadius: sz(12),
          padding: `${sz(26)}px ${sz(22)}px`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: sz(14),
          boxShadow: `0 0 40px ${glow}25, 0 16px 40px rgba(0,0,0,0.5)`,
          textAlign: "center",
        }}>
          <VerdictBadge verdict={visual.verdict} size={sz(18)} />
          <div style={{ fontFamily: FONT_MONO, fontSize: sz(12), color: C.textSub }}>
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

// ── Slide renderer ────────────────────────────────────────────────────────────

function Slide({ slide, localFrame, width }: { slide: CarouselSlide; localFrame: number; width: number }) {
  const s     = (n: number) => Math.round((n * width) / 1080);
  const scale = width / 1080;
  const pH    = s(60);

  const eyebrowOp = easeOut(localFrame, 0, 18);
  const hookOp    = easeOut(localFrame, 6, 22);
  const hookY     = slideY(localFrame, 6, 20, 22);
  const bodyOp    = easeOut(localFrame, 14, 20);
  const bodyY     = slideY(localFrame, 14, 12, 20);
  const visualOp  = easeOut(localFrame, 10, 26);
  const visualSc  = scaleFrom(localFrame, 10, 0.97, 26);

  const isCTA  = slide.type === "cta";
  const isHook = slide.type === "hook";

  return (
    <AbsoluteFill style={{
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      padding: `${s(104)}px ${pH}px ${s(80)}px`,
      gap: s(28),
    }}>
      {/* Eyebrow */}
      {slide.eyebrow && (
        <div style={{
          opacity: eyebrowOp,
          fontFamily: FONT_MONO,
          fontSize: s(11),
          color: C.accent,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
        }}>
          {slide.eyebrow}
        </div>
      )}

      {/* Headline */}
      <div style={{ opacity: hookOp, transform: `translateY(${hookY}px)` }}>
        <div style={{
          fontFamily: FONT_SANS,
          fontSize: s(isCTA || isHook ? 52 : 44),
          fontWeight: 700,
          letterSpacing: "-0.03em",
          lineHeight: 1.08,
          color: isCTA ? C.mint : C.text,
        }}>
          {slide.headline}
        </div>
      </div>

      {/* Body */}
      {slide.body && (
        <p style={{
          opacity: bodyOp,
          transform: `translateY(${bodyY}px)`,
          fontFamily: isCTA ? FONT_MONO : FONT_SANS,
          fontSize: s(isCTA ? 16 : 18),
          color: isCTA ? C.accent : C.textSub,
          lineHeight: 1.65,
          margin: 0,
          whiteSpace: isCTA ? "pre-line" : "normal",
        }}>
          {slide.body}
        </p>
      )}

      {/* Visual */}
      {slide.visual && (
        <div style={{
          opacity: visualOp,
          transform: `scale(${visualSc})`,
          transformOrigin: "center top",
        }}>
          <SlideVisual visual={slide.visual} scale={scale * 0.95} />
        </div>
      )}
    </AbsoluteFill>
  );
}

// ── Slide progress dots ───────────────────────────────────────────────────────

function SlideDots({ current, total, s }: { current: number; total: number; s: (n: number) => number }) {
  return (
    <div style={{
      position: "absolute",
      bottom: s(32),
      left: "50%",
      transform: "translateX(-50%)",
      display: "flex",
      gap: s(7),
      alignItems: "center",
    }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: i === current ? s(20) : s(6),
          height: s(6),
          borderRadius: s(3),
          background: i === current ? C.accent : C.textDim,
          transition: "all 0.2s ease",
        }} />
      ))}
    </div>
  );
}

// ── Main carousel composition ─────────────────────────────────────────────────

export function IGCarousel(props: CarouselContent) {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();

  const s     = (n: number) => Math.round((n * width) / 1080);
  const total = props.slides.length;

  // Which slide is active
  const slideIndex   = Math.min(Math.floor(frame / FRAMES_PER_SLIDE), total - 1);
  const localFrame   = frame - slideIndex * FRAMES_PER_SLIDE;

  const headerOp = easeOut(frame, 0, 18);

  return (
    <AbsoluteFill style={{ background: C.bg, fontFamily: FONT_SANS, WebkitFontSmoothing: "antialiased" }}>

      {/* Ambient glow */}
      <div style={{
        position: "absolute",
        bottom: -s(80), left: "50%",
        width: s(700), height: s(400),
        transform: "translateX(-50%)",
        background: `radial-gradient(ellipse, ${C.accent}0C 0%, transparent 65%)`,
        pointerEvents: "none",
      }} />

      {/* Top accent line */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, transparent 5%, ${C.accent}70 40%, ${C.mint}50 60%, transparent 95%)`,
        opacity: headerOp,
      }} />

      {/* Header */}
      <div style={{
        position: "absolute",
        top: s(36), left: s(60), right: s(60),
        opacity: headerOp,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        zIndex: 10,
      }}>
        <Logo size={s(22)} wordmarkSize={s(12)} />
        <span style={{
          fontFamily: FONT_MONO, fontSize: s(10),
          color: C.textDim, letterSpacing: "0.08em",
        }}>
          runtrim.com
        </span>
      </div>

      {/* Slide layers with crossfade */}
      {props.slides.map((slide, i) => {
        const slideStart = i * FRAMES_PER_SLIDE;
        const slideEnd   = slideStart + FRAMES_PER_SLIDE;
        const isLast     = i === total - 1;

        const opacity = isLast
          ? interpolate(frame, [slideStart, slideStart + FADE_FRAMES], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
          : interpolate(frame, [slideStart, slideStart + FADE_FRAMES, slideEnd - FADE_FRAMES, slideEnd], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

        if (opacity <= 0) return null;

        const local = Math.max(0, frame - slideStart);

        return (
          <AbsoluteFill key={i} style={{ opacity }}>
            <Slide slide={slide} localFrame={local} width={width} />
          </AbsoluteFill>
        );
      })}

      {/* Slide dots */}
      <SlideDots current={slideIndex} total={total} s={s} />

    </AbsoluteFill>
  );
}
