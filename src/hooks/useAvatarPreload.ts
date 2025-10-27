import { useEffect, useRef } from 'react'

/**
 * Hook to preload images when they enter the viewport
 * Uses Intersection Observer API for efficient viewport detection
 * 
 * Usage:
 * ```tsx
 * const ref = useVisiblePreload();
 * <img ref={ref} src="..." />
 * ```
 */
export function useVisiblePreload() {
  const ref = useRef<HTMLImageElement>(null)

  useEffect(() => {
    if (!ref.current || !('IntersectionObserver' in window)) {
      return
    }

    const img = ref.current

    // Create an intersection observer to preload when visible
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && img.dataset.src && !img.src) {
            // Move data-src to src to trigger loading
            img.src = img.dataset.src
            observer.unobserve(img)
          }
        })
      },
      {
        rootMargin: '50px', // Start loading 50px before entering viewport
      }
    )

    observer.observe(img)

    return () => {
      observer.unobserve(img)
    }
  }, [])

  return ref
}

/**
 * Hook to preload a list of avatar URLs
 * Only preloads URLs for images that will soon be visible
 * 
 * Usage:
 * ```tsx
 * const playerAvatarUrls = players.map(p => getPlayerAvatarUrl(p.twitter, 48, p.name));
 * useAvatarPreload(playerAvatarUrls);
 * ```
 */
export function useAvatarPreload(urls: string[]) {
  useEffect(() => {
    if (!('IntersectionObserver' in window)) {
      return
    }

    // Create hidden container to hold preload images
    let container = document.getElementById('avatar-preload-container')
    if (!container) {
      container = document.createElement('div')
      container.id = 'avatar-preload-container'
      container.style.display = 'none'
      document.body.appendChild(container)
    }

    const images = new Map<string, HTMLImageElement>()

    urls.forEach((url) => {
      // Skip if already preloaded
      if (images.has(url)) return

      const img = document.createElement('img')
      img.src = url
      img.style.display = 'none'
      img.loading = 'lazy'
      container!.appendChild(img)
      images.set(url, img)
    })

    return () => {
      // Cleanup: remove unused images
      images.forEach((img, url) => {
        if (!urls.includes(url)) {
          img.remove()
          images.delete(url)
        }
      })
    }
  }, [urls])
}

/**
 * Hook for scroll-based avatar preloading on paginated/scrollable content
 * Preloads avatars visible in the current viewport + buffer zone
 * 
 * @param avatarUrls - Array of avatar URLs to preload
 * @param bufferItems - Number of items ahead to preload (default: 5)
 */
export function useScrollAwareAvatarPreload(avatarUrls: string[], bufferItems: number = 5) {
  useEffect(() => {
    // Determine which avatars are visible + buffer zone
    const itemHeight = 80 // Approximate item height in pixels
    const viewportHeight = window.innerHeight
    const visibleCount = Math.ceil(viewportHeight / itemHeight) + bufferItems
    
    const scrollTop = window.scrollY
    const firstVisibleIndex = Math.floor(scrollTop / itemHeight)
    const lastVisibleIndex = Math.min(
      firstVisibleIndex + visibleCount,
      avatarUrls.length - 1
    )
    
    // Preload visible avatars
    const urlsToPreload = avatarUrls.slice(firstVisibleIndex, lastVisibleIndex)
    
    // Simple preload by creating image elements
    urlsToPreload.forEach((url) => {
      const img = new Image()
      img.src = url
    })
  }, [avatarUrls, bufferItems])
}
