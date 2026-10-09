import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/cmdk-engine',
  // Exports each page as <route>/index.html with its payload at <route>/index.txt.
  // Without it, the client fetches the home page's payload from /cmdk-engine.txt,
  // outside the base path, so it 404s on GitHub Pages and Next reloads the page.
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
}

export default nextConfig
