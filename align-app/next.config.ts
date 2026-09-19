import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Raised from the 1MB default so teaching-record evidence file uploads fit through a
    // Server Action. Must stay at/below ~4.5MB regardless of this setting — Vercel serverless
    // Functions hard-reject request bodies above that at the platform level (see the 4MB
    // per-file check in teaching-records/actions.ts). Going higher would require Vercel Blob's
    // client-direct-upload flow instead, which is out of scope here.
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
