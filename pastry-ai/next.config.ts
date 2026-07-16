import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["schnapps-capillary-doorknob.ngrok-free.dev"],
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
