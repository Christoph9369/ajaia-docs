import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // mammoth and sanitize-html are Node-only; keep them out of the bundler.
  serverExternalPackages: ["mammoth", "sanitize-html"],
};

export default nextConfig;
