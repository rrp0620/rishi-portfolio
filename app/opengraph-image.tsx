import { ImageResponse } from "next/og";

export const alt = "Rishi Patel — Operator + AI builder";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px 96px",
          background: "#0a0a0a",
          color: "#ffffff",
        }}
      >
        <div
          style={{
            fontSize: 96,
            fontWeight: 700,
            letterSpacing: -2,
            lineHeight: 1.05,
          }}
        >
          Rishi Patel
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 40,
            fontWeight: 400,
            color: "#a3a3a3",
            lineHeight: 1.3,
            maxWidth: 920,
          }}
        >
          GTM analytics by day, AI builder by night.
        </div>
      </div>
    ),
    { ...size }
  );
}
