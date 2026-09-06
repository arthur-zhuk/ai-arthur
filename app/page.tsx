import PersonalPage from "@/components/personal-page";

export default function HomePage() {
  return <PersonalPage chatReady={process.env.SITES_STATIC_PREVIEW !== "1"} />;
}
