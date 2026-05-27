/**
 * RunTrim logo components.
 *
 * Mark geometry (100u grid):
 *   body path:  M 10 10 L 80 10 L 80 54 L 26 54 L 26 90 L 10 90 Z
 *               M 26 26 L 64 26 L 64 38 L 26 38 Z   (counter slot, evenodd)
 *   leg path:   M 26 54 L 52 54 L 84 90 L 58 90 Z   (violet diagonal)
 *
 * Wordmark: Inter Tight 500, "Run" full + "Trim" 60% opacity, tracking -0.035em
 */

const BODY = "M 10 10 L 80 10 L 80 54 L 26 54 L 26 90 L 10 90 Z M 26 26 L 64 26 L 64 38 L 26 38 Z";
const LEG  = "M 26 54 L 52 54 L 84 90 L 58 90 Z";

interface MarkProps {
  /** Height in px. Width is auto (tight mode: ~74/80 of height). */
  size?: number;
  ink?: string;
  accent?: string;
  /** Include a rounded-rect background — useful for app tile contexts. */
  bg?: string;
  bgRadius?: number;
  /** Tight viewBox (letter bounds only, no surrounding whitespace). */
  tight?: boolean;
  className?: string;
}

/** The R mark only — use for icons, favicons, and tight lockups. */
export function RunTrimMark({
  size = 24,
  ink = "#f4f5f7",
  accent = "#a78bfa",
  bg,
  bgRadius = 22,
  tight = false,
  className,
}: MarkProps) {
  if (tight) {
    return (
      <svg
        width={Math.round(size * 74 / 80)}
        height={size}
        viewBox="10 10 74 80"
        fill="none"
        aria-hidden="true"
        className={className}
      >
        <path d={LEG}  fill={accent} />
        <path d={BODY} fill={ink} fillRule="evenodd" />
      </svg>
    );
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      {bg && <rect x="0" y="0" width="100" height="100" rx={bgRadius} fill={bg} />}
      <path d={LEG}  fill={accent} />
      <path d={BODY} fill={ink} fillRule="evenodd" />
    </svg>
  );
}

interface LogoProps {
  /** Mark height. Wordmark font size is derived automatically. */
  size?: number;
  ink?: string;
  accent?: string;
  /** Opacity of "Trim" in the wordmark. Default 0.6. */
  dim?: number;
  className?: string;
}

/**
 * Horizontal lockup — R mark (tight) + RunTrim wordmark.
 * Aligned on the letter baseline.
 */
export function RunTrimLogo({
  size = 22,
  ink = "#f4f5f7",
  accent = "#a78bfa",
  dim = 0.6,
  className,
}: LogoProps) {
  const wordSize = Math.round(size * 1.05);
  const gap = Math.round(size * 0.45);

  return (
    <span
      style={{ display: "inline-flex", alignItems: "baseline", gap, lineHeight: 1 }}
      className={className}
    >
      <RunTrimMark size={size} ink={ink} accent={accent} tight />
      <span
        style={{
          fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif",
          fontWeight: 500,
          fontSize: wordSize,
          letterSpacing: "-0.035em",
          color: ink,
          lineHeight: 1,
          display: "inline-flex",
          alignItems: "baseline",
          fontFeatureSettings: '"ss01", "cv11"',
        }}
      >
        <span>Run</span>
        <span style={{ opacity: dim }}>Trim</span>
      </span>
    </span>
  );
}

/**
 * Wordmark only — Inter Tight 500, "Run" full + "Trim" at dim opacity.
 * Use in footers and long-form documents where the mark would be redundant.
 */
export function RunTrimWordmark({
  size = 22,
  ink = "#f4f5f7",
  dim = 0.6,
  className,
}: Omit<LogoProps, "accent">) {
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "baseline",
        fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif",
        fontWeight: 500,
        fontSize: size,
        letterSpacing: "-0.035em",
        color: ink,
        lineHeight: 1,
        fontFeatureSettings: '"ss01", "cv11"',
      }}
      className={className}
    >
      <span>Run</span>
      <span style={{ opacity: dim }}>Trim</span>
    </span>
  );
}

/**
 * Stacked / vertical lockup — mark centered above wordmark.
 * Use for app tiles (128 px+) and splash screens.
 */
export function RunTrimVLockup({
  size = 56,
  ink = "#f4f5f7",
  accent = "#a78bfa",
  dim = 0.6,
  className,
}: LogoProps) {
  const wordSize = Math.round(size * 0.42);
  const gap = Math.round(size * 0.32);

  return (
    <span
      style={{
        display: "inline-flex", flexDirection: "column",
        alignItems: "center", gap,
      }}
      className={className}
    >
      <RunTrimMark size={size} ink={ink} accent={accent} />
      <RunTrimWordmark size={wordSize} ink={ink} dim={dim} />
    </span>
  );
}

/**
 * App tile — mark with rounded-rect background tile.
 * Sizes: 16 / 24 / 32 / 48 / 64 (favicon-safe at 16).
 */
export function RunTrimTile({
  size = 64,
  ink = "#f4f5f7",
  accent = "#a78bfa",
  bg = "#0e1116",
  className,
}: LogoProps & { bg?: string }) {
  const rx = Math.round(size * 0.22);
  return (
    <RunTrimMark
      size={size}
      ink={ink}
      accent={accent}
      bg={bg}
      bgRadius={rx}
      className={className}
    />
  );
}
