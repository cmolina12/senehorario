import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Angular app lived at /landing; keep old links working.
  async redirects() {
    return [{ source: "/landing", destination: "/", permanent: true }];
  },
};

export default nextConfig;
