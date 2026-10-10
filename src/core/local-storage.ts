/**
 * `window.localStorage`, or `undefined` when there is no window, the property is
 * missing or null, or reading it throws (sandboxed iframes, blocked cookies).
 * Always read through `window`: on Node 25+ the bare `localStorage` global is
 * Node's own, not the one a test DOM such as jsdom provides.
 */
export function getLocalStorage(): Storage | undefined {
  try {
    return (typeof window !== 'undefined' && window.localStorage) || undefined
  } catch {
    return undefined
  }
}
