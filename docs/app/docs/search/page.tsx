import Link from 'next/link'
import { ApiTable } from '@/components/api-table'
import { CodeBlock } from '@/components/code-block'
import { Since } from '@/components/since'

export const metadata = { title: 'Search' }

export default function Search() {
  return (
    <>
      <h1>Search</h1>
      <p>
        cmdk-engine owns all filtering: the adapters turn off the UI library&apos;s own filter, and
        every result comes from one pipeline. This page covers how results are found and ranked, and
        how to change that.
      </p>

      <h2>The pipeline</h2>
      <p>
        Each time the query changes, the engine runs these steps over the commands at the current
        level:
      </p>
      <ol>
        <li>
          Remove commands whose <code>when</code> resolves to <code>false</code>.
        </li>
        <li>
          Remove commands the user&apos;s permissions do not allow (<code>accessControl</code>).
        </li>
        <li>
          Search with the built-in fuzzy search, match-sorter or your own engine, and add synonym
          matches.
        </li>
        <li>
          With a query, blend in frecency, then boost commands whose <code>scope</code> matches{' '}
          <code>context</code>. With an empty query, show the Recent group if it is enabled, and
          rank by frecency.
        </li>
        <li>
          Cut to <code>maxResults</code> (default 50) and group the results.
        </li>
      </ol>
      <p>
        Commands loaded from an async source take part in step 3 when its <code>shouldFilter</code>{' '}
        is true, the default. See <code>asyncSources</code> in the{' '}
        <Link href="/docs/api">API Reference</Link>.
      </p>

      <h2>Built-in search</h2>
      <p>
        <code>createFuzzySearch()</code> is the default engine. It scores a command against its
        label, keywords, description and synonyms, and keeps the best score. Each field has a
        weight:
      </p>
      <ApiTable
        head={['Field', 'Weight']}
        rows={[
          ['label', '1'],
          ['keywords', '0.85'],
          ['description', '0.7'],
          ['synonyms from config.synonyms', '0.55'],
        ]}
      />
      <p>
        Within a field, the kind of match sets the score. The examples search a command labelled
        &quot;Billing Settings&quot;:
      </p>
      <ApiTable
        head={['Match', 'Score', 'Example query']}
        rows={[
          ['Exact', '1', 'billing settings'],
          ['Prefix', '0.95', 'bill'],
          ['Substring', '0.8', 'settings'],
          ['Word initials', '0.7', 'bs'],
          ['Characters in order, with gaps', 'up to 0.6', 'biling'],
        ]}
      />
      <ul>
        <li>Matches that are too scattered score under 0.15 and are dropped.</li>
        <li>
          Results are ordered by score, then by <code>priority</code> (higher first).
        </li>
        <li>
          An empty query lists every command that is not <code>hidden</code>, ordered by{' '}
          <code>priority</code>. A <code>hidden</code> command is still found by a non-empty
          query.{' '}
        </li>{' '}
      </ul>

      <h3>
        Words in any order <Since />
      </h3>
      <p>
        The words of a query can match in any order, and each word can match a different field:
        &quot;overview billing&quot; finds &quot;Billing Overview&quot;, and &quot;invoices
        billing&quot; finds a &quot;Billing&quot; command with the keyword &quot;invoices&quot;.
        Every word has to match something, and a repeated word counts once. These matches come after
        the commands that match the whole query, which keep their order and scores, and never score
        above the weakest of them.
      </p>

      <h3>
        Accents, Unicode forms and spaces <Since />
      </h3>
      <p>
        The query and the commands are compared after Unicode compatibility decomposition (NFKD),
        with the combining accents U+0300 to U+036F removed, in lowercase, with repeated whitespace
        collapsed. So &quot;resume&quot; finds &quot;Résumé&quot;, a decomposed &quot;café&quot;
        finds a composed one, and <code>billing&nbsp; over</code> (two spaces) finds &quot;Billing
        Overview&quot;. Other marks (Indic vowel signs, kana voicing marks) are kept, ß and dotless
        ı are not folded, and the built-in search compares Korean by its letters (jamo), so a
        partial syllable already matches. ASCII text with single spaces scores as before, while
        ASCII text with repeated spaces, tabs or line breaks (a multi-line description, for example)
        now also matches across them. Pass your own <code>searchEngine</code> if you need
        accent-sensitive matching.
      </p>

      <h2>Synonyms</h2>
      <p>
        Synonyms work both ways. With this config, typing &quot;money&quot; or &quot;payment&quot;
        finds a command labelled &quot;Billing Overview&quot;:
      </p>
      <CodeBlock
        language="tsx"
        code={`const config = {
  synonyms: {
    billing: ['money', 'payment', 'credits'],
    settings: ['preferences', 'config', 'options'],
  },
}`}
      />
      <ul>
        <li>
          <strong>Query:</strong> when the whole query (ignoring case, accents and extra spaces)
          equals a key or a value, the other terms are searched too: a key brings its values, a
          value its key. Commands found only this way are listed after the direct matches and never
          score above the weakest one. Frecency and context boosts apply afterwards, so a command
          you use often can still move up.
        </li>
        <li>
          <strong>Commands:</strong> a command whose keyword or whole label equals a key or a value
          also matches the other terms, at a lower weight (with match-sorter, ranked at most
          CONTAINS).
        </li>
        <li>
          <strong>Not expanded:</strong> the query, while it is a partial word (&quot;mon&quot; is
          searched as typed until &quot;money&quot; is complete) or a longer phrase that contains a
          synonym (&quot;money transfer&quot;).
        </li>
      </ul>
      <p>
        When the query expands, a custom <code>searchEngine</code> is called once more for each
        extra term.
      </p>

      <h2>match-sorter</h2>
      <p>
        <code>cmdk-engine/search/match-sorter</code> swaps in{' '}
        <a href="https://github.com/kentcdodds/match-sorter">match-sorter</a>, which ranks by how
        closely a command matches. Install the optional peer <code>match-sorter</code> (7 or 8): the
        entry imports it directly, so it must be installed for this entry, and results do not change
        once it loads. Pass the engine in the provider config, and create it once, outside the
        component:
      </p>
      <CodeBlock
        language="tsx"
        code={`import { rankings } from 'match-sorter'
import { createMatchSorterSearch } from 'cmdk-engine/search/match-sorter'

const searchEngine = createMatchSorterSearch({
  threshold: rankings.CONTAINS, // the default also accepts scattered letters
  keys: ['meta.team'], // searched in addition to label, description and keywords
})

export const config = { searchEngine }`}
      />
      <ApiTable
        head={['Option', 'Default', 'Description']}
        rows={[
          [
            'threshold',
            "match-sorter's own",
            <>
              The lowest match quality to keep, from <code>rankings</code>. The default is{' '}
              <code>rankings.MATCHES</code>, so &quot;bng&quot; finds &quot;Billing&quot;; use{' '}
              <code>rankings.CONTAINS</code> to require the query as a substring.
            </>,
          ],
          [
            'keys',
            'none',
            <>
              Extra fields to search, as property paths such as <code>meta.team</code>. The label,
              description and keywords are always searched.
            </>,
          ],
        ]}
      />

      <ul>
        <li>
          The query&apos;s accents, Unicode forms and extra spaces are folded the same way as in the
          built-in search, but its case is kept: an exact-case match ranks first.
        </li>
        <li>
          A command also matches its synonym keywords, ranked at most CONTAINS so they stay below
          direct matches: &quot;prefer&quot; finds a &quot;Settings&quot; command with the synonym
          &quot;preferences&quot;. A <code>threshold</code> above CONTAINS leaves synonym matches
          out.
        </li>
        <li>
          Words in any order work too, appended after the whole-query matches. A keystroke with
          several words takes about 1.5 to 2 times as long as match-sorter alone on Node 22 and 2 to
          3 times on Node 20, the most for three or more words.
        </li>
        <li>
          match-sorter becomes part of the bundle that imports this entry, so import the entry
          lazily to keep it out of your main bundle. Server-side rendering loads it with the module.
          Without the package installed, the import fails at build or server start.
        </li>
      </ul>

      <h2>A custom engine</h2>
      <p>
        Any object with a <code>search(query, items)</code> method works. It receives the commands
        that passed the visibility and permission checks, and returns the matches as{' '}
        <code>ScoredItem</code> objects, best first, with scores from 0 to 1. The engine is also
        called for an empty query, which should return the browse list (leave out items with{' '}
        <code>hidden</code>). Any-order matching and accent folding belong to the built-in engine
        and the match-sorter entry; a custom engine decides for itself.
      </p>
      <CodeBlock
        language="tsx"
        code={`import type { SearchEngine } from 'cmdk-engine'

// Match labels that start with the query.
const prefixSearch: SearchEngine = {
  search(query, items) {
    const q = query.trim().toLowerCase()
    return items
      .filter((item) => (q ? item.label.toLowerCase().startsWith(q) : !item.hidden))
      .map((item) => ({ item, score: 1 }))
  },
}

// Define it once, outside the component: a new engine on every render rebuilds the pipeline.
export const config = { searchEngine: prefixSearch }`}
      />
    </>
  )
}
