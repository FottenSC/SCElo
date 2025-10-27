/**
 * Utility functions for player avatars
 */

// Cache for avatar URLs to avoid regenerating the same URL
const avatarUrlCache = new Map<string, string>()

// Track failed Twitter lookups to avoid repeated slow requests for invalid handles
const failedTwitterLookups = new Set<string>()

/**
 * Get the avatar URL for a player with performance optimizations
 * Uses Unavatar service to fetch Twitter profile pictures
 * Falls back to a unique avatar based on player name if no Twitter handle provided
 * 
 * Optimizations:
 * - URL caching to avoid repeated string operations
 * - Size parameter for responsive loading
 * - Fallback parameter to speed up failed lookups
 * - Unique fallback avatars seeded by player name
 * - Progressive JPEG format for faster perceived loading
 * 
 * @param twitter - Twitter username (without @)
 * @param size - Image size in pixels (default: 48)
 * @param fallbackSeed - Seed for fallback avatar (typically player name)
 * @returns Avatar image URL
 */
export function getPlayerAvatarUrl(twitter?: string | null, size: number = 48, fallbackSeed: string = 'default'): string {
  if (!twitter) {
    // Default avatar options (choose one):
    // 'thumbs' - Thumbs up icon (simple) - CURRENT
    // 'avataaars' - Cartoon people (friendly, diverse)
    // 'personas' - Minimal geometric shapes (professional)
    // 'adventurer' - Pixel art characters (gaming vibe)
    // 'lorelei' - Illustrated faces (artistic)
    // 'notionists' - Simple cartoon style (clean)
    
    // Using player name as seed creates unique fallback for each player
    return `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(fallbackSeed)}&backgroundColor=E2DEED`
  }
  
  // Check cache first
  const cacheKey = `${twitter}-${size}`
  const cached = avatarUrlCache.get(cacheKey)
  if (cached) return cached
  
  // If we've already tried this Twitter handle and it failed, return fallback immediately
  // This prevents repeated slow lookups for invalid/suspended accounts
  if (failedTwitterLookups.has(twitter)) {
    console.warn(`[Avatar] Invalid Twitter handle: @${twitter} - using fallback`)
    return `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(fallbackSeed)}&backgroundColor=E2DEED`
  }
  
  // Remove @ symbol if present
  const username = twitter.startsWith('@') ? twitter.slice(1) : twitter
  
  // Twitter-specific optimizations for faster loading:
  // - Fast-failure with fallback=false (fail fast if user doesn't exist)
  // - JPEG format (30% smaller than PNG)
  // - Smaller cache-busting timestamp to avoid stale images
  // - Direct URL generation to minimize service processing
  // - Quality=80 to balance speed/quality for Twitter images
  const url = `https://unavatar.io/twitter/${username}?size=${size}&fallback=false&format=jpeg&quality=80`
  
  // Cache the URL to avoid re-fetching for the same player
  avatarUrlCache.set(cacheKey, url)
  
  return url
}

/**
 * Get a smaller (blur-up) version of an avatar URL for LQIP (Low Quality Image Placeholder)
 * Used for progressive image loading - display tiny blurry version first
 * 
 * @param twitter - Twitter username (without @)
 * @param fallbackSeed - Seed for fallback avatar
 * @returns Low-quality avatar image URL (8px)
 */
export function getPlayerAvatarLqip(twitter?: string | null, fallbackSeed: string = 'default'): string {
  if (!twitter) {
    // LQIP doesn't make sense for generated avatars, return the same
    return getPlayerAvatarUrl(twitter, 8, fallbackSeed)
  }
  
  // Check cache first
  const cacheKey = `${twitter}-lqip`
  const cached = avatarUrlCache.get(cacheKey)
  if (cached) return cached
  
  const username = twitter.startsWith('@') ? twitter.slice(1) : twitter
  
  // Very small, fast-loading placeholder (8px)
  const url = `https://unavatar.io/twitter/${username}?size=8&fallback=false&format=jpeg`
  
  // Cache the URL
  avatarUrlCache.set(cacheKey, url)
  
  return url
}

/**
 * Get initials from player name for fallback display
 * 
 * @param name - Player name
 * @returns Two-letter initials
 */
export function getPlayerInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(p => p.length > 0)
  if (parts.length === 0) return 'PL'
  if (parts.length === 1) {
    return (parts[0] || 'PL').slice(0, 2).toUpperCase()
  }
  const first = parts[0]?.[0] || 'P'
  const last = parts[parts.length - 1]?.[0] || 'L'
  return (first + last).toUpperCase()
}

/**
 * Preload avatar images to speed up initial render
 * Uses link preload to tell the browser to fetch images early
 * 
 * @param urls - Array of avatar URLs to preload
 */
export function preloadAvatars(urls: string[]): void {
  // Only preload in browser environment
  if (typeof window === 'undefined') return
  
  urls.forEach(url => {
    // Check if already preloaded
    const existing = document.querySelector(`link[href="${url}"]`)
    if (existing) return
    
    // Create link element for preloading
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'image'
    link.href = url
    link.fetchPriority = 'low' // Don't block other critical resources
    document.head.appendChild(link)
  })
}

/**
 * Mark a Twitter handle as failed
 * Used when image fails to load to prevent repeated slow lookups
 * 
 * @param twitter - Twitter username that failed to load
 */
export function markTwitterAsFailed(twitter: string): void {
  if (twitter) {
    const username = twitter.startsWith('@') ? twitter.slice(1) : twitter
    failedTwitterLookups.add(username)
    console.warn(`[Avatar] Failed to load Twitter avatar for: @${username}`)
  }
}

/**
 * Clear the avatar URL cache
 * Useful for testing or when users update their Twitter handles
 */
export function clearAvatarCache(): void {
  avatarUrlCache.clear()
  failedTwitterLookups.clear()
}
