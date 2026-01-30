import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    // Optimize package imports for better bundle size
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
