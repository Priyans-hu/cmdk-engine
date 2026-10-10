import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CommandEngineProvider } from 'cmdk-engine/react'

import './index.css'
import App from './App'
import { ThemeProvider } from '@/components/theme-provider'

// Define config once, outside components. The commands here only link out.
const config = {
  onNavigate: (href: string) => window.open(href, '_blank', 'noopener,noreferrer'),
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <CommandEngineProvider config={config}>
        <App />
      </CommandEngineProvider>
    </ThemeProvider>
  </StrictMode>,
)
