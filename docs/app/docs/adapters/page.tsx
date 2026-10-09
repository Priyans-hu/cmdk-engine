import { ApiTable } from '@/components/api-table'
import { CodeBlock } from '@/components/code-block'
import { Since } from '@/components/since'
import { SIZES } from '@/lib/sizes'

export const metadata = { title: 'Adapters' }

const PALETTE_PROPS: React.ReactNode[][] = [
  [
    'dialog',
    <code key="t">boolean</code>,
    <code key="d">false</code>,
    'Render in a modal dialog with an overlay. When false, the palette is inline and always visible. Open a dialog with useCommandPaletteShortcut() or toggle().',
  ],
  [
    'placeholder',
    <code key="t">string</code>,
    <code key="d">palette.placeholder</code>,
    'Input placeholder.',
  ],
  [
    'label',
    <code key="t">string</code>,
    <code key="d">palette.label</code>,
    'Accessible name of the palette and of the dialog.',
  ],
  [
    'loop',
    <code key="t">boolean</code>,
    <code key="d">true</code>,
    'Wrap from the last item to the first, and back.',
  ],
  [
    'onSelect',
    <code key="t">(item: CommandItem) =&gt; void</code>,
    'none',
    'Runs instead of the default handling (action, then onNavigate or href). Wins over config.onSelect.',
  ],
  [
    'renderItem',
    <code key="t">(item, score) =&gt; ReactNode</code>,
    'built-in row',
    'The row content. The adapter still renders the selectable wrapper.',
  ],
  [
    'renderGroupHeading',
    <code key="t">(group) =&gt; ReactNode</code>,
    'the group label',
    'The text of a group heading.',
  ],
  [
    'renderEmpty',
    <code key="t">() =&gt; ReactNode</code>,
    <code key="d">palette.empty</code>,
    'Shown when nothing matches.',
  ],
  [
    'renderLoading',
    <code key="t">() =&gt; ReactNode</code>,
    <code key="d">palette.loading</code>,
    'Shown while async sources load.',
  ],
  [
    'renderBreadcrumbs',
    <code key="t">(crumbs, onBack) =&gt; ReactNode</code>,
    'built-in trail',
    'Shown inside a sub-menu.',
  ],
  ['footer', <code key="t">ReactNode</code>, 'none', 'Rendered below the list.'],
  ['container', <code key="t">HTMLElement</code>, 'the page body', 'Portal target in dialog mode.'],
  [
    'disablePointerSelection',
    <code key="t">boolean</code>,
    <code key="d">false</code>,
    'The pointer no longer moves the highlight. Clicking an item still runs it.',
  ],
  [
    'vimBindings',
    <code key="t">boolean</code>,
    <code key="d">true</code>,
    'cmdk adapter only. Ctrl+N, P, J and K move the highlight.',
  ],
  [
    'className, inputClassName, listClassName, itemClassName, groupClassName, emptyClassName, overlayClassName, contentClassName',
    <code key="t">string</code>,
    'none',
    'Class names for each part. See the Styling page for which element each one reaches.',
  ],
]

export default function Adapters() {
  return (
    <>
      <h1>Adapters</h1>
      <p>
        The engine does the filtering, ranking and grouping. An adapter connects it to a UI library,
        or to a router. There are two UI adapters, for cmdk and Base UI, and one route adapter, for
        React Router. Each is its own entry point, so you only ship the ones you import.
      </p>

      <h2>cmdk adapter</h2>
      <p>
        <code>cmdk-engine/adapters/cmdk</code> renders the palette with{' '}
        <a href="https://github.com/dip/cmdk">cmdk</a> and turns off cmdk&apos;s own filter, so the
        engine owns all filtering and ordering. Install the peer <code>cmdk</code> (^1). It exports{' '}
        <code>CommandPalette</code> and <code>useCommandPaletteShortcut</code>, and it must be used
        inside a <code>CommandEngineProvider</code>.
      </p>
      <CodeBlock
        language="tsx"
        code={`import { CommandPalette, useCommandPaletteShortcut } from 'cmdk-engine/adapters/cmdk'

function CommandMenu() {
  useCommandPaletteShortcut() // Cmd+K / Ctrl+K
  return <CommandPalette dialog placeholder="Search commands..." />
}`}
      />
      <h3>
        <code>CommandPalette</code> props
      </h3>
      <p>
        Both UI adapters take the same props, except <code>vimBindings</code>. Every prop is
        optional.
      </p>
      <ApiTable head={['Prop', 'Type', 'Default', 'Description']} rows={PALETTE_PROPS} />
      <h3>
        <code>useCommandPaletteShortcut(shortcut = &apos;k&apos;)</code>
      </h3>
      <p>
        Toggles the palette when the user presses Cmd (macOS) or Ctrl plus the key, and returns{' '}
        <code>{'{ isOpen, toggle }'}</code>. Call it in a component inside the provider, not in the
        component that renders the provider.
      </p>

      <h2>
        Base UI adapter <Since />
      </h2>
      <p>
        <code>cmdk-engine/adapters/base-ui</code> renders the palette with Base UI&apos;s{' '}
        <a href="https://base-ui.com/react/components/autocomplete">Autocomplete</a> (with{' '}
        <code>mode=&quot;none&quot;</code>, so the engine still owns filtering and ranking) and,
        with <code>dialog</code>, its{' '}
        <a href="https://base-ui.com/react/components/dialog">Dialog</a>. Install the optional peer{' '}
        <code>@base-ui/react</code> (<code>^1.1.0</code>). It exports <code>CommandPalette</code>{' '}
        and <code>useCommandPaletteShortcut</code> with the cmdk adapter&apos;s props, so switching
        adapters is an import-path change:
      </p>
      <CodeBlock
        language="tsx"
        code={`import { CommandPalette, useCommandPaletteShortcut } from 'cmdk-engine/adapters/base-ui'

// Inline: always rendered
function SearchPanel() {
  return <CommandPalette placeholder="Search commands..." />
}

// Dialog: opened with Cmd+K / Ctrl+K
function CommandMenu() {
  useCommandPaletteShortcut()
  return <CommandPalette dialog overlayClassName="backdrop" contentClassName="palette" />
}`}
      />
      <p>
        The default renderers produce the same <code>data-cmdk-engine-*</code> markup as the cmdk
        adapter, so CSS written against those attributes carries over. cmdk&apos;s own{' '}
        <code>[cmdk-*]</code> attributes do not exist here: style the parts with the{' '}
        <code>*ClassName</code> props. Other differences:
      </p>
      <ApiTable
        head={['', 'cmdk adapter', 'Base UI adapter']}
        rows={[
          [
            'Vim keys',
            <>
              <code>vimBindings</code> (Ctrl+N/P/J/K)
            </>,
            'None; there is no vimBindings prop',
          ],
          ['Home / End', 'First / last item', 'Move the caret in the input'],
          [
            'Disabled items',
            'Skipped by the arrow keys',
            'Reachable by the arrow keys, and highlighted when first in the list; Enter and click do nothing',
          ],
          [
            'Highlighted item',
            <code key="a">[cmdk-item][data-selected=&quot;true&quot;]</code>,
            <code key="b">[role=&quot;option&quot;][data-highlighted]</code>,
          ],
          [
            'Loading row',
            <>
              <code>role=&quot;progressbar&quot;</code>, inside the list
            </>,
            <>
              <code>role=&quot;status&quot;</code> live region, after the list
            </>,
          ],
          [
            'Results change while open (async sources)',
            'Keeps the highlighted item',
            'Keeps the highlighted position',
          ],
          [
            'IME input',
            'The query updates while composing',
            'The query updates when composition ends',
          ],
        ]}
      />
      <p>
        Follow Base UI&apos;s{' '}
        <a href="https://base-ui.com/react/overview/quick-start">quick start</a>: give your
        app&apos;s root element <code>isolation: isolate</code> so the dialog stays on top, and for
        iOS 26+ Safari give the backdrop (<code>overlayClassName</code>){' '}
        <code>position: absolute</code> and add <code>{'body { position: relative }'}</code>. Like
        cmdk&apos;s, the dialog is unstyled. Its visually hidden close button is labelled by the{' '}
        <code>palette.close</code> translation key.
      </p>
      <p>
        Base UI costs more than cmdk: about {SIZES.baseUiAutocomplete} min + brotli for Autocomplete
        and {SIZES.baseUiWithDialog} with Dialog, versus about {SIZES.cmdkWithRadixDialog} for cmdk
        with its Radix dialog. In Node, load the adapter with either <code>import</code> or{' '}
        <code>require</code>, not both, or two copies of <code>@base-ui/react</code> run side by
        side; bundlers load one.
      </p>

      <h2>React Router adapter</h2>
      <p>
        <code>cmdk-engine/adapters/react-router</code> turns a React Router route tree into
        commands. It accepts the route types of React Router 6, 7 and 8, and your own route
        interfaces, without a cast. It reads the routes you pass in and never calls{' '}
        <code>lazy()</code>.
      </p>
      <h3>
        <code>scanRoutes(routes, options?)</code>
      </h3>
      <CodeBlock
        language="tsx"
        code={`import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { CommandEngineProvider, useCommandRegister } from 'cmdk-engine/react'
import { scanRoutes } from 'cmdk-engine/adapters/react-router'

const routes = [
  { path: '/', element: <h1>Home</h1> },
  {
    path: '/billing',
    element: <h1>Billing</h1>,
    handle: { command: { label: 'Billing Dashboard', keywords: ['money', 'payment'] } },
  },
]
const router = createBrowserRouter(routes)
const commands = scanRoutes(routes, { exclude: ['/admin/*'] })
const config = { onNavigate: (href: string) => router.navigate(href) }

function RegisterRoutes() {
  useCommandRegister(commands)
  return null
}

export function App() {
  return (
    <CommandEngineProvider config={config}>
      <RegisterRoutes />
      <RouterProvider router={router} />
    </CommandEngineProvider>
  )
}`}
      />
      <p>
        On React Router 8 there is no <code>react-router-dom</code>: import{' '}
        <code>createBrowserRouter</code> from <code>react-router</code> and{' '}
        <code>RouterProvider</code> from <code>react-router/dom</code>.
      </p>
      <ApiTable
        head={['Option', 'Default', 'Description']}
        rows={[
          [
            'exclude',
            '[]',
            <>
              Paths to leave out, in addition to the defaults. Each entry is an exact string, a glob
              ending in <code>/*</code> such as <code>/admin/*</code>, or a RegExp.
            </>,
          ],
          [
            'noDefaultExclude',
            <code key="d">false</code>,
            'Set true to skip the default exclude list.',
          ],
          [
            'includeDynamic',
            <code key="d">false</code>,
            <>
              Include routes with a dynamic segment (<code>:id</code>, <code>[id]</code> or{' '}
              <code>*</code>). They are skipped by default, because a command cannot navigate
              without a real value. A route with <code>handle.command</code> is always included.
            </>,
          ],
        ]}
      />
      <h3>What it derives</h3>
      <ul>
        <li>
          <strong>Id:</strong> the path with <code>/</code> as <code>--</code>, so{' '}
          <code>/billing/overview</code> is <code>billing--overview</code> and <code>/</code> is{' '}
          <code>home</code>. Ids are the frecency keys, so keep a route&apos;s path stable.
        </li>
        <li>
          <strong>Label:</strong> from the last segment, so <code>/billing/overview</code> is
          &quot;Overview&quot; and <code>/</code> is &quot;Home&quot;.
        </li>
        <li>
          <strong>Group:</strong> from the first segment when the path has two or more, so{' '}
          <code>/billing/overview</code> is in &quot;Billing&quot;. A one-segment path has no group.
        </li>
        <li>
          <strong>Default excludes:</strong> auth routes (<code>/login</code>, <code>/logout</code>,{' '}
          <code>/signin</code>, <code>/signout</code>, <code>/signup</code>, <code>/register</code>,{' '}
          <code>/forgot-password</code>, <code>/reset-password</code>, <code>/verify-email</code>),
          callbacks (<code>/oauth/callback</code>, <code>/auth/callback</code>,{' '}
          <code>/callback</code>), and the error pages <code>/404</code>, <code>/500</code>,{' '}
          <code>/error</code> and <code>/not-found</code>.
        </li>
      </ul>
      <h3>
        Route metadata{' '}
        <span className="font-normal text-[var(--text-muted)]">(handle.command)</span>
      </h3>
      <p>
        Put <code>handle.command</code> on the route object to enrich its command. The scanner also
        falls back to <code>route.title</code> and <code>route.icon</code>. A <code>handle</code>{' '}
        returned from <code>lazy()</code> is not read.
      </p>
      <ApiTable
        head={['Field', 'Description']}
        rows={[
          ['label', 'Display label. Falls back to the path-derived label.'],
          ['description', 'Secondary text, also searched.'],
          ['keywords', 'Extra search terms.'],
          ['group', 'Group id or heading.'],
          ['icon', 'A string, emoji or React element.'],
          ['permissions', 'Permissions required to see the command.'],
          ['priority', 'Ordering weight, higher first.'],
          ['hidden', 'Keep it out of the browse list but still searchable.'],
        ]}
      />
      <h3>
        Index routes <Since />
      </h3>
      <p>
        An index route (<code>index: true</code> without a <code>path</code>) resolves to its
        parent&apos;s URL, so the index route of a pathless root becomes <code>/</code> (label
        &quot;Home&quot;, id <code>home</code>). It never adds a second command for a URL another
        route already has: its <code>handle.command</code> is merged over that command instead, and
        the index route&apos;s fields win. Only <code>handle.command</code> is merged; an index
        route&apos;s <code>route.title</code> and <code>route.icon</code> apply only when it gets
        its own command. Index routes follow their parent&apos;s exclusion and the dynamic-route
        rule. <code>index: true</code> with a <code>path</code> is a normal path route.
      </p>
    </>
  )
}
