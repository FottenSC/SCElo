/**
 * Utility functions for player avatars
 */

// Cache for avatar URLs to avoid regenerating the same URL
const avatarUrlCache = new Map<string, string>()

/**
 * Get the avatar URL for a player with performance optimizations
 * Uses Unavatar service to fetch Twitter profile pictures
 * Falls back to a unique avatar based on player name if no Twitter handle provided
 * 
 * Optimizations:
 * - URL caching to avoid repeated string operations
 * - Smaller image size parameter (48px) for faster loading
 * - Fallback parameter to speed up failed lookups
 * - Unique fallback avatars seeded by player name
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
  
  // Remove @ symbol if present
  const username = twitter.startsWith('@') ? twitter.slice(1) : twitter
  
  // Use Unavatar service with optimizations:
  // - Size parameter to request smaller images
  // - Fallback=false to fail fast if user doesn't exist
  const url = `https://unavatar.io/twitter/${username}?size=${size}&fallback=false`
  
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
 * Clear the avatar URL cache
 * Useful for testing or when users update their Twitter handles
 */
export function clearAvatarCache(): void {
  avatarUrlCache.clear()
}
