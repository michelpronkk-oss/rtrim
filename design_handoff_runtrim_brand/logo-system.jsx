/* global React, DesignCanvas, DCSection, DCArtboard, DCPostIt */
const { useState } = React;

// =========================================================
// RUNTRIM — PRODUCTION LOGO SYSTEM
// =========================================================
//
// Mark concept: a rectilinear capital R whose right leg is a
// confident structural diagonal. The diagonal reads as a routed
// path passing THROUGH the bowl — the literal action RunTrim
// performs (route an agent run through a scoped, trimmed gate).
//
// Design constraints honored:
//   • Rectilinear / engineered, no soft curves
//   • Single signature gesture (the diagonal)
//   • Two color tokens only: monochrome stem + violet leg
//   • Survives at 16px favicon scale (tested)
//   • Reads instantly as R
//   • Lockup mark and wordmark share a baseline
// =========================================================


// ─────────────────────────────────────────────────────────
// TOKENS
// ─────────────────────────────────────────────────────────

const sansFont = '"Inter Tight", ui-sans-serif, system-ui, -apple-system, sans-serif';
const monoFont = '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';

const T = {
  // Surfaces
  graphite:     "#0a0c10",   // primary dark surface
  graphite2:    "#11141a",   // raised dark surface
  paper:        "#f6f6f4",   // primary light surface
  paper2:       "#eeeeea",   // raised light surface
  // Ink
  inkLight:     "#f4f5f7",   // primary ink on dark
  inkLightDim:  "rgba(244,245,247,0.62)",
  inkDark:      "#0a0c10",   // primary ink on light
  inkDarkDim:   "rgba(10,12,16,0.55)",
  // Lines
  lineDark:     "rgba(255,255,255,0.08)",
  lineDarker:   "rgba(255,255,255,0.14)",
  lineLight:    "rgba(0,0,0,0.08)",
  lineLighter:  "rgba(0,0,0,0.14)",
  // Brand accent
  violet:       "#a78bfa",   // electric indigo, primary accent
  violetDeep:   "#7c5cff",   // pressed / hover
  violetSoft:   "rgba(167,139,250,0.16)",
};


// ─────────────────────────────────────────────────────────
// THE MARK
// Geometry, in 100×100 viewBox:
//   stem:        x=10..26, y=10..90    (16u wide, 80u tall)
//   bowl-bar:    y=10..54               (cap height 80, bowl 44)
//   bowl-arm:    x=10..80, y=10..26     (16u arm)
//   bowl-foot:   x=10..80, y=38..54     (16u joining bar)
//   counter:     x=26..64, y=26..38     (12u tall negative space)
//                — narrow horizontal slot reads as a "gate"
//   leg accent:  diagonal violet wedge from (26,54)→(84,90)
//                joining the bowl junction to the descender
// Optical adjustments:
//   • bowl-counter is 12u tall (15% of cap), wide enough to read
//     as a slot rather than a closed bowl — subtle "gate" hint
//   • diagonal leg is the SAME stem-weight (16u) for structural
//     consistency, rendered as a quadrilateral wedge
//   • leg foot at y=90 = letter baseline (anchor for lockup)
// ─────────────────────────────────────────────────────────

const RMark = ({
  size = 64,
  ink = T.inkLight,
  accent = T.violet,
  bg = null,         // optional rounded-rect bg (for app tile)
  bgRadius = 22,
  tight = false,     // letter-bounds viewBox (for type lockups)
  mono = false,      // collapse to one ink color
}) => {
  const accentColor = mono ? ink : accent;
  // Diagonal leg quadrilateral: top-left (26,54), top-right (52,54),
  // bottom-right (84,90), bottom-left (58,90). Its left edge has the
  // same slope as its right edge — parallel structural diagonal.
  const legPath = "M 26 54 L 52 54 L 84 90 L 58 90 Z";
  // R body: outer rectangle (10,10)-(80,90) with bowl-bottom cut at y=54
  // beyond x=26, plus the inner counter slot (26,26)-(64,38) cut out.
  const bodyPath =
    "M 10 10 L 80 10 L 80 54 L 26 54 L 26 90 L 10 90 Z " +
    "M 26 26 L 64 26 L 64 38 L 26 38 Z";

  if (tight) {
    return (
      <svg
        width={size * 74 / 80}
        height={size}
        viewBox="10 10 74 80"
        fill="none"
        aria-hidden="true"
      >
        <path d={legPath} fill={accentColor} />
        <path d={bodyPath} fill={ink} fillRule="evenodd" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden="true">
      {bg && <rect x="0" y="0" width="100" height="100" rx={bgRadius} fill={bg} />}
      <path d={legPath} fill={accentColor} />
      <path d={bodyPath} fill={ink} fillRule="evenodd" />
    </svg>
  );
};


// ─────────────────────────────────────────────────────────
// THE WORDMARK
// "RunTrim" — Inter Tight 500, single weight, opacity contrast.
// Letter-spacing tuned for tight-but-not-cramped, optical kerning
// preserved. "Trim" sits at 60% to cue the verb-noun pairing
// without weight wobble.
// ─────────────────────────────────────────────────────────

const Wordmark = ({ size = 32, ink = T.inkLight, dim = 0.6 }) => (
  <span style={{
    fontFamily: sansFont,
    fontWeight: 500,
    fontSize: size,
    letterSpacing: "-0.035em",
    color: ink,
    lineHeight: 1,
    display: "inline-flex",
    alignItems: "baseline",
    fontFeatureSettings: '"ss01", "cv11"',
  }}>
    <span>Run</span>
    <span style={{ opacity: dim }}>Trim</span>
  </span>
);


// ─────────────────────────────────────────────────────────
// LOCKUPS
// ─────────────────────────────────────────────────────────

const HLockup = ({ size = 36, gap = 14, ink = T.inkLight, accent = T.violet, mono = false, dim = 0.6 }) => (
  // alignItems: baseline puts the SVG's bottom edge (= R's leg foot,
  // = letter baseline in tight mode) on the wordmark baseline.
  <div style={{ display: "inline-flex", alignItems: "baseline", gap }}>
    <RMark size={size} ink={ink} accent={accent} tight mono={mono} />
    <Wordmark size={size * 1.05} ink={ink} dim={dim} />
  </div>
);

const VLockup = ({ size = 56, gap = 18, ink = T.inkLight, accent = T.violet, mono = false }) => (
  <div style={{
    display: "inline-flex", flexDirection: "column",
    alignItems: "center", gap,
  }}>
    <RMark size={size} ink={ink} accent={accent} mono={mono} />
    <Wordmark size={size * 0.42} ink={ink} />
  </div>
);


// ─────────────────────────────────────────────────────────
// REUSABLE FRAME
// ─────────────────────────────────────────────────────────

const Frame = ({ children, dark = true, label, padding = 0, style = {} }) => (
  <div style={{
    background: dark ? T.graphite : T.paper,
    color: dark ? T.inkLight : T.inkDark,
    border: `1px solid ${dark ? T.lineDark : T.lineLight}`,
    borderRadius: 10,
    width: "100%", height: "100%",
    position: "relative",
    overflow: "hidden",
    display: "flex", alignItems: "center", justifyContent: "center",
    ...style,
  }}>
    {label && (
      <div style={{
        position: "absolute", top: 12, left: 14,
        fontFamily: monoFont, fontSize: 9.5,
        letterSpacing: "0.12em", textTransform: "uppercase",
        color: dark ? "rgba(255,255,255,0.42)" : "rgba(0,0,0,0.42)",
      }}>{label}</div>
    )}
    <div style={{ padding, display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
      {children}
    </div>
  </div>
);

const TinyLabel = ({ children, dark = true }) => (
  <div style={{
    fontFamily: monoFont, fontSize: 9.5,
    letterSpacing: "0.12em", textTransform: "uppercase",
    color: dark ? "rgba(255,255,255,0.42)" : "rgba(0,0,0,0.42)",
  }}>{children}</div>
);


// =========================================================
// SECTION 1 — THE FINAL MARK
// =========================================================

const SectionHero = () => (
  <div style={{
    width: 1200, height: 720,
    background: `radial-gradient(ellipse 80% 60% at 50% 40%, #14171f 0%, ${T.graphite} 70%)`,
    color: T.inkLight,
    fontFamily: sansFont,
    position: "relative",
    overflow: "hidden",
    border: `1px solid ${T.lineDark}`,
    borderRadius: 12,
  }}>
    {/* corner trace lines */}
    <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.5 }}>
      <defs>
        <pattern id="hero-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.025)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hero-grid)" />
    </svg>

    {/* top metadata strip */}
    <div style={{
      position: "absolute", top: 0, left: 0, right: 0,
      padding: "20px 32px",
      display: "flex", justifyContent: "space-between", alignItems: "center",
      borderBottom: `1px solid ${T.lineDark}`,
      fontFamily: monoFont, fontSize: 10.5,
      letterSpacing: "0.1em", textTransform: "uppercase",
      color: "rgba(255,255,255,0.45)",
    }}>
      <span>RunTrim · Identity</span>
      <span>v1.0 · Production</span>
    </div>

    {/* center mark */}
    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28 }}>
        <RMark size={280} accent={T.violet} />
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginTop: 8,
        }}>
          <Wordmark size={48} dim={0.55} />
          <div style={{
            fontFamily: monoFont, fontSize: 11,
            letterSpacing: "0.18em", textTransform: "uppercase",
            color: "rgba(255,255,255,0.42)",
          }}>
            scoped runs · trimmed scope · routed control
          </div>
        </div>
      </div>
    </div>

    {/* bottom metadata strip */}
    <div style={{
      position: "absolute", bottom: 0, left: 0, right: 0,
      padding: "20px 32px",
      display: "flex", justifyContent: "space-between", alignItems: "center",
      borderTop: `1px solid ${T.lineDark}`,
      fontFamily: monoFont, fontSize: 10.5,
      letterSpacing: "0.1em", textTransform: "uppercase",
      color: "rgba(255,255,255,0.45)",
    }}>
      <span>The Mark</span>
      <span style={{ display: "flex", gap: 18 }}>
        <span>R-monogram</span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span>structural diagonal</span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span>16px → 1024px</span>
      </span>
    </div>
  </div>
);


// =========================================================
// SECTION 2 — CONSTRUCTION
// =========================================================

const Construction = () => (
  <div style={{
    width: 720, height: 720, padding: 64, background: T.graphite,
    display: "grid", placeItems: "center", position: "relative",
    border: `1px solid ${T.lineDark}`, borderRadius: 12,
  }}>
    <div style={{ position: "absolute", top: 24, left: 28 }}><TinyLabel>Construction</TinyLabel></div>
    <svg viewBox="-10 -10 120 120" width="560" height="560">
      {/* baseline grid */}
      <defs>
        <pattern id="con-grid" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.4" />
        </pattern>
      </defs>
      <rect x="-10" y="-10" width="120" height="120" fill="url(#con-grid)" />

      {/* construction rectangles — dashed */}
      <rect x="0" y="0" width="100" height="100" fill="none" stroke="rgba(167,139,250,0.4)" strokeWidth="0.4" strokeDasharray="2 2" />
      <rect x="10" y="10" width="70" height="80" fill="none" stroke="rgba(167,139,250,0.6)" strokeWidth="0.5" strokeDasharray="2 1" />

      {/* the mark */}
      <path d="M 26 54 L 52 54 L 84 90 L 58 90 Z" fill={T.violet} />
      <path
        d="M 10 10 L 80 10 L 80 54 L 26 54 L 26 90 L 10 90 Z M 26 26 L 64 26 L 64 38 L 26 38 Z"
        fill={T.inkLight}
        fillRule="evenodd"
      />

      {/* dimension lines */}
      {/* horizontal stem */}
      <g stroke="rgba(167,139,250,0.7)" strokeWidth="0.3" fill="none">
        <line x1="10" y1="-2" x2="26" y2="-2" />
        <line x1="10" y1="-3" x2="10" y2="-1" />
        <line x1="26" y1="-3" x2="26" y2="-1" />
      </g>
      <text x="18" y="-4" fill="rgba(167,139,250,0.8)" fontSize="2.4" fontFamily={monoFont} textAnchor="middle">16u</text>

      {/* total width */}
      <g stroke="rgba(244,245,247,0.4)" strokeWidth="0.3" fill="none">
        <line x1="10" y1="100" x2="84" y2="100" />
        <line x1="10" y1="99" x2="10" y2="101" />
        <line x1="84" y1="99" x2="84" y2="101" />
      </g>
      <text x="47" y="103.5" fill="rgba(244,245,247,0.55)" fontSize="2.4" fontFamily={monoFont} textAnchor="middle">74u width</text>

      {/* total height */}
      <g stroke="rgba(244,245,247,0.4)" strokeWidth="0.3" fill="none">
        <line x1="92" y1="10" x2="92" y2="90" />
        <line x1="91" y1="10" x2="93" y2="10" />
        <line x1="91" y1="90" x2="93" y2="90" />
      </g>
      <text x="94" y="50" fill="rgba(244,245,247,0.55)" fontSize="2.4" fontFamily={monoFont}>80u cap</text>

      {/* counter callout */}
      <g stroke="rgba(167,139,250,0.7)" strokeWidth="0.3" fill="none">
        <line x1="64" y1="32" x2="76" y2="22" />
      </g>
      <text x="78" y="22" fill="rgba(167,139,250,0.85)" fontSize="2.2" fontFamily={monoFont}>gate slot</text>

      {/* leg callout */}
      <g stroke="rgba(167,139,250,0.7)" strokeWidth="0.3" fill="none">
        <line x1="78" y1="84" x2="92" y2="92" />
      </g>
      <text x="94" y="94" fill="rgba(167,139,250,0.85)" fontSize="2.2" fontFamily={monoFont}>routed leg</text>
    </svg>
  </div>
);


// =========================================================
// SECTION 3 — WORDMARK SPEC
// =========================================================

const WordmarkSpec = () => (
  <div style={{
    width: 880, height: 480, padding: "56px 64px",
    background: T.graphite, color: T.inkLight,
    border: `1px solid ${T.lineDark}`, borderRadius: 12,
    position: "relative", overflow: "hidden",
    fontFamily: sansFont,
  }}>
    <div style={{ position: "absolute", top: 24, left: 28 }}><TinyLabel>Wordmark</TinyLabel></div>

    <div style={{ display: "flex", alignItems: "baseline", gap: 0, marginTop: 36 }}>
      <Wordmark size={120} dim={0.55} />
    </div>

    <div style={{
      marginTop: 36, paddingTop: 28,
      borderTop: `1px solid ${T.lineDark}`,
      display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24,
      fontFamily: monoFont, fontSize: 11,
      color: "rgba(255,255,255,0.55)",
    }}>
      <div>
        <div style={{ color: T.violet, fontSize: 9.5, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 6 }}>Family</div>
        <div style={{ color: T.inkLight, lineHeight: 1.5, fontSize: 12 }}>Inter Tight</div>
        <div style={{ marginTop: 4 }}>500 Medium</div>
      </div>
      <div>
        <div style={{ color: T.violet, fontSize: 9.5, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 6 }}>Tracking</div>
        <div style={{ color: T.inkLight, lineHeight: 1.5, fontSize: 12 }}>−3.5%</div>
        <div style={{ marginTop: 4 }}>letter-spacing: −0.035em</div>
      </div>
      <div>
        <div style={{ color: T.violet, fontSize: 9.5, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 6 }}>Contrast</div>
        <div style={{ color: T.inkLight, lineHeight: 1.5, fontSize: 12 }}>Single weight</div>
        <div style={{ marginTop: 4 }}>Trim @ 60% opacity</div>
      </div>
      <div>
        <div style={{ color: T.violet, fontSize: 9.5, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 6 }}>Min size</div>
        <div style={{ color: T.inkLight, lineHeight: 1.5, fontSize: 12 }}>11 px digital</div>
        <div style={{ marginTop: 4 }}>9 pt print</div>
      </div>
    </div>

    {/* type ladder */}
    <div style={{
      position: "absolute", right: 64, top: 90,
      display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 14,
    }}>
      <Wordmark size={28} dim={0.55} />
      <Wordmark size={20} dim={0.55} />
      <Wordmark size={14} dim={0.55} />
      <Wordmark size={11} dim={0.55} />
    </div>
  </div>
);


// =========================================================
// SECTION 4 — LOCKUP SYSTEM
// =========================================================

const LockupGrid = () => {
  const cell = (label, dark, content, w = 320, h = 220) => (
    <Frame dark={dark} label={label} style={{ width: w, height: h }}>
      {content}
    </Frame>
  );

  return (
    <div style={{
      width: 1320, padding: 40, background: T.graphite2,
      border: `1px solid ${T.lineDark}`, borderRadius: 12,
      display: "grid", gap: 16,
      gridTemplateColumns: "repeat(4, 1fr)",
    }}>
      <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <TinyLabel>Lockup System · 10 variants</TinyLabel>
        <div style={{ fontFamily: monoFont, fontSize: 10, color: "rgba(255,255,255,0.42)" }}>dark · light · mono</div>
      </div>

      {cell("01 · Mark only", true,    <RMark size={108} />)}
      {cell("02 · Wordmark only", true, <Wordmark size={42} />)}
      {cell("03 · Horizontal", true,    <HLockup size={48} gap={16} />)}
      {cell("04 · Stacked", true,       <VLockup size={72} gap={16} />)}

      {cell("05 · Sidebar compact", true, (
        <HLockup size={20} gap={10} dim={0.55} />
      ))}
      {cell("06 · Favicon @64", true, (
        <RMark size={64} bg={T.graphite2} bgRadius={14} />
      ))}
      {cell("07 · App tile @128", true, (
        <RMark size={140} bg="#1a1d24" bgRadius={28} />
      ))}
      {cell("08 · NPM badge", true, (
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 0,
          fontFamily: monoFont, fontSize: 14,
          border: `1px solid ${T.lineDarker}`, borderRadius: 6, overflow: "hidden",
        }}>
          <span style={{ padding: "8px 12px", background: "#1a1d24", color: T.inkLight, display: "inline-flex", alignItems: "center", gap: 8 }}>
            <RMark size={14} tight />
            <span>runtrim</span>
          </span>
          <span style={{ padding: "8px 12px", background: T.violet, color: "#0a0c10", fontWeight: 600 }}>
            v1.0.0
          </span>
        </div>
      ))}

      {cell("09 · On light", false, (
        <HLockup size={42} gap={14} ink={T.inkDark} accent={T.violetDeep} dim={0.55} />
      ))}
      {cell("10 · Monochrome dark", true, (
        <HLockup size={42} gap={14} mono dim={0.55} />
      ))}
      {cell("11 · Monochrome light", false, (
        <HLockup size={42} gap={14} ink={T.inkDark} mono dim={0.5} />
      ))}
      {cell("12 · Inverted (single color KO)", false, (
        <div style={{
          width: 120, height: 120, background: T.inkDark,
          borderRadius: 22, display: "grid", placeItems: "center",
        }}>
          <RMark size={88} ink={T.paper} accent={T.paper} />
        </div>
      ))}
    </div>
  );
};


// =========================================================
// SECTION 5 — COLOR SYSTEM
// =========================================================

const ColorSwatch = ({ name, hex, oklch, ink = "#fff", note }) => (
  <div style={{
    background: hex,
    color: ink,
    borderRadius: 10,
    padding: 18,
    height: 160,
    display: "flex", flexDirection: "column", justifyContent: "space-between",
    fontFamily: monoFont, fontSize: 10.5,
    border: `1px solid ${ink === "#fff" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
    position: "relative", overflow: "hidden",
  }}>
    <div>
      <div style={{ fontFamily: sansFont, fontSize: 14, fontWeight: 500, letterSpacing: "-0.01em" }}>{name}</div>
      {note && <div style={{ opacity: 0.62, marginTop: 4, fontFamily: sansFont, fontSize: 11 }}>{note}</div>}
    </div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", opacity: 0.7 }}>
      <span>{hex.toUpperCase()}</span>
      <span>{oklch}</span>
    </div>
  </div>
);

const ColorSystem = () => (
  <div style={{
    width: 1200, padding: 40, background: T.graphite,
    border: `1px solid ${T.lineDark}`, borderRadius: 12,
  }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20 }}>
      <TinyLabel>Color System · 5 tokens</TinyLabel>
      <div style={{ fontFamily: monoFont, fontSize: 10, color: "rgba(255,255,255,0.42)" }}>restrained · technical · contrast-safe</div>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14 }}>
      <ColorSwatch name="Graphite"  hex="#0a0c10" oklch="oklch(0.16 0.01 260)" note="Primary surface · dark" />
      <ColorSwatch name="Paper"     hex="#f6f6f4" oklch="oklch(0.97 0.003 90)"  ink="#0a0c10" note="Primary surface · light" />
      <ColorSwatch name="Ink"       hex="#f4f5f7" oklch="oklch(0.97 0.004 260)" ink="#0a0c10" note="Primary type · monochrome" />
      <ColorSwatch name="Violet"    hex="#a78bfa" oklch="oklch(0.74 0.16 295)"  ink="#0a0c10" note="Brand accent · routed leg" />
      <ColorSwatch name="ViolDeep"  hex="#7c5cff" oklch="oklch(0.59 0.22 290)"  note="Pressed / hover · light bg" />
    </div>

    {/* contrast pairs */}
    <div style={{
      marginTop: 24, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12,
      fontFamily: monoFont, fontSize: 11,
    }}>
      <div style={{ background: T.graphite, color: T.inkLight, border: `1px solid ${T.lineDark}`, padding: "14px 16px", borderRadius: 8 }}>
        <div style={{ opacity: 0.5, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>Ink on Graphite</div>
        <div style={{ fontFamily: sansFont, fontSize: 14 }}>15.8 : 1 · AAA</div>
      </div>
      <div style={{ background: T.paper, color: T.inkDark, border: `1px solid ${T.lineLight}`, padding: "14px 16px", borderRadius: 8 }}>
        <div style={{ opacity: 0.5, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>Ink on Paper</div>
        <div style={{ fontFamily: sansFont, fontSize: 14 }}>17.2 : 1 · AAA</div>
      </div>
      <div style={{ background: T.graphite, color: T.violet, border: `1px solid ${T.lineDark}`, padding: "14px 16px", borderRadius: 8 }}>
        <div style={{ opacity: 0.5, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>Violet on Graphite</div>
        <div style={{ fontFamily: sansFont, fontSize: 14 }}>7.4 : 1 · AAA</div>
      </div>
      <div style={{ background: T.paper, color: T.violetDeep, border: `1px solid ${T.lineLight}`, padding: "14px 16px", borderRadius: 8 }}>
        <div style={{ opacity: 0.5, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>VioletDeep on Paper</div>
        <div style={{ fontFamily: sansFont, fontSize: 14 }}>5.1 : 1 · AA</div>
      </div>
    </div>
  </div>
);


// =========================================================
// SECTION 6 — USAGE PREVIEWS
// =========================================================

// 6a. Website navbar
const NavbarPreview = () => (
  <div style={{
    width: 1100, height: 280,
    background: T.graphite, color: T.inkLight,
    border: `1px solid ${T.lineDark}`, borderRadius: 12, overflow: "hidden",
    fontFamily: sansFont,
    position: "relative",
  }}>
    <div style={{ position: "absolute", top: 14, left: 18 }}><TinyLabel>Website navbar</TinyLabel></div>
    {/* nav */}
    <div style={{
      marginTop: 56, marginInline: 24, padding: "14px 24px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      background: "rgba(255,255,255,0.03)", border: `1px solid ${T.lineDark}`,
      borderRadius: 999,
      backdropFilter: "blur(12px)",
    }}>
      <HLockup size={22} gap={10} dim={0.6} />
      <div style={{ display: "flex", gap: 26, fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
        <span>Product</span><span>Docs</span><span>Pricing</span><span>Changelog</span>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13 }}>
        <span style={{ color: "rgba(255,255,255,0.6)" }}>Sign in</span>
        <span style={{
          padding: "8px 14px", background: T.inkLight, color: T.graphite,
          borderRadius: 999, fontWeight: 500,
        }}>Get RunTrim →</span>
      </div>
    </div>
    {/* hero hint */}
    <div style={{ marginTop: 56, paddingInline: 48, color: "rgba(255,255,255,0.5)", fontSize: 13 }}>
      <div style={{ fontSize: 28, color: T.inkLight, fontWeight: 500, letterSpacing: "-0.02em" }}>Scoped runs for agent infrastructure.</div>
      <div style={{ marginTop: 8 }}>One contract. Every model. Trimmed scope, audited blast radius.</div>
    </div>
  </div>
);

// 6b. App dashboard sidebar
const SidebarPreview = () => (
  <div style={{
    width: 540, height: 480, display: "flex",
    border: `1px solid ${T.lineDark}`, borderRadius: 12, overflow: "hidden",
    fontFamily: sansFont, color: T.inkLight,
    position: "relative",
  }}>
    <div style={{ position: "absolute", top: 14, left: 18, zIndex: 2 }}><TinyLabel>Dashboard sidebar</TinyLabel></div>

    {/* sidebar */}
    <div style={{
      width: 220, background: T.graphite, borderRight: `1px solid ${T.lineDark}`,
      padding: "56px 16px 16px", display: "flex", flexDirection: "column", gap: 4,
    }}>
      <div style={{ paddingInline: 8, paddingBlock: 6, marginBottom: 10 }}>
        <HLockup size={18} gap={8} dim={0.6} />
      </div>
      {[
        ["Runs", true, "32"],
        ["Contracts", false, "8"],
        ["Audit log", false, null],
        ["Models", false, "12"],
        ["Webhooks", false, null],
        ["Settings", false, null],
      ].map(([label, active, count]) => (
        <div key={label} style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "8px 10px", borderRadius: 6,
          background: active ? "rgba(167,139,250,0.10)" : "transparent",
          color: active ? T.inkLight : "rgba(255,255,255,0.62)",
          fontSize: 13,
          borderLeft: active ? `2px solid ${T.violet}` : "2px solid transparent",
        }}>
          <span>{label}</span>
          {count && <span style={{ fontFamily: monoFont, fontSize: 10.5, opacity: 0.6 }}>{count}</span>}
        </div>
      ))}
      <div style={{ flex: 1 }}></div>
      <div style={{
        padding: 10, borderTop: `1px solid ${T.lineDark}`, marginTop: 8,
        display: "flex", alignItems: "center", gap: 10, fontSize: 12,
        color: "rgba(255,255,255,0.6)",
      }}>
        <div style={{
          width: 26, height: 26, borderRadius: 6,
          background: "linear-gradient(135deg, #6ee7b7, #a78bfa)",
        }}></div>
        <div>
          <div style={{ color: T.inkLight, fontSize: 12 }}>Acme Inc.</div>
          <div style={{ fontSize: 10.5, opacity: 0.6 }}>Team · Pro</div>
        </div>
      </div>
    </div>

    {/* canvas */}
    <div style={{ flex: 1, background: T.graphite2, padding: 24 }}>
      <div style={{ fontSize: 18, fontWeight: 500, letterSpacing: "-0.01em" }}>Runs</div>
      <div style={{ marginTop: 4, fontSize: 12, color: "rgba(255,255,255,0.55)" }}>32 active · 8 trimmed today</div>
      <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 6 }}>
        {["agent-a", "review-bot", "code-cmp"].map((n, i) => (
          <div key={n} style={{
            padding: "10px 12px", borderRadius: 7,
            background: "rgba(255,255,255,0.03)", border: `1px solid ${T.lineDark}`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            fontFamily: monoFont, fontSize: 11.5, color: "rgba(255,255,255,0.7)",
          }}>
            <span>{n}.runtrim.dev</span>
            <span style={{ color: i === 0 ? "#6ee7b7" : "rgba(255,255,255,0.5)" }}>● {i === 0 ? "live" : "idle"}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// 6c. Terminal header
const TerminalPreview = () => (
  <div style={{
    width: 540, height: 320,
    background: "#0c0e13", color: T.inkLight,
    border: `1px solid ${T.lineDark}`, borderRadius: 12, overflow: "hidden",
    fontFamily: monoFont, fontSize: 12,
    position: "relative",
  }}>
    <div style={{ position: "absolute", top: 14, left: 18 }}><TinyLabel>Terminal · runtrim CLI</TinyLabel></div>
    {/* terminal chrome */}
    <div style={{
      marginTop: 40, padding: "10px 14px",
      borderBottom: `1px solid ${T.lineDark}`,
      display: "flex", alignItems: "center", gap: 10,
      background: "#10131a",
    }}>
      <div style={{ display: "flex", gap: 6 }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }}></div>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e" }}></div>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }}></div>
      </div>
      <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
        <RMark size={12} tight />
        <span style={{ fontSize: 11, opacity: 0.7 }}>runtrim · ~/agents/code-cmp</span>
      </div>
    </div>
    {/* body */}
    <div style={{ padding: "16px 18px", lineHeight: 1.7, color: "rgba(244,245,247,0.85)" }}>
      <div><span style={{ color: T.violet }}>$</span> runtrim init code-cmp</div>
      <div style={{ opacity: 0.55 }}>  ✓ contract written</div>
      <div style={{ opacity: 0.55 }}>  ✓ scope trimmed: <span style={{ color: "#6ee7b7" }}>fs:read, http:api.acme.com</span></div>
      <div style={{ marginTop: 6 }}><span style={{ color: T.violet }}>$</span> runtrim run --model gpt-4.1</div>
      <div style={{ opacity: 0.55 }}>  → <span style={{ color: T.inkLight }}>routing</span> through scope · 14 tools allowed</div>
      <div style={{ marginTop: 6, color: "rgba(244,245,247,0.4)" }}><span style={{ opacity: 0.7 }}>▍</span></div>
    </div>
  </div>
);

// 6d. Social avatar
const SocialPreview = () => (
  <div style={{
    width: 380, height: 320, padding: 24,
    background: T.graphite, color: T.inkLight,
    border: `1px solid ${T.lineDark}`, borderRadius: 12,
    fontFamily: sansFont,
    position: "relative",
  }}>
    <div style={{ position: "absolute", top: 14, left: 18 }}><TinyLabel>Social · X / GitHub</TinyLabel></div>
    <div style={{ marginTop: 32, display: "flex", gap: 14 }}>
      {/* avatar */}
      <div style={{
        width: 64, height: 64, borderRadius: "50%", background: T.graphite2,
        display: "grid", placeItems: "center", border: `1px solid ${T.lineDark}`,
        overflow: "hidden",
      }}>
        <RMark size={42} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 500 }}>RunTrim</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", marginTop: 2 }}>@runtrim</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 8, lineHeight: 1.4 }}>
          Scoped runs for agent infrastructure. One contract. Every model.
        </div>
      </div>
    </div>
    {/* stats */}
    <div style={{
      marginTop: 18, paddingTop: 14,
      borderTop: `1px solid ${T.lineDark}`,
      display: "flex", gap: 20, fontSize: 12, color: "rgba(255,255,255,0.6)",
    }}>
      <span><b style={{ color: T.inkLight, fontWeight: 500 }}>284</b> Following</span>
      <span><b style={{ color: T.inkLight, fontWeight: 500 }}>12.4K</b> Followers</span>
    </div>
    {/* squared variants */}
    <div style={{
      marginTop: 18, paddingTop: 14,
      borderTop: `1px solid ${T.lineDark}`,
      display: "flex", gap: 10, alignItems: "center",
    }}>
      <TinyLabel>Avatar variants</TinyLabel>
      <div style={{ flex: 1 }}></div>
      {[40, 32, 24, 16].map(s => (
        <div key={s} style={{
          width: s + 12, height: s + 12, borderRadius: "50%",
          background: T.graphite2, border: `1px solid ${T.lineDark}`,
          display: "grid", placeItems: "center",
        }}>
          <RMark size={s} />
        </div>
      ))}
    </div>
  </div>
);

// 6e. Favicon ladder + browser tab
const FaviconPreview = () => (
  <div style={{
    width: 540, height: 320, padding: "24px 24px 24px",
    background: T.graphite, color: T.inkLight,
    border: `1px solid ${T.lineDark}`, borderRadius: 12,
    fontFamily: sansFont, position: "relative",
  }}>
    <div style={{ position: "absolute", top: 14, left: 18 }}><TinyLabel>Favicon · 16 · 24 · 32 · 48 · 64</TinyLabel></div>

    {/* browser tab mockup */}
    <div style={{ marginTop: 32 }}>
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        padding: "8px 14px 8px 12px",
        background: "#1a1d24", borderRadius: "8px 8px 0 0",
        border: `1px solid ${T.lineDark}`, borderBottom: "none",
        fontSize: 12, color: T.inkLight,
      }}>
        <RMark size={14} bg={T.graphite2} bgRadius={3} />
        <span>RunTrim — Scoped runs</span>
        <span style={{ marginLeft: 14, opacity: 0.5 }}>×</span>
      </div>
      <div style={{
        height: 6, background: "#1a1d24", borderTop: `1px solid ${T.lineDark}`,
        borderRadius: "0 6px 0 0",
      }}></div>
    </div>

    {/* favicon ladder */}
    <div style={{
      marginTop: 36, display: "flex", alignItems: "flex-end", gap: 22,
      paddingBottom: 8, borderBottom: `1px solid ${T.lineDark}`,
    }}>
      {[16, 24, 32, 48, 64].map(s => (
        <div key={s} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <RMark size={s} bg={T.graphite2} bgRadius={Math.round(s * 0.22)} />
          <div style={{ fontFamily: monoFont, fontSize: 9.5, color: "rgba(255,255,255,0.5)" }}>{s}px</div>
        </div>
      ))}
    </div>
    <div style={{ marginTop: 14, fontSize: 11, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
      The diagonal leg holds shape down to 16 px — the structural axis is wide enough (16 of 100 units) to never collapse against the stem.
    </div>
  </div>
);

// 6f. Docs header
const DocsPreview = () => (
  <div style={{
    width: 540, height: 320,
    background: T.paper, color: T.inkDark,
    border: `1px solid ${T.lineLight}`, borderRadius: 12, overflow: "hidden",
    fontFamily: sansFont, position: "relative",
  }}>
    <div style={{ position: "absolute", top: 14, left: 18 }}><TinyLabel dark={false}>Docs header · light</TinyLabel></div>

    {/* nav */}
    <div style={{
      marginTop: 40, padding: "14px 22px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      borderBottom: `1px solid ${T.lineLight}`, background: T.paper,
    }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
        <HLockup size={20} gap={10} ink={T.inkDark} accent={T.violetDeep} dim={0.55} />
        <span style={{
          fontFamily: monoFont, fontSize: 11, padding: "3px 8px",
          background: "rgba(124,92,255,0.10)", color: T.violetDeep, borderRadius: 4,
          letterSpacing: "0.04em",
        }}>docs</span>
      </div>
      <div style={{ display: "flex", gap: 18, fontSize: 12.5, color: "rgba(0,0,0,0.6)" }}>
        <span>Guides</span><span>API</span><span>CLI</span>
      </div>
    </div>

    {/* body */}
    <div style={{ padding: "24px 22px" }}>
      <div style={{ fontFamily: monoFont, fontSize: 10.5, color: T.violetDeep, letterSpacing: "0.1em", textTransform: "uppercase" }}>Guide</div>
      <div style={{ marginTop: 8, fontSize: 24, fontWeight: 500, letterSpacing: "-0.02em" }}>Writing your first contract</div>
      <div style={{ marginTop: 8, fontSize: 13, color: "rgba(0,0,0,0.62)", lineHeight: 1.55 }}>
        A contract declares the scope your agent runs inside — filesystem,
        network, tools. RunTrim trims everything else.
      </div>
      <div style={{
        marginTop: 16, padding: "10px 14px",
        background: "#0a0c10", color: T.inkLight,
        fontFamily: monoFont, fontSize: 11.5, borderRadius: 6,
      }}>
        <span style={{ color: T.violet }}>$</span> runtrim init my-agent
      </div>
    </div>
  </div>
);


// =========================================================
// SECTION 7 — CLEAR SPACE & MISUSE
// =========================================================

const ClearspacePreview = () => (
  <div style={{
    width: 540, height: 320, padding: 32,
    background: T.graphite, color: T.inkLight,
    border: `1px solid ${T.lineDark}`, borderRadius: 12,
    position: "relative", display: "grid", placeItems: "center",
  }}>
    <div style={{ position: "absolute", top: 14, left: 18 }}><TinyLabel>Clear space · ½ cap-height</TinyLabel></div>
    <div style={{ position: "relative", display: "inline-block" }}>
      {/* clearspace box */}
      <div style={{
        position: "absolute", inset: -36,
        border: `1px dashed rgba(167,139,250,0.4)`,
        borderRadius: 6,
      }}></div>
      {/* dashed measurement marks */}
      <div style={{
        position: "absolute", top: -36, left: "50%", transform: "translateX(-50%)",
        fontFamily: monoFont, fontSize: 9.5, color: "rgba(167,139,250,0.7)",
        background: T.graphite, padding: "0 6px",
      }}>½ cap</div>
      <HLockup size={48} gap={16} dim={0.55} />
    </div>
  </div>
);

const MisusePreview = () => {
  const cell = (label, ok, content) => (
    <div style={{
      width: 160, height: 130, padding: 12,
      background: T.graphite2, borderRadius: 8,
      border: `1px solid ${T.lineDark}`,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: 6, right: 8,
        fontFamily: monoFont, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase",
        color: ok ? "#6ee7b7" : "#f87171",
      }}>{ok ? "do" : "don't"}</div>
      <div style={{ flex: 1, display: "grid", placeItems: "center" }}>{content}</div>
      <div style={{ fontFamily: monoFont, fontSize: 9.5, color: "rgba(255,255,255,0.55)", letterSpacing: "0.04em" }}>{label}</div>
    </div>
  );
  return (
    <div style={{
      width: 1200, padding: 32,
      background: T.graphite, border: `1px solid ${T.lineDark}`, borderRadius: 12,
    }}>
      <TinyLabel>Misuse</TinyLabel>
      <div style={{ marginTop: 18, display: "flex", gap: 14, flexWrap: "wrap" }}>
        {cell("preserve geometry", true, <RMark size={56} />)}
        {cell("don't recolor leg", false, <RMark size={56} accent="#fb7185" />)}
        {cell("don't outline",   false, (
          <svg width="56" height="56" viewBox="0 0 100 100" fill="none">
            <path d="M 26 54 L 52 54 L 84 90 L 58 90 Z" stroke={T.violet} strokeWidth="3" />
            <path
              d="M 10 10 L 80 10 L 80 54 L 26 54 L 26 90 L 10 90 Z M 26 26 L 64 26 L 64 38 L 26 38 Z"
              stroke={T.inkLight} strokeWidth="3" fillRule="evenodd"
            />
          </svg>
        ))}
        {cell("don't rotate", false, (
          <div style={{ transform: "rotate(-12deg)" }}><RMark size={56} /></div>
        ))}
        {cell("don't add gradient", false, (
          <svg width="56" height="56" viewBox="0 0 100 100" fill="none">
            <defs>
              <linearGradient id="bad-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#a78bfa" />
                <stop offset="1" stopColor="#6ee7b7" />
              </linearGradient>
            </defs>
            <path d="M 26 54 L 52 54 L 84 90 L 58 90 Z" fill="url(#bad-grad)" />
            <path
              d="M 10 10 L 80 10 L 80 54 L 26 54 L 26 90 L 10 90 Z M 26 26 L 64 26 L 64 38 L 26 38 Z"
              fill="url(#bad-grad)" fillRule="evenodd"
            />
          </svg>
        ))}
        {cell("don't shadow", false, (
          <div style={{ filter: "drop-shadow(4px 4px 0 rgba(167,139,250,0.5))" }}><RMark size={56} /></div>
        ))}
        {cell("don't squish", false, (
          <div style={{ transform: "scaleX(0.7)" }}><RMark size={56} /></div>
        ))}
      </div>
    </div>
  );
};


// =========================================================
// RATIONALE CARD
// =========================================================

const Rationale = () => (
  <div style={{
    width: 720, padding: 36,
    background: T.graphite, color: T.inkLight,
    border: `1px solid ${T.lineDark}`, borderRadius: 12,
    fontFamily: sansFont, fontSize: 14, lineHeight: 1.6,
  }}>
    <TinyLabel>Why this is the production direction</TinyLabel>
    <div style={{ marginTop: 18, fontSize: 22, fontWeight: 500, letterSpacing: "-0.015em" }}>
      A rectilinear R that <span style={{ color: T.violet }}>routes</span> the eye through itself.
    </div>
    <div style={{ marginTop: 16, color: "rgba(255,255,255,0.72)" }}>
      The right leg is a parallel-edged structural diagonal — same weight as the stem, anchored at the bowl junction and the descender. It is the only non-orthogonal element in the entire mark, and it carries the brand's whole metaphor: a routed path through a scoped gate. The horizontal slot inside the bowl reads as that gate; the diagonal is what passes through it.
    </div>
    <div style={{
      marginTop: 22, paddingTop: 18,
      borderTop: `1px solid ${T.lineDark}`,
      display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14,
      fontSize: 12.5, color: "rgba(255,255,255,0.62)",
    }}>
      <div><span style={{ color: T.violet }}>—</span> Reads as R at every size, 16 px through 1024 px</div>
      <div><span style={{ color: T.violet }}>—</span> Two-color system: monochrome stem + violet leg</div>
      <div><span style={{ color: T.violet }}>—</span> Lockup is baseline-aligned, mathematically</div>
      <div><span style={{ color: T.violet }}>—</span> Survives monochrome, KO, and inverted contexts</div>
      <div><span style={{ color: T.violet }}>—</span> Sits next to Linear / Vercel / Raycast credibly</div>
      <div><span style={{ color: T.violet }}>—</span> No gradient, no glow, no soft curve, no slop</div>
    </div>
  </div>
);


// =========================================================
// CANVAS
// =========================================================

const App = () => (
  <DesignCanvas>
    <DCSection id="hero" title="RunTrim · The Mark" subtitle="Production identity, v1.0">
      <DCArtboard id="mark" label="The mark" width={1200} height={720}>
        <SectionHero />
      </DCArtboard>
      <DCArtboard id="rationale" label="Rationale" width={720} height={400}>
        <Rationale />
      </DCArtboard>
    </DCSection>

    <DCSection id="construction" title="Construction & Wordmark" subtitle="Geometry, type, proportions">
      <DCArtboard id="con" label="Construction" width={720} height={720}>
        <Construction />
      </DCArtboard>
      <DCArtboard id="word" label="Wordmark spec" width={880} height={480}>
        <WordmarkSpec />
      </DCArtboard>
    </DCSection>

    <DCSection id="lockups" title="Lockup System" subtitle="10 production variants">
      <DCArtboard id="lockup-grid" label="Lockups" width={1320} height={780}>
        <LockupGrid />
      </DCArtboard>
    </DCSection>

    <DCSection id="color" title="Color System" subtitle="Restrained, technical, contrast-safe">
      <DCArtboard id="color-grid" label="Tokens & contrast" width={1200} height={400}>
        <ColorSystem />
      </DCArtboard>
    </DCSection>

    <DCSection id="usage" title="Usage" subtitle="Real surfaces · navbar, dashboard, terminal, social, favicon, docs">
      <DCArtboard id="navbar"   label="Website navbar"     width={1100} height={280}><NavbarPreview /></DCArtboard>
      <DCArtboard id="sidebar"  label="Dashboard sidebar"  width={540}  height={480}><SidebarPreview /></DCArtboard>
      <DCArtboard id="terminal" label="Terminal CLI"       width={540}  height={320}><TerminalPreview /></DCArtboard>
      <DCArtboard id="social"   label="Social profile"     width={380}  height={320}><SocialPreview /></DCArtboard>
      <DCArtboard id="favicon"  label="Favicon ladder"     width={540}  height={320}><FaviconPreview /></DCArtboard>
      <DCArtboard id="docs"     label="Docs header · light" width={540} height={320}><DocsPreview /></DCArtboard>
    </DCSection>

    <DCSection id="rules" title="Rules" subtitle="Clear space & misuse">
      <DCArtboard id="clearspace" label="Clear space" width={540}  height={320}><ClearspacePreview /></DCArtboard>
      <DCArtboard id="misuse"     label="Misuse"      width={1200} height={260}><MisusePreview /></DCArtboard>
    </DCSection>
  </DesignCanvas>
);

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
