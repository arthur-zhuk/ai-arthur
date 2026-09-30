import type { Metadata, Viewport } from "next";
import { Geist_Mono, Outfit } from "next/font/google";
import "./globals.css";
import "./portfolio.css";
import "./chat.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
});

const title = "Arthur Zhuk | Senior Software Engineer";
const description =
  "Arthur Zhuk is a Senior Software Engineer at Anduril. Explore his experience, engineering work, interests, and ways to connect.";

export const metadata: Metadata = {
  title: { default: title, template: "%s | Arthur Zhuk" },
  description,
  metadataBase: new URL("https://www.arthurzh.uk"),
  alternates: { canonical: "/" },
  authors: [{ name: "Arthur Zhuk", url: "https://www.arthurzh.uk" }],
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Arthur Zhuk",
    title,
    description,
    locale: "en_US",
  },
  twitter: { card: "summary_large_image", title, description },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${outfit.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
