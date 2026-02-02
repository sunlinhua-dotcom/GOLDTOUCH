import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 生产环境优化
  reactStrictMode: true,

  // 输出配置 - standalone 模式减小部署体积
  output: 'standalone',

  // 性能优化
  swcMinify: true,

  // 图片优化
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },

  // 日志配置 - 生产环境减少日志
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV === 'development',
    },
  },
};

export default nextConfig;
