import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "qohhnufxididbmzqnjwg.supabase.co",
        pathname: "/storage/v1/object/public/avatars/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        pathname: "/storage/v1/object/public/avatars/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        pathname: "/storage/v1/object/public/avatars/**",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/login",
        destination: "/auth/login",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
