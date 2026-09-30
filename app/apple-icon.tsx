import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

// iOS rounds home-screen icons itself, so this is the same mark without its own
// corner radius or inner border.
export default async function AppleIcon() {
  const svg = (await readFile(join(process.cwd(), "app/icon.svg"), "utf8"))
    .replace(/rx="30"/g, 'rx="0"')
    .replace(/<rect x="1.5"[^>]*\/>/, "");
  const src = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  return new ImageResponse(
    <img src={src} width={size.width} height={size.height} alt="" />,
    size,
  );
}
