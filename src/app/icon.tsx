import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// R mark at 32px on a 100u grid scaled to 32px:
// scale = 32/100 = 0.32
// body:   x=10→3.2, y=10→3.2, x=80→25.6, y=54→17.28, x=26→8.32, y=90→28.8, y=26→8.32, y=38→12.16, x=64→20.48
// leg:    (26,54)→(8.32,17.28), (52,54)→(16.64,17.28), (84,90)→(26.88,28.8), (58,90)→(18.56,28.8)

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: 32, height: 32,
        borderRadius: 7,
        background: "#0c0e11",
        display: "flex",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Violet diagonal leg */}
      <div style={{
        position: "absolute",
        width: 32, height: 32,
        display: "flex",
        clipPath: "polygon(8.32px 17.28px, 16.64px 17.28px, 26.88px 28.8px, 18.56px 28.8px)",
        background: "#a78bfa",
      }} />
      {/* R body — stem + bowl top (full width) */}
      <div style={{ position: "absolute", left: 3.2, top: 3.2, width: 22.4, height: 14.08, background: "#f4f5f7", display: "flex" }} />
      {/* Left stem extending down */}
      <div style={{ position: "absolute", left: 3.2, top: 3.2, width: 5.12, height: 25.6, background: "#f4f5f7", display: "flex" }} />
      {/* Counter slot — dark bg colour to punch hole in bowl */}
      <div style={{ position: "absolute", left: 8.32, top: 8.32, width: 12.16, height: 3.84, background: "#0c0e11", display: "flex" }} />
    </div>,
    { ...size }
  );
}
