import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@xenova/transformers", "pg"],
};

export default nextConfig;
