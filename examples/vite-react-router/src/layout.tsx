import { useMemo } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router'
import type { CommandEngineConfig, CommandItem } from 'cmdk-engine'
import { CommandEngineProvider, useCommandRegister } from 'cmdk-engine/react'
import { scanRoutes } from 'cmdk-engine/adapters/react-router'
import { pages } from './pages'
import { Palette } from './palette'
import { BaseUiPalette } from './palette-base-ui'

// One command per page, read once from the route tree.
const routeCommands = scanRoutes([{ children: pages }])

// Commands that are not pages. `shortcut` is only displayed; `disabled` stays listed.
const appCommands: CommandItem[] = [
  {
    id: 'invite',
    label: 'Invite a teammate',
    description: 'Send an invite from the team page',
    keywords: ['people', 'add'],
    group: 'Actions',
    shortcut: ['G', 'I'],
    href: '/team',
  },
  {
    id: 'sso',
    label: 'Single Sign-On',
    description: 'Available on the Enterprise plan',
    group: 'Actions',
    disabled: true,
  },
]

// ?adapter=base-ui renders the same palette with the Base UI adapter.
const baseUi = new URLSearchParams(window.location.search).get('adapter') === 'base-ui'

function Commands() {
  useCommandRegister(routeCommands)
  useCommandRegister(appCommands)
  return null
}

export function Layout() {
  // The provider sits inside the router, so commands navigate without a page load.
  const navigate = useNavigate()
  const config = useMemo<CommandEngineConfig>(
    () => ({ onNavigate: (href) => navigate(href), frecency: { showRecent: true } }),
    [navigate],
  )

  return (
    <CommandEngineProvider config={config}>
      <Commands />
      {baseUi ? <BaseUiPalette /> : <Palette />}
      <header>
        <nav>
          <NavLink to="/">Home</NavLink>
          <NavLink to="/billing">Billing</NavLink>
          <NavLink to="/settings">Settings</NavLink>
          <NavLink to="/team">Team</NavLink>
        </nav>
        <a href={baseUi ? '?' : '?adapter=base-ui'}>
          Use the {baseUi ? 'cmdk' : 'Base UI'} adapter
        </a>
      </header>
      <main>
        <Outlet />
      </main>
    </CommandEngineProvider>
  )
}
