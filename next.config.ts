import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Old project slug from the May 2026 refactor. The resume PDF and
      // some LinkedIn pastes link here. Keep it alive forever.
      {
        source: "/projects/novus",
        destination: "/projects/escape-room",
        permanent: true,
      },
      // The two liquor-store builds were originally separate project
      // pages. They've since been combined into one. Redirect any
      // lingering links.
      {
        source: "/projects/liquor-invoices",
        destination: "/projects/liquor-store",
        permanent: true,
      },
      {
        source: "/projects/pos-inventory",
        destination: "/projects/liquor-store",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
