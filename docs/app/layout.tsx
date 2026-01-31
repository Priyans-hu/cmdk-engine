import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'cmdk-engine — Smart Command Palette Engine for React',
    template: '%s | cmdk-engine',
  },
  description: 'The smart command palette engine for React. Built on cmdk. Auto-discover routes, fuzzy search with synonyms, RBAC filtering, frecency ranking, CLI tooling — all in < 5KB.',
  keywords: ['command palette', 'cmdk', 'react', 'cmd-k', 'ctrl-k', 'fuzzy search', 'command menu', 'keyboard shortcuts'],
  openGraph: {
    title: 'cmdk-engine',
    description: 'The smart command palette engine for React',
    url: 'https://priyans-hu.github.io/cmdk-engine',
    siteName: 'cmdk-engine',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'cmdk-engine',
    description: 'The smart command palette engine for React',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('cmdk-engine-theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="font-sans antialiased min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-200">
        <ThemeProvider>
          <Navbar />
          <div className="flex-1">
            {children}
          </div>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  )
}
