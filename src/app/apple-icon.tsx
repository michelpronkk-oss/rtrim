import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const MARK = "linear-gradient(160deg, #6E8DFF 0%, #7A4DFF 100%)";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: 180,
        height: 180,
        borderRadius: 40,
        background: "#0A0B1F",
        display: "flex",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", left: 45, top: 36, width: 104, height: 23, background: MARK, display: "flex" }} />
      <div style={{ position: "absolute", left: 45, top: 36, width: 23, height: 122, background: MARK, display: "flex" }} />
      <div
        style={{
          position: "absolute",
          left: 101,
          top: 36,
          width: 49,
          height: 49,
          background: MARK,
          clipPath: "polygon(49px 0px, 0px 49px, 49px 23px)",
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 68,
          top: 83,
          width: 76,
          height: 76,
          background: MARK,
          clipPath: "polygon(0px 0px, 25px 0px, 76px 76px, 51px 76px)",
          display: "flex",
        }}
      />
    </div>,
    { ...size }
  );
}
