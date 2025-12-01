import React, { useState } from 'react'
import Avatar from 'boring-avatars'
import { getPlayerAvatarUrl } from '@/lib/avatar'
import { cn } from '@/lib/utils'
import { useAvatarCache } from '@/components/AvatarCacheContext'

interface PlayerAvatarProps {
    name: string
    twitter?: string | null
    size?: number
    className?: string
    variant?: 'marble' | 'beam' | 'pixel' | 'sunset' | 'ring' | 'bauhaus'
    colors?: string[]
}

export function PlayerAvatar({
    name,
    twitter,
    size = 40,
    className,
    variant = 'beam',
    colors = ['#92A1C6', '#146A7C', '#F0AB3D', '#C271B4', '#C20D90'],
}: PlayerAvatarProps) {
    const [imageError, setImageError] = useState(false)
    const { getCachedUrl } = useAvatarCache()

    // If we have a twitter handle and haven't errored, try to show the image
    const showImage = twitter && !imageError
    // Use cached URL if available, otherwise fall back to direct URL
    const avatarUrl = twitter ? (getCachedUrl(twitter, size * 2) || getPlayerAvatarUrl(twitter, size * 2)) : null

    return (
        <div
            className={cn("relative overflow-hidden rounded-full shrink-0", className)}
            style={{ width: size, height: size }}
        >
            {showImage ? (
                <img
                    src={avatarUrl!}
                    alt={name}
                    className="h-full w-full object-cover"
                    onError={() => setImageError(true)}
                />
            ) : (
                <Avatar
                    size={size}
                    name={name}
                    variant={variant}
                    colors={colors}
                />
            )}
        </div>
    )
}
