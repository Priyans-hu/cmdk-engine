/** A small marker for features that the previous release does not have. */
export function Since({ version = '0.6' }: { version?: string }) {
  return (
    <span className="ml-2 inline-block rounded-full border border-accent/30 bg-accent-light px-2 py-0.5 align-middle text-[11px] font-medium text-accent dark:bg-indigo-950/50 dark:text-accent-dark">
      New in {version}
    </span>
  )
}
