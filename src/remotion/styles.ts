import { FONT_SANS_FAMILY, FONT_MONO_FAMILY } from "./fonts";

export type VideoMode = "landscape" | "square";

// ── Color tokens ──────────────────────────────────────────────────────────────
export const C = {
  bg:         "#07071A",   // graphite near-black (matches homepage)
  bgAlt:      "#0C0C20",
  surface:    "#0F0F1A",   // card surface
  surfaceEl:  "#141422",   // elevated element

  border:     "rgba(255,255,255,0.09)",
  borderMid:  "rgba(255,255,255,0.14)",
  borderHi:   "rgba(255,255,255,0.20)",

  text:       "#EDEEFF",
  textSub:    "#9090B4",
  textDim:    "#484868",

  accent:     "#7C6DFA",   // brand violet
  mint:       "#4DE8B0",   // mint / PASS (matches homepage)
  blue:       "#6B9BE8",
  amber:      "#F0BF72",
  coral:      "#FF6B6B",   // coral / BLOCKED (matches homepage)
} as const;

// ── Fonts ─────────────────────────────────────────────────────────────────────
// Inter Tight (sans) + Geist Mono — same as homepage
export const FONT_SANS = `'${FONT_SANS_FAMILY}',-apple-system,'Segoe UI',sans-serif`;
export const FONT_MONO = `'${FONT_MONO_FAMILY}','Menlo','Monaco','Courier New',monospace`;

// ── Typography scale at 1920×1080 ─────────────────────────────────────────────
// Square (1080×1080) scales at 0.76× — smaller canvas, same optical weight
export const T = {
  display: [96, 74],   // [landscape, square]
  h1:      [64, 50],
  h2:      [42, 34],
  body:    [22, 18],
  small:   [17, 14],
  mono:    [20, 16],   // terminal commands
  monoSm:  [16, 13],   // terminal output
  label:   [13, 12],   // eyebrow labels
} as const;

/** Returns font size for the given video mode */
export function sz(key: keyof typeof T, mode: VideoMode): number {
  return T[key][mode === "landscape" ? 0 : 1];
}

/** Card / container widths */
export const W = {
  terminal:  [740, 0],  // 0 = fill minus padding
  contract:  [480, 0],
  dashboard: [760, 0],
} as const;

export function cardW(key: keyof typeof W, mode: VideoMode, canvasWidth: number): number {
  if (mode === "square") return canvasWidth - 100;
  return W[key][0];
}

/** Horizontal content padding */
export function padH(mode: VideoMode): number {
  return mode === "landscape" ? 100 : 50;
}

// ── Animation helpers ─────────────────────────────────────────────────────────

/** Ease-in-out ramp clamped to [0,1] */
export function ramp(frame: number, startFrame: number, dur = 22): number {
  if (frame <= startFrame) return 0;
  if (frame >= startFrame + dur) return 1;
  const t = (frame - startFrame) / dur;
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

/** Ease-out cubic ramp — faster initial entry, smooth settle */
export function easeOut(frame: number, startFrame: number, dur = 22): number {
  if (frame <= startFrame) return 0;
  if (frame >= startFrame + dur) return 1;
  const t = (frame - startFrame) / dur;
  return 1 - Math.pow(1 - t, 3);
}

/** Spring-like overshoot: goes to 1.0 with a very subtle bounce */
export function spring(frame: number, startFrame: number, dur = 28): number {
  if (frame <= startFrame) return 0;
  const t = Math.min(1, (frame - startFrame) / dur);
  // Gentle overshoot spring
  return 1 - Math.pow(1 - t, 2.2) * Math.cos(t * Math.PI * 1.8) * Math.pow(1 - t, 0.5);
}

/** Y offset sliding from `from` to 0 using easeOut */
export function slideY(frame: number, startFrame: number, from = 20, dur = 24): number {
  return from * (1 - easeOut(frame, startFrame, dur));
}

/** X offset sliding from `from` to 0 using easeOut */
export function slideX(frame: number, startFrame: number, from = 30, dur = 24): number {
  return from * (1 - easeOut(frame, startFrame, dur));
}

/** Scale from `from` to 1.0 */
export function scaleFrom(frame: number, startFrame: number, from = 0.94, dur = 24): number {
  const t = easeOut(frame, startFrame, dur);
  return from + (1 - from) * t;
}

/** Blinking cursor — 1 for half the period, 0 for other half */
export function cursor(frame: number, period = 28): number {
  return frame % period < period / 2 ? 1 : 0;
}
