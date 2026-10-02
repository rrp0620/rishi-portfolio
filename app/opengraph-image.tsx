import { ImageResponse } from "next/og";

export const alt = "Rishi Patel · Portfolio";
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
          justifyContent: "space-between",
          padding: "72px 96px",
          background: "#fafaf7",
          color: "#1a1a1a",
          fontFamily: "Inter, sans-serif",
        }}
      >
        {/* Top metadata strip */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 16,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "#6a6a6a",
          }}
        >
          <span>Rishi Patel</span>
          <span>Remote · US East</span>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              fontSize: 116,
              fontWeight: 600,
              letterSpacing: -3,
              lineHeight: 1,
              color: "#1a1a1a",
            }}
          >
            Rishi Patel
          </div>
          <div
            style={{
              fontSize: 30,
              fontWeight: 400,
              color: "#3a3a3a",
              lineHeight: 1.3,
              maxWidth: 1000,
            }}
          >
            I build the systems and AI workflows behind revenue numbers.
            Business Performance Analyst at a public company, reporting to
            the Chief Business Officer.
          </div>
        </div>

        {/* Bottom rule + label */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 15,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "#6a6a6a",
          }}
        >
          <div
            style={{
              flexGrow: 1,
              height: 1,
              background: "#1f3a8a",
            }}
          />
          <span>Open to GTM Engineering and AI deployment roles</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
