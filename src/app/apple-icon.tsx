import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// R mark at 180px on 100u grid, scale = 1.8
// body:   x=10→18, y=10→18, x=80→144, y=54→97.2, x=26→46.8, y=90→162, y=26→46.8, y=38→68.4, x=64→115.2
// leg:    (26,54)→(46.8,97.2), (52,54)→(93.6,97.2), (84,90)→(151.2,162), (58,90)→(104.4,162)

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: 180, height: 180,
        borderRadius: 40,
        background: "#0c0e11",
        display: "flex",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Violet diagonal leg */}
      <div style={{
        position: "absolute",
        width: 180, height: 180,
        display: "flex",
        clipPath: "polygon(46.8px 97.2px, 93.6px 97.2px, 151.2px 162px, 104.4px 162px)",
        background: "#a78bfa",
      }} />
      {/* R body — stem + bowl top */}
      <div style={{ position: "absolute", left: 18, top: 18, width: 126, height: 79.2, background: "#f4f5f7", display: "flex" }} />
      {/* Left stem down */}
      <div style={{ position: "absolute", left: 18, top: 18, width: 28.8, height: 144, background: "#f4f5f7", display: "flex" }} />
      {/* Counter slot */}
      <div style={{ position: "absolute", left: 46.8, top: 46.8, width: 68.4, height: 21.6, background: "#0c0e11", display: "flex" }} />
    </div>,
    { ...size }
  );
}
