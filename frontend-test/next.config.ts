import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    unoptimized: true,

    // dangerouslyAllowSVG: true,
  },
  reactStrictMode: true,
};

export default nextConfig;
