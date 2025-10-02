import * as React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getPlayerAvatarUrl, getPlayerInitials } from '@/lib/avatar'
import type { Player } from '@/types/models'

interface PlayerAvatarProps {
  player: Pick<Player, 'name' | 'twitter'>
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  showName?: boolean
}

const sizeClasses = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16'
}

const sizePx = {
  sm: 24,
  md: 32,
  lg: 48,
  xl: 64
}

const fallbackTextSize = {
  sm: 'text-[8px]',
  md: 'text-xs',
  lg: 'text-sm',
  xl: 'text-2xl'
}

/**
 * Optimized player avatar component with performance enhancements
 * - Uses smaller image sizes based on display size
 * - Adds loading="lazy" for off-screen images
 * - Adds decoding="async" for non-blocking image decode
 * - Adds fetchpriority hints based on position
 */
export function PlayerAvatar({ player, size = 'md', className = '', showName = false }: PlayerAvatarProps) {
  const avatarUrl = getPlayerAvatarUrl(player.twitter, sizePx[size], player.name)
  const initials = getPlayerInitials(player.name)
  
  const avatar = (
    <Avatar className={`${sizeClasses[size]} ${className}`}>
      <AvatarImage 
        src={avatarUrl}
        alt={player.name}
        loading="lazy"
        decoding="async"
        // Use fetchpriority for above-the-fold content
        // @ts-ignore - fetchpriority is valid but not in types yet
        fetchpriority={size === 'xl' ? 'high' : 'low'}
      />
      <AvatarFallback className={fallbackTextSize[size]}>
        {initials}
      </AvatarFallback>
    </Avatar>
  )

  if (showName) {
    return (
      <div className="flex items-center gap-2">
        {avatar}
        <span>{player.name}</span>
      </div>
    )
  }

  return avatar
}

/**
 * Player avatar with link wrapper
 */
interface PlayerAvatarLinkProps extends PlayerAvatarProps {
  playerId: number
  linkClassName?: string
}

export function PlayerAvatarLink({ 
  player, 
  size = 'md', 
  className = '', 
  linkClassName = '',
  showName = true,
  playerId
}: PlayerAvatarLinkProps) {
  return (
    <a 
      href={`/players/${playerId}`}
      className={`flex items-center gap-2 text-primary hover:underline ${linkClassName}`}
    >
      <PlayerAvatar player={player} size={size} className={className} />
      {showName && <span>{player.name}</span>}
    </a>
  )
}
