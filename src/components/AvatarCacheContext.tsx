import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '@/supabase/client'
import { getPlayerAvatarUrl } from '@/lib/avatar'

interface AvatarCacheContextType {
    /** Map of twitter handle to cached blob URL */
    avatarCache: Map<string, string>
    /** Check if an avatar is cached */
    isCached: (twitter: string) => boolean
    /** Get cached avatar URL (returns blob URL if cached, otherwise original URL) */
    getCachedUrl: (twitter: string | null | undefined, size?: number) => string | null
    /** Whether initial preloading is complete */
    isPreloaded: boolean
    /** Force refresh a specific avatar */
    refreshAvatar: (twitter: string) => void
}

const AvatarCacheContext = createContext<AvatarCacheContextType | null>(null)

export function useAvatarCache() {
    const context = useContext(AvatarCacheContext)
    if (!context) {
        throw new Error('useAvatarCache must be used within an AvatarCacheProvider')
    }
    return context
}

// Global cache that persists across component mounts
const globalAvatarCache = new Map<string, string>()
const loadingPromises = new Map<string, Promise<string | null>>()

async function preloadAvatar(twitter: string, size: number = 96): Promise<string | null> {
    const cacheKey = twitter.toLowerCase()

    // Return cached blob URL if exists
    if (globalAvatarCache.has(cacheKey)) {
        return globalAvatarCache.get(cacheKey)!
    }

    // Return existing promise if already loading
    if (loadingPromises.has(cacheKey)) {
        return loadingPromises.get(cacheKey)!
    }

    const url = getPlayerAvatarUrl(twitter, size)
    if (!url) return null

    const loadPromise = new Promise<string | null>((resolve) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'

        img.onload = () => {
            // Store the URL in cache (browser will have cached the image data)
            globalAvatarCache.set(cacheKey, url)
            loadingPromises.delete(cacheKey)
            resolve(url)
        }

        img.onerror = () => {
            loadingPromises.delete(cacheKey)
            resolve(null)
        }

        img.src = url
    })

    loadingPromises.set(cacheKey, loadPromise)
    return loadPromise
}

interface AvatarCacheProviderProps {
    children: React.ReactNode
}

export function AvatarCacheProvider({ children }: AvatarCacheProviderProps) {
    const [avatarCache, setAvatarCache] = useState<Map<string, string>>(globalAvatarCache)
    const [isPreloaded, setIsPreloaded] = useState(false)

    // Preload all player avatars on mount
    useEffect(() => {
        let cancelled = false

        async function preloadAllAvatars() {
            try {
                // Fetch all players with twitter handles
                const { data: players, error } = await supabase
                    .from('players')
                    .select('twitter')
                    .not('twitter', 'is', null)

                if (error || !players || cancelled) return

                // Filter to unique twitter handles
                const twitterHandles = [...new Set(
                    players
                        .map(p => p.twitter)
                        .filter((t): t is string => !!t)
                )]

                // Preload in batches to avoid overwhelming the network
                const BATCH_SIZE = 5
                const BATCH_DELAY = 100

                for (let i = 0; i < twitterHandles.length; i += BATCH_SIZE) {
                    if (cancelled) break

                    const batch = twitterHandles.slice(i, i + BATCH_SIZE)
                    await Promise.all(batch.map(twitter => preloadAvatar(twitter)))

                    // Update state periodically to show progress
                    if (!cancelled) {
                        setAvatarCache(new Map(globalAvatarCache))
                    }

                    // Small delay between batches
                    if (i + BATCH_SIZE < twitterHandles.length) {
                        await new Promise(r => setTimeout(r, BATCH_DELAY))
                    }
                }

                if (!cancelled) {
                    setIsPreloaded(true)
                }
            } catch (err) {
                console.warn('Failed to preload avatars:', err)
                if (!cancelled) {
                    setIsPreloaded(true)
                }
            }
        }

        preloadAllAvatars()

        return () => {
            cancelled = true
        }
    }, [])

    const isCached = useCallback((twitter: string) => {
        return globalAvatarCache.has(twitter.toLowerCase())
    }, [])

    const getCachedUrl = useCallback((twitter: string | null | undefined, size: number = 96): string | null => {
        if (!twitter) return null

        const cacheKey = twitter.toLowerCase()

        // If cached, return the cached URL
        if (globalAvatarCache.has(cacheKey)) {
            return globalAvatarCache.get(cacheKey)!
        }

        // Otherwise trigger a preload and return the original URL
        preloadAvatar(twitter, size).then(() => {
            // This will update the cache for future use
        })

        return getPlayerAvatarUrl(twitter, size)
    }, [])

    const refreshAvatar = useCallback((twitter: string) => {
        const cacheKey = twitter.toLowerCase()
        globalAvatarCache.delete(cacheKey)
        loadingPromises.delete(cacheKey)
        preloadAvatar(twitter).then(() => {
            setAvatarCache(new Map(globalAvatarCache))
        })
    }, [])

    const value = useMemo(() => ({
        avatarCache,
        isCached,
        getCachedUrl,
        isPreloaded,
        refreshAvatar,
    }), [avatarCache, isCached, getCachedUrl, isPreloaded, refreshAvatar])

    return (
        <AvatarCacheContext.Provider value={value}>
            {children}
        </AvatarCacheContext.Provider>
    )
}
