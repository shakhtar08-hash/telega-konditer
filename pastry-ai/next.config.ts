import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["schnapps-capillary-doorknob.ngrok-free.dev"],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
