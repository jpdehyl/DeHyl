import type { NextConfig } from "next";

const devOrigins: string[] = [];
if (process.env.REPLIT_DEV_DOMAIN) {
  devOrigins.push(`https://${process.env.REPLIT_DEV_DOMAIN}`);
}
if (process.env.REPLIT_DOMAINS) {
  process.env.REPLIT_DOMAINS.split(",").forEach((d) =>
    devOrigins.push(`https://${d.trim()}`)
  );
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: devOrigins,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "drive.google.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
// Force redeploy 20260208133912
