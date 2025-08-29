import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // React Strict Mode 비활성화
  reactStrictMode: false,
  // 실험적 기능 설정
  experimental: {
    optimizePackageImports: [],
  },
  // Webpack 설정
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@next/react-dev-overlay': false,
        'next/dist/client/dev/error-overlay': false,
      };
    }
    return config;
  },
};

export default nextConfig;
