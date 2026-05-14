import { ImageResponse } from "next/og";

export const alt = "Rishi Patel — Operator and AI builder";
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
          background: "#faf6ec",
          color: "#1f1a14",
          fontFamily: "Georgia, serif",
        }}
      >
        {/* Top metadata strip */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "monospace",
            fontSize: 18,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "#6b6557",
          }}
        >
          <span>Rishi Patel · Portfolio 2026</span>
          <span>Remote / Delaware</span>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              fontSize: 124,
              fontWeight: 500,
              letterSpacing: -2.5,
              lineHeight: 1,
              color: "#1f1a14",
            }}
          >
            Rishi Patel.
          </div>
          <div
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 32,
              fontWeight: 400,
              color: "#3a3329",
              lineHeight: 1.3,
              maxWidth: 980,
            }}
          >
            Operator and AI builder. GTM analytics by day, AI tools for
            small businesses by night.
          </div>
        </div>

        {/* Bottom rule + accent */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontFamily: "monospace",
            fontSize: 16,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "#6b6557",
          }}
        >
          <div
            style={{
              flexGrow: 1,
              height: 2,
              background: "#c2410c",
            }}
          />
          <span>Open to applied-AI roles · Deployment, adoption, strategy</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
