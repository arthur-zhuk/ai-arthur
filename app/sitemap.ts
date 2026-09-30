import type { MetadataRoute } from "next";
import { profileData } from "@/lib/profile-data";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: profileData.contact.site,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
