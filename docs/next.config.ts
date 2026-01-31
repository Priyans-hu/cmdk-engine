import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/cmdk-engine',
  images: {
    unoptimized: true,
  },
}

export default nextConfig
