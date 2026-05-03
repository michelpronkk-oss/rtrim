import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { C, FONT_MONO, FONT_SANS, VideoMode, easeOut, padH } from "./styles";
import { Scene1Intro }     from "./scenes/Scene1Intro";
import { Scene2Init }      from "./scenes/Scene2Init";
import { Scene3Contract }  from "./scenes/Scene3Contract";
import { Scene4Agent }     from "./scenes/Scene4Agent";
import { Scene5Finish }    from "./scenes/Scene5Finish";
import { Scene6Dashboard } from "./scenes/Scene6Dashboard";
import { Scene7CTA }       from "./scenes/Scene7CTA";

// ── Scene schedule @ 30 fps ────────────────────────────────────────────────
// Scene 1:  0s– 4s   frames   0–120   Intro
// Scene 2:  4s– 8s   frames 120–240   runtrim init
// Scene 3:  8s–13s   frames 240–390   runtrim go "…"  +  contract
// Scene 4: 13s–17s   frames 390–510   Bring your agent
// Scene 5: 17s–22s   frames 510–660   runtrim finish + checklist
// Scene 6: 22s–26s   frames 660–780   Dashboard / auto-sync
// Scene 7: 26s–29s   frames 780–870   CTA

interface SceneDef {
  start: number;
  end:   number;
  Component: React.ComponentType<{ frame: number; mode: VideoMode; width: number; height: number }>;
}

const SCENES: SceneDef[] = [
  { start:   0, end: 120, Component: Scene1Intro     },
  { start: 120, end: 240, Component: Scene2Init      },
  { start: 240, end: 390, Component: Scene3Contract  },
  { start: 390, end: 510, Component: Scene4Agent     },
  { start: 510, end: 660, Component: Scene5Finish    },
  { start: 660, end: 780, Component: Scene6Dashboard },
  { start: 780, end: 870, Component: Scene7CTA       },
];

const FADE = 15; // crossfade frames

// ── Persistent branding bar ────────────────────────────────────────────────

function BrandBar({ mode, frame, width }: { mode: VideoMode; frame: number; width: number }) {
  const ph  = padH(mode);
  const op  = easeOut(frame, 0, 20);
  // Fade out during final CTA so the logo isn't cluttering the big headline
  const ctaStart = 660;
  const fadeOut  = frame > ctaStart + 20 ? 0 : frame > ctaStart ? 1 - (frame - ctaStart) / 20 : 1;
  const final    = op * fadeOut;

  return (
    <div style={{
      position: "absolute",
      top: mode === "landscape" ? 36 : 32,
      left: ph,
      display: "flex",
      alignItems: "center",
      gap: 8,
      opacity: final,
      zIndex: 100,
      pointerEvents: "none",
    }}>
      {/* Actual RunTrim logo — matches src/app/icon.svg exactly */}
      <svg
        width={mode === "landscape" ? 32 : 28}
        height={mode === "landscape" ? 32 : 28}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0, display: "block" }}
      >
        <defs>
          <linearGradient id="rt-mark" x1="18" y1="18" x2="84" y2="86" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#6E8DFF" />
            <stop offset="100%" stopColor="#7A4DFF" />
          </linearGradient>
        </defs>
        {/* Background */}
        <rect width="100" height="100" rx="22" fill="#0A0B1F" />
        {/* Top horizontal bar */}
        <rect x="25" y="20" width="58" height="13" fill="url(#rt-mark)" />
        {/* Shoulder arm */}
        <polygon points="83,20 56,47 83,33" fill="url(#rt-mark)" />
        {/* Left vertical stem */}
        <rect x="25" y="20" width="13" height="68" fill="url(#rt-mark)" />
        {/* Diagonal leg */}
        <polygon points="38,46 52,46 80,88 66,88" fill="url(#rt-mark)" />
      </svg>
      <span style={{
        fontFamily: FONT_SANS,
        fontSize: mode === "landscape" ? 16 : 14,
        fontWeight: 700,
        color: C.text,
        letterSpacing: "-0.02em",
      }}>
        RunTrim
      </span>
    </div>
  );
}

// ── Scene progress indicator ───────────────────────────────────────────────

function SceneProgress({ frame, mode, width }: { frame: number; mode: VideoMode; width: number }) {
  const totalFrames = 870;
  const progress    = Math.min(1, frame / totalFrames);
  const op          = easeOut(frame, 0, 20);

  return (
    <div style={{
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: 2,
      background: C.border,
      opacity: op,
      zIndex: 100,
      pointerEvents: "none",
    }}>
      <div style={{
        height: "100%",
        width: `${progress * 100}%`,
        background: `linear-gradient(90deg, ${C.accent}, ${C.mint})`,
        transition: "width 0.016s linear",
      }} />
    </div>
  );
}

// ── Main composition ───────────────────────────────────────────────────────

interface Props {
  mode?: VideoMode;
}

export function RunTrimDemo({ mode = "landscape" }: Props) {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  return (
    <AbsoluteFill style={{
      background: C.bg,
      WebkitFontSmoothing: "antialiased",
      MozOsxFontSmoothing: "grayscale",
    }}>
      {/* Scene layers with crossfade */}
      {SCENES.map(({ start, end, Component }, idx) => {
        const isLast = idx === SCENES.length - 1;
        // Last scene: fade in only — never fade out so the final frame is full brightness
        const opacity = isLast
          ? interpolate(frame, [start, start + FADE], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
          : interpolate(frame, [start, start + FADE, end - FADE, end], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        if (opacity <= 0) return null;
        return (
          <AbsoluteFill key={start} style={{ opacity }}>
            <Component frame={Math.max(0, frame - start)} mode={mode} width={width} height={height} />
          </AbsoluteFill>
        );
      })}

      {/* Persistent brand bar — above scenes */}
      <BrandBar mode={mode} frame={frame} width={width} />

      {/* Subtle progress bar at bottom edge */}
      <SceneProgress frame={frame} mode={mode} width={width} />
    </AbsoluteFill>
  );
}
