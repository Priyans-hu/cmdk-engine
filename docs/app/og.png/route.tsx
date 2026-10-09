import { ImageResponse } from 'next/og'
import { SITE } from '@/lib/constants'

export const dynamic = 'force-static'

/**
 * The social card for every page, generated at build time from the site
 * constants. It is a route named og.png, so the exported file has a real
 * extension and a static host serves it as an image.
 */
export function GET() {
  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        padding: '0 96px',
        color: '#f1f5f9',
        background: 'linear-gradient(135deg, #0b0f1a 0%, #1e1b4b 100%)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <svg width="96" height="96" viewBox="0 0 32 32">
          <rect width="32" height="32" rx="7" fill="#6366f1" />
          <g
            fill="none"
            stroke="#ffffff"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12.5 12.5h7v7h-7z" />
            <path d="M12.5 12.5v-2.6a2.6 2.6 0 1 0-2.6 2.6h2.6" />
            <path d="M19.5 12.5v-2.6a2.6 2.6 0 1 1 2.6 2.6h-2.6" />
            <path d="M12.5 19.5v2.6a2.6 2.6 0 1 1-2.6-2.6h2.6" />
            <path d="M19.5 19.5v2.6a2.6 2.6 0 1 0 2.6-2.6h-2.6" />
          </g>
        </svg>
        <div style={{ marginLeft: 32, fontSize: 88, fontWeight: 700 }}>{SITE.name}</div>
      </div>
      <div style={{ marginTop: 48, fontSize: 46, lineHeight: 1.3, color: '#c7d2fe' }}>
        {SITE.description}
      </div>
    </div>,
    { width: 1200, height: 630 },
  )
}
