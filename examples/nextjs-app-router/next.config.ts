import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // A redirect instead of an app/page.tsx, so `cmdk-engine scan` lists only real pages.
  async redirects() {
    return [{ source: '/', destination: '/en', permanent: false }]
  },
}

export default nextConfig
