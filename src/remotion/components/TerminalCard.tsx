import React from "react";
import { C, FONT_MONO, VideoMode, sz, cursor } from "../styles";

export interface TerminalLine {
  kind?: "prompt" | "dim" | "accent" | "success" | "header" | "blank";
  text: string;
}

interface Props {
  title?:        string;
  lines:         TerminalLine[];
  /**
   * Typing progress in "char units".
   * - 0..promptLen  → types the prompt char by char
   * - promptLen+N   → prompt done; every OUTPUT_WEIGHT units reveals one more output line
   * If undefined, all lines show immediately.
   */
  charRevealed?: number;
  width?:        number | string;
  mode?:         VideoMode;
  frame?:        number;  // for cursor blink
}

// How many "char units" each output line costs (≈ 5 frames at 1.5 chars/frame)
const OUTPUT_WEIGHT = 7;

const LINE_COLOR: Record<string, string> = {
  prompt:  C.mint,
  accent:  C.accent,
  success: C.mint,
  header:  C.textSub,
  dim:     C.textDim,
};

export function TerminalCard({
  title = "terminal",
  lines,
  charRevealed,
  width = 740,
  mode = "landscape",
  frame = 0,
}: Props) {
  const showAll = charRevealed === undefined;

  // Find the first prompt line text
  const promptLine = lines.find(l => l.kind === "prompt");
  const promptText = promptLine?.text ?? "";
  const promptLen  = promptText.length;

  // Compute typed text and how many output lines are visible
  const typedChars   = showAll ? promptLen  : Math.min(promptLen, Math.floor(charRevealed));
  const stillTyping  = !showAll && typedChars < promptLen;
  const afterPrompt  = showAll ? Infinity   : Math.max(0, charRevealed - promptLen);
  const outputVisible = showAll ? Infinity  : Math.floor(afterPrompt / OUTPUT_WEIGHT);

  // Assign a sequential index to each non-prompt line for staggered reveal
  let nonPromptIdx = 0;

  const cmdSize = sz("mono", mode);
  const outSize = sz("monoSm", mode);
  const cursorOn = cursor(frame) === 1;

  return (
    <div style={{
      width,
      borderRadius: 12,
      border: `1px solid ${C.borderMid}`,
      background: "#06060C",
      overflow: "hidden",
      fontFamily: FONT_MONO,
      boxShadow: "0 24px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)",
      // Fixed layout — height determined by all lines, never shrinks/grows
      flexShrink: 0,
    }}>
      {/* Title bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "11px 20px",
        borderBottom: `1px solid ${C.border}`,
        background: "rgba(255,255,255,0.02)",
      }}>
        <div style={{ display: "flex", gap: 7 }}>
          {[0.28, 0.16, 0.09].map((op, i) => (
            <div key={i} style={{ width: 12, height: 12, borderRadius: "50%", background: `rgba(255,255,255,${op})` }} />
          ))}
        </div>
        <span style={{ fontSize: 12, color: C.textDim, letterSpacing: "0.04em" }}>{title}</span>
      </div>

      {/* Lines — ALL rendered at all times for stable height */}
      <div style={{ padding: "18px 22px", lineHeight: 1.75 }}>
        {lines.map((line, i) => {
          if (line.kind === "prompt") {
            // Always rendered; text truncated to typed chars
            const shown = typedChars;
            const displayText = line.text.slice(0, shown);
            const opacity = showAll || charRevealed! > 0 ? 1 : 0;
            return (
              <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 10, fontSize: cmdSize, opacity }}>
                <span style={{ color: C.textDim, flexShrink: 0, userSelect: "none" }}>$</span>
                <span style={{ color: C.mint, whiteSpace: "pre" }}>{displayText}</span>
                {stillTyping && (
                  <span style={{
                    display: "inline-block",
                    width: Math.round(cmdSize * 0.55),
                    height: cmdSize,
                    background: C.mint,
                    opacity: cursorOn ? 0.85 : 0,
                    verticalAlign: "text-bottom",
                    borderRadius: 1,
                    marginLeft: 1,
                    flexShrink: 0,
                  }} />
                )}
              </div>
            );
          }

          if (line.kind === "blank" || line.text === "") {
            // blank lines: visible once any output has appeared
            const myIdx = nonPromptIdx++;
            const visible = showAll || outputVisible > myIdx;
            return (
              <div key={i} style={{ height: 8, opacity: visible ? 1 : 0 }} />
            );
          }

          // Output line — appears staggered
          const myIdx = nonPromptIdx++;
          const visible = showAll || outputVisible > myIdx;
          const color = LINE_COLOR[line.kind ?? "dim"] ?? C.textDim;

          return (
            <div key={i} style={{
              display: "flex", alignItems: "baseline", gap: 10,
              fontSize: outSize,
              // opacity:0 hides but preserves height — prevents layout shift
              opacity: visible ? 1 : 0,
              transition: "none",
            }}>
              <span style={{ width: 10, flexShrink: 0 }} />
              <span style={{ color, whiteSpace: "pre" }}>{line.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
