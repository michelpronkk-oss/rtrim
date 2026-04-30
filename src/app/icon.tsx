import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Reproduces the RT mark from icon.svg at 32×32
// Scale factor: 32/100 = 0.32
export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: 7,
        background: "linear-gradient(160deg, #4E65FF 0%, #6E30CC 100%)",
        display: "flex",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Top horizontal bar */}
      <div style={{ position: "absolute", left: 8, top: 6,  width: 19, height: 4,  background: "rgba(255,255,255,0.95)", display: "flex" }} />
      {/* Left vertical stem */}
      <div style={{ position: "absolute", left: 8, top: 6,  width: 4,  height: 22, background: "rgba(255,255,255,0.95)", display: "flex" }} />
      {/* Shoulder arm — triangle from top-right of bar pointing down-left */}
      <div style={{ position: "absolute", left: 18, top: 6, width: 9, height: 9,
        background: "rgba(255,255,255,0.95)",
        clipPath: "polygon(9px 0px, 0px 9px, 9px 4px)",
        display: "flex",
      }} />
      {/* Diagonal leg — parallelogram going bottom-right */}
      <div style={{ position: "absolute", left: 12, top: 15, width: 14, height: 14,
        background: "rgba(255,255,255,0.95)",
        clipPath: "polygon(0px 0px, 5px 0px, 14px 14px, 9px 14px)",
        display: "flex",
      }} />
    </div>,
    { ...size }
  );
}
