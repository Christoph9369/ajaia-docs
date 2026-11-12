import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // mammoth is Node-only; keep it out of the bundler.
  // sanitize-html must be bundled, not externalized: it require()s the ESM-only htmlparser2,
  // which crashes at runtime on Node versions without require(esm) (seen on Vercel).
  serverExternalPackages: ["mammoth"],
};

export default nextConfig;
