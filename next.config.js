/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    // The editorial page used to live at /portfolio.
    return [{ source: "/portfolio", destination: "/", permanent: true }];
  },
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
};

module.exports = nextConfig;
