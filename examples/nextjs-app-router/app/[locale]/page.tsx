export default function Home() {
  return (
    <>
      <h1>Home</h1>
      <p>
        Press ⌘K (Ctrl+K on Windows and Linux) and type <kbd>bill</kbd>. Every page under{' '}
        <code>app/[locale]</code> is a command: <code>cmdk-engine scan</code> finds them, and the
        palette fills in the current locale.
      </p>
    </>
  )
}
