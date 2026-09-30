import type { MetadataRoute } from "next";
import { profileData } from "@/lib/profile-data";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: `${profileData.contact.site}/sitemap.xml`,
    host: profileData.contact.site,
  };
}
