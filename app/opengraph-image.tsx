import { ImageResponse } from "next/og";
import { profileData } from "@/lib/profile-data";

export const alt = "Arthur Zhuk, Senior Software Engineer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Shown when the site is shared on LinkedIn, Slack, X, iMessage, and so on.
export default function OpenGraphImage() {
  const current = profileData.experience[0];
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 84px",
          background: "#131412",
          color: "#f1f0e9",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 26,
            letterSpacing: 2,
            color: "#b5b6ad",
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              background: "#e9be74",
            }}
          />
          {`${profileData.title.toUpperCase()} · ${current.company.toUpperCase()}`}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 168,
              fontWeight: 700,
              lineHeight: 0.95,
              letterSpacing: -6,
            }}
          >
            Arthur Zhuk
            <span style={{ color: "#e9be74" }}>.</span>
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 34,
              fontSize: 44,
              lineHeight: 1.25,
              color: "#c9cabf",
              maxWidth: 900,
            }}
          >
            Complex systems. Human experiences.
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 28,
            color: "#a1a29b",
          }}
        >
          <div style={{ display: "flex" }}>
            Backend depth. Frontend instinct.
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "16px 28px",
              borderRadius: 12,
              background: "#e9be74",
              color: "#131412",
              fontWeight: 700,
            }}
          >
            Ask AI Arthur
          </div>
        </div>
      </div>
    ),
    size,
  );
}
