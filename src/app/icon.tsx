import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

const MARK = "linear-gradient(160deg, #6E8DFF 0%, #7A4DFF 100%)";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: 7,
        background: "#0A0B1F",
        display: "flex",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", left: 8, top: 6, width: 19, height: 4, background: MARK, display: "flex" }} />
      <div style={{ position: "absolute", left: 8, top: 6, width: 4, height: 22, background: MARK, display: "flex" }} />
      <div
        style={{
          position: "absolute",
          left: 18,
          top: 6,
          width: 9,
          height: 9,
          background: MARK,
          clipPath: "polygon(9px 0px, 0px 9px, 9px 4px)",
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 12,
          top: 15,
          width: 14,
          height: 14,
          background: MARK,
          clipPath: "polygon(0px 0px, 5px 0px, 14px 14px, 9px 14px)",
          display: "flex",
        }}
      />
    </div>,
    { ...size }
  );
}
