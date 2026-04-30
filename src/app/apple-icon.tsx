import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Reproduces the RT mark from icon.svg at 180×180
// Scale factor: 180/100 = 1.8
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: 180,
        height: 180,
        borderRadius: 40,
        background: "linear-gradient(160deg, #4E65FF 0%, #6E30CC 100%)",
        display: "flex",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Top horizontal bar: rect x=25 y=20 w=58 h=13 → ×1.8 */}
      <div style={{ position: "absolute", left: 45, top: 36, width: 104, height: 23, background: "rgba(255,255,255,0.95)", display: "flex" }} />
      {/* Left vertical stem: rect x=25 y=20 w=13 h=68 → ×1.8 */}
      <div style={{ position: "absolute", left: 45, top: 36, width: 23,  height: 122, background: "rgba(255,255,255,0.95)", display: "flex" }} />
      {/* Shoulder arm: polygon 83,20 56,47 83,33 → bounding box left=56 top=20 w=27 h=27 → ×1.8 = l=101 t=36 w=49 h=49 */}
      <div style={{ position: "absolute", left: 101, top: 36, width: 49, height: 49,
        background: "rgba(255,255,255,0.95)",
        clipPath: "polygon(49px 0px, 0px 49px, 49px 23px)",
        display: "flex",
      }} />
      {/* Diagonal leg: polygon 38,46 52,46 80,88 66,88 → bbox l=38 t=46 w=42 h=42 → ×1.8 = l=68 t=83 w=76 h=76 */}
      <div style={{ position: "absolute", left: 68, top: 83, width: 76, height: 76,
        background: "rgba(255,255,255,0.95)",
        clipPath: "polygon(0px 0px, 25px 0px, 76px 76px, 51px 76px)",
        display: "flex",
      }} />
    </div>,
    { ...size }
  );
}
