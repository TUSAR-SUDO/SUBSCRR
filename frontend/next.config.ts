import type { NextConfig } from "next";
import { withPayload } from "@payloadcms/next/withPayload";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "maidensail.com" },
      { protocol: "https", hostname: "subscrr.app" },
    ],
  },
  outputFileTracingIncludes: {
    "/**": ["./media-uploads/**"],
  },
};

export default withPayload(nextConfig, { devBundleServerPackages: false });
