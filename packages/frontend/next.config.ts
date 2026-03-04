import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@onera/shared"],
};

export default nextConfig;
