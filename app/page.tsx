import PersonalPage from "@/components/personal-page";
import { profileData } from "@/lib/profile-data";

const person = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: profileData.name,
  jobTitle: profileData.title,
  url: profileData.contact.site,
  worksFor: { "@type": "Organization", name: profileData.experience[0].company },
  sameAs: [profileData.contact.github, profileData.contact.linkedin],
  knowsAbout: profileData.skills,
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        // "<" is escaped so profile text can never close the script tag.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(person).replace(/</g, "\\u003c"),
        }}
      />
      <PersonalPage chatReady={process.env.SITES_STATIC_PREVIEW !== "1"} />
    </>
  );
}
