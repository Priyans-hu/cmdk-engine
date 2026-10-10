import Link from 'next/link'
import { ApiTable } from '@/components/api-table'
import { CodeBlock } from '@/components/code-block'

export const metadata = { title: 'Styling' }

const STARTER_CSS = `[cmdk-overlay] { position: fixed; inset: 0; z-index: 50; background: rgb(0 0 0 / 0.4); }
[cmdk-dialog] {
  position: fixed; top: 15vh; left: 50%; z-index: 50; transform: translateX(-50%);
  width: min(560px, calc(100vw - 32px));
}
[cmdk-root] {
  overflow: hidden; border: 1px solid #e5e7eb; border-radius: 12px;
  background: #fff; color: #111827; font: 14px/1.4 system-ui, sans-serif;
  box-shadow: 0 16px 48px rgb(0 0 0 / 0.2);
}
[cmdk-input] {
  box-sizing: border-box; width: 100%; padding: 14px 16px; border: 0;
  border-bottom: 1px solid #e5e7eb; font: inherit; font-size: 16px; outline: none;
}
[cmdk-input]:focus-visible { border-bottom-color: #6366f1; box-shadow: inset 0 -1px 0 #6366f1; }
[cmdk-list] { max-height: 320px; overflow-y: auto; padding: 8px; }
[cmdk-group-heading] { padding: 8px 8px 4px; font-size: 12px; color: #6b7280; }
[cmdk-item] { padding: 8px; border-radius: 8px; cursor: pointer; }
[cmdk-item][data-selected='true'] { background: #f3f4f6; }
[cmdk-item][data-disabled='true'] { opacity: 0.5; cursor: default; }
[data-cmdk-engine-item] { display: flex; align-items: center; gap: 8px; }
[data-cmdk-engine-item-content] { display: flex; flex: 1; flex-direction: column; }
[data-cmdk-engine-item-description] { font-size: 12px; color: #6b7280; }
[data-cmdk-engine-item-shortcut] kbd {
  margin-left: 4px; padding: 0 6px; border: 1px solid #e5e7eb; border-radius: 4px;
  font: inherit; font-size: 12px;
}
[data-cmdk-engine-empty],
[data-cmdk-engine-loading] { padding: 16px; text-align: center; color: #6b7280; }`

const TAILWIND_CSS = `[cmdk-overlay] { @apply fixed inset-0 z-50 bg-black/40; }
[cmdk-dialog] { @apply fixed left-1/2 top-[15vh] z-50 w-[min(560px,calc(100vw-32px))] -translate-x-1/2; }
[cmdk-root] { @apply overflow-hidden rounded-xl border border-gray-200 bg-white text-sm text-gray-900 shadow-2xl; }
[cmdk-input] { @apply w-full border-0 border-b border-gray-200 px-4 py-3.5 text-base outline-none focus-visible:border-indigo-500 focus-visible:shadow-[inset_0_-1px_0_#6366f1]; }
[cmdk-list] { @apply max-h-80 overflow-y-auto p-2; }
[cmdk-group-heading] { @apply px-2 pb-1 pt-2 text-xs text-gray-500; }
[cmdk-item] { @apply cursor-pointer rounded-lg p-2 data-[selected=true]:bg-gray-100 data-[disabled=true]:opacity-50; }
[data-cmdk-engine-item] { @apply flex items-center gap-2; }
[data-cmdk-engine-item-content] { @apply flex flex-1 flex-col; }
[data-cmdk-engine-item-description] { @apply text-xs text-gray-500; }
[data-cmdk-engine-item-shortcut] kbd { @apply ml-1 rounded border border-gray-200 px-1.5 font-sans text-xs; }
[data-cmdk-engine-empty], [data-cmdk-engine-loading] { @apply p-4 text-center text-gray-500; }`

export default function Styling() {
  return (
    <>
      <h1>Styling</h1>
      <p>
        <code>CommandPalette</code> ships no styles. Style cmdk&apos;s <code>[cmdk-*]</code> parts
        and the adapter&apos;s <code>data-cmdk-engine-*</code> attributes from any global
        stylesheet. The Base UI adapter has no <code>[cmdk-*]</code> attributes: style its parts
        with the <code>*ClassName</code> props and the attributes below.
      </p>

      <h2>Starter stylesheet</h2>
      <p>
        This CSS gives a centered dialog on a dimmed overlay. It is written for the cmdk adapter
        with <code>dialog</code>:
      </p>
      <CodeBlock language="css" filename="palette.css" code={STARTER_CSS} />
      <p>
        The accent underline on <code>[cmdk-input]:focus-visible</code> replaces the outline the
        input drops, so keyboard users can see where focus is. Keep a focus style if you restyle the
        input.
      </p>

      <h2>With Tailwind</h2>
      <p>
        With Tailwind (v3 or v4), <code>@apply</code> the same utilities to the same selectors in
        your main CSS file:
      </p>
      <CodeBlock language="css" code={TAILWIND_CSS} />

      <h2>Class name props</h2>
      <p>To style per instance instead, pass class names. They reach these parts:</p>
      <ApiTable
        head={['Prop', 'cmdk adapter', 'Base UI adapter']}
        rows={[
          [
            'className',
            <code key="a">[cmdk-root]</code>,
            'A wrapper div around the breadcrumbs, input, list and footer',
          ],
          ['inputClassName', <code key="a">[cmdk-input]</code>, 'The input'],
          ['listClassName', <code key="a">[cmdk-list]</code>, 'The list'],
          ['itemClassName', <code key="a">[cmdk-item]</code>, 'Each option'],
          ['groupClassName', <code key="a">[cmdk-group]</code>, 'Each group'],
          [
            'emptyClassName',
            <code key="a">[cmdk-empty]</code>,
            'The empty-state element, only while it shows',
          ],
          ['overlayClassName', <code key="a">[cmdk-overlay]</code>, 'The dialog backdrop'],
          ['contentClassName', <code key="a">[cmdk-dialog]</code>, 'The dialog popup'],
        ]}
      />

      <h2>Item states</h2>
      <ApiTable
        head={['State', 'cmdk adapter', 'Base UI adapter']}
        rows={[
          [
            'Highlighted item',
            <code key="a">[cmdk-item][data-selected=&quot;true&quot;]</code>,
            <code key="b">[role=&quot;option&quot;][data-highlighted]</code>,
          ],
          [
            'Disabled item',
            <code key="a">[cmdk-item][data-disabled=&quot;true&quot;]</code>,
            <code key="b">[role=&quot;option&quot;][data-disabled]</code>,
          ],
        ]}
      />

      <h2>Markup inside each item</h2>
      <p>
        Both adapters render the same default markup inside each item, so CSS written against these
        attributes carries over when you switch adapters:
      </p>
      <ApiTable
        head={['Attribute', 'Element']}
        rows={[
          ['data-cmdk-engine-item', 'The wrapper for one row'],
          ['data-cmdk-engine-icon', 'The icon (hidden from assistive technology)'],
          ['data-cmdk-engine-item-content', 'Wraps the label and the description'],
          ['data-cmdk-engine-item-label', 'The label'],
          ['data-cmdk-engine-item-description', 'The description'],
          ['data-cmdk-engine-item-shortcut', 'The shortcut keys, each one a <kbd>'],
          ['data-cmdk-engine-item-chevron', 'The chevron on an item that has children'],
          ['data-cmdk-engine-empty', 'The "no results" text'],
          ['data-cmdk-engine-loading', 'The loading text while async sources load'],
          ['data-cmdk-engine-breadcrumbs', 'The trail shown inside a sub-menu'],
          ['data-cmdk-engine-breadcrumb-back', 'The back button in the trail'],
          ['data-cmdk-engine-breadcrumb', 'One crumb in the trail'],
          ['data-cmdk-engine-breadcrumb-separator', 'The separator between crumbs'],
        ]}
      />
      <p>
        The cmdk adapter renders the empty state and the loading row right after the results list,
        not inside it, because a list box may only hold groups and options. Style them with{' '}
        <code>[cmdk-empty]</code> and <code>[cmdk-loading]</code> (or the{' '}
        <code>data-cmdk-engine-*</code> attributes above) directly, not as list descendants such as{' '}
        <code>[cmdk-list] [cmdk-empty]</code>. The Base UI adapter already worked this way.
      </p>
      <p>
        cmdk documents its parts in{' '}
        <a href="https://github.com/dip/cmdk#parts-and-styling">Parts and styling</a> and has{' '}
        <a href="https://github.com/dip/cmdk/tree/main/website/styles/cmdk">drop-in stylesheets</a>.
        For the Base UI adapter, see its notes on the <Link href="/docs/adapters">Adapters</Link>{' '}
        page.
      </p>
    </>
  )
}
