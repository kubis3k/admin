import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    authInterrupts: true,
    // Default limit těla server actions je 1 MB — nestačilo by na upload
    // obrázků do 4 MB (viz src/lib/upload.ts MAX_IMAGE_BYTES).
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
