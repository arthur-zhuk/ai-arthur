import { ImageResponse } from "next/og";

export const size = {
  width: 64,
  height: 64,
};

export const contentType = "image/png";

// The site's "az✷" mark, for browsers that do not use icon.svg.
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
          background: "#131412",
          borderRadius: 13,
          color: "#f1f0e9",
          fontSize: 33,
          fontWeight: 700,
          letterSpacing: -2,
        }}
      >
        az
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          style={{ marginLeft: 1, marginTop: -14 }}
        >
          <path
            d="M12 0 L14.4 9.6 L24 12 L14.4 14.4 L12 24 L9.6 14.4 L0 12 L9.6 9.6 Z"
            fill="#e9be74"
          />
        </svg>
      </div>
    ),
    { width: size.width, height: size.height },
  );
}
