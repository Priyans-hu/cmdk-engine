import Link from 'next/link'
import { ApiTable } from '@/components/api-table'
import { CodeBlock } from '@/components/code-block'

export const metadata = { title: 'Nested Commands and Groups' }

export default function NestedCommands() {
  return (
    <>
      <h1>Nested Commands and Groups</h1>
      <p>
        Two ways to organize a long command list: sub-menus, where selecting a command opens its
        children, and groups, which put commands under headings.
      </p>

      <h2>Nested commands</h2>
      <p>
        Give a command <code>children</code> to make a sub-menu. Selecting it opens its children
        instead of running it:
      </p>
      <CodeBlock
        language="tsx"
        code={`import { useCommandRegister } from 'cmdk-engine/react'

const setTheme = (theme: string) => document.documentElement.setAttribute('data-theme', theme)

function ThemeCommands() {
  useCommandRegister([
    {
      id: 'theme',
      label: 'Change theme',
      children: [
        { id: 'theme-light', label: 'Light', action: () => setTheme('light') },
        { id: 'theme-dark', label: 'Dark', action: () => setTheme('dark') },
      ],
    },
  ])
  return null
}`}
      />
      <ul>
        <li>
          A command with children never runs its own <code>action</code> or <code>href</code>, and{' '}
          <code>onSelect</code> is not called for it. An empty <code>children</code> array counts as
          a leaf.
        </li>
        <li>
          The palette lists only the children, and search covers only that level. <code>when</code>,{' '}
          <code>permissions</code> and <code>hidden</code> apply to them as at the root.
        </li>
        <li>
          Backspace in an empty input, or the back button in the breadcrumbs, goes up one level.
          Closing the palette returns to the root.
        </li>
        <li>
          Opening a sub-menu is not recorded in frecency or search history; running a child is.
        </li>
        <li>
          Async sources load at the root level only, and their loads are cancelled when you drill
          in.
        </li>
        <li>Children can have children, to any depth. Each level adds a crumb to the trail.</li>
      </ul>

      <h3>Breadcrumbs and custom UIs</h3>
      <p>
        Both adapters show a breadcrumb trail inside a sub-menu and a chevron on commands that have
        children. Replace the trail with <code>renderBreadcrumbs(crumbs, onBack)</code>, and style
        the default one with <code>data-cmdk-engine-breadcrumbs</code> and the other attributes on
        the <Link href="/docs/styling">Styling</Link> page. If you build your own UI,{' '}
        <code>useCommandPalette()</code> returns the state and the controls:
      </p>
      <ApiTable
        head={['Member', 'Description']}
        rows={[
          [
            'breadcrumbs',
            <>
              The commands you drilled through, outermost first (<code>CommandItem[]</code>).
            </>,
          ],
          ['depth', '0 at the root, 1 inside the first sub-menu, and so on.'],
          ['drillDown(item)', 'Open the children of a command. Does nothing if it has none.'],
          ['drillUp()', 'Go up one level. Also clears the search box.'],
          ['resetPath()', 'Go back to the root. Also clears the search box.'],
        ]}
      />
      <CodeBlock
        language="tsx"
        code={`import { useCommandPalette } from 'cmdk-engine/react'

function MenuTrail() {
  const { breadcrumbs, drillUp, resetPath } = useCommandPalette()
  if (breadcrumbs.length === 0) return null
  return (
    <nav aria-label="Sub-menu">
      <button onClick={resetPath}>All commands</button>
      {breadcrumbs.map((crumb) => (
        <span key={crumb.id}> / {crumb.label}</span>
      ))}
      <button onClick={drillUp}>Back</button>
    </nav>
  )
}`}
      />

      <h2>Groups</h2>
      <p>
        A command&apos;s <code>group</code> string puts it under a heading. Without any config, each
        distinct <code>group</code> becomes a heading with the same text, and commands without a{' '}
        <code>group</code> go under &quot;Other&quot;, always last. Set <code>groups</code> in the
        provider config to choose labels and order:
      </p>
      <CodeBlock
        language="tsx"
        code={`import { CommandEngineProvider, useCommandRegister } from 'cmdk-engine/react'

const config = {
  groups: [
    { id: 'navigation', label: 'Go to', priority: 10 },
    { id: 'actions', label: 'Actions', priority: 5 },
  ],
}

function Commands() {
  useCommandRegister([
    { id: 'home', label: 'Home', href: '/', group: 'navigation' },
    { id: 'invite', label: 'Invite teammate', action: () => {}, group: 'actions' },
  ])
  return null
}

export function Root({ children }: { children: React.ReactNode }) {
  return (
    <CommandEngineProvider config={config}>
      <Commands />
      {children}
    </CommandEngineProvider>
  )
}`}
      />
      <ApiTable
        head={['CommandGroup field', 'Description']}
        rows={[
          [
            'id',
            <>
              Matches the <code>group</code> string on commands.
            </>,
          ],
          ['label', 'The heading text.'],
          ['priority', 'Optional. Higher groups are listed first when the query is empty.'],
          [
            'icon',
            <>
              Optional. The built-in components do not render it;{' '}
              <code>renderGroupHeading(group)</code> receives it.
            </>,
          ],
        ]}
      />
      <ul>
        <li>
          A <code>group</code> you did not define still shows, labelled with the <code>group</code>{' '}
          string.
        </li>
        <li>
          With an empty query, defined groups are listed by <code>priority</code> (higher first),
          then the other groups in the order their first command appears. While searching, groups
          are ordered by their best match instead.
        </li>
        <li>
          Inside a group, commands are ordered by score. <code>maxResults</code> (default 50) caps
          the total number of results across groups.
        </li>
        <li>
          The Recent group (<code>frecency.showRecent</code>) is a group like any other, labelled
          with <code>frecency.recentLabel</code>.
        </li>
      </ul>
    </>
  )
}
