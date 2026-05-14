import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#faf6ec",
          color: "#1f1a14",
          fontFamily: "Georgia, serif",
          fontSize: 20,
          fontWeight: 600,
          letterSpacing: -0.5,
          border: "1.5px solid #1f1a14",
          borderRadius: 4,
        }}
      >
        RP
      </div>
    ),
    { ...size },
  );
}
