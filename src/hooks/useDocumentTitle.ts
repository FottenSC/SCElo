import { useEffect, useRef } from 'react'

/**
 * Sets the document title with a consistent application prefix.
 * Usage: useDocumentTitle('Rankings') => 'OFC - Rankings'
 * Pass undefined/null/empty string to just set the base title.
 * Automatically restores previous title on unmount (useful for modals or temp states).
 */
export function useDocumentTitle(segment?: string | null, options?: { preserveOnUnmount?: boolean }) {
  const previousTitle = useRef<string | null>(null)
  const base = 'OFC'

  useEffect(() => {
    if (previousTitle.current === null) {
      previousTitle.current = document.title
    }
    const trimmed = segment?.trim()
    document.title = trimmed ? `${base} - ${trimmed}` : base

    return () => {
      if (!options?.preserveOnUnmount && previousTitle.current !== null) {
        // Do not overwrite if some other navigation already changed it
        // (only restore if current title matches what we set)
        const expected = trimmed ? `${base} - ${trimmed}` : base
        if (document.title === expected) {
          document.title = previousTitle.current
        }
      }
    }
  }, [segment, options?.preserveOnUnmount])
}
