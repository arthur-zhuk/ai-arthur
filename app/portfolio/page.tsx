import type { Metadata } from "next";
import PersonalPage from "@/components/personal-page";

export const metadata: Metadata = {
  title: "Arthur Zhuk | Portfolio",
};

export default function PortfolioPage() {
  return <PersonalPage chatReady={process.env.SITES_STATIC_PREVIEW !== "1"} />;
}
