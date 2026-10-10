import type { ReactNode } from 'react'
import type { RouteObject } from 'react-router'

function Page({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <>
      <h1>{title}</h1>
      {children ?? <p>Press ⌘K (Ctrl+K on Windows and Linux) to jump to another page.</p>}
    </>
  )
}

// scanRoutes() turns these into commands. `handle.command` sets the label, keywords
// and group; without it the label comes from the path.
export const pages: RouteObject[] = [
  {
    index: true,
    element: (
      <Page title="Home">
        <p>
          Press ⌘K (Ctrl+K on Windows and Linux), then type <kbd>invoices</kbd> or <kbd>people</kbd>
          . Every page here is a command, found from the route tree.
        </p>
      </Page>
    ),
    handle: { command: { label: 'Home', keywords: ['start', 'dashboard'], group: 'Pages' } },
  },
  {
    path: 'billing',
    element: <Page title="Billing" />,
    handle: {
      command: {
        label: 'Billing',
        description: 'Invoices and payment methods',
        keywords: ['invoices', 'payments'],
        group: 'Account',
      },
    },
  },
  {
    path: 'settings',
    element: <Page title="Settings" />,
    handle: { command: { keywords: ['preferences'], group: 'Account' } },
  },
  {
    path: 'team',
    element: <Page title="Team members" />,
    handle: { command: { label: 'Team members', keywords: ['people', 'invite'], group: 'Pages' } },
  },
  // Skipped by default: auth pages, and paths with a dynamic segment.
  { path: 'login', element: <Page title="Sign in" /> },
  { path: 'users/:id', element: <Page title="User" /> },
]
