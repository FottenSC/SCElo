import { Link } from '@tanstack/react-router'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { getPlayerAvatarUrl, getPlayerInitials } from '@/lib/avatar'
import { formatRatingChange } from '@/lib/predictions'
import { useMatchModal } from '@/components/MatchModalContext'
import { ExternalLink, Youtube } from 'lucide-react'
import type { Player, Match, Event } from '@/types/models'
import { slugify } from '@/lib/utils'

// Helper function to determine if a URL is YouTube or Twitch
function getVideoIcon(url: string) {
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return <Youtube size={16} />
  }
  if (url.includes('twitch.tv')) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="inline-block">
        <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
      </svg>
    )
  }
  return <ExternalLink size={16} />
}

interface MatchCardProps {
  match: Match
  player1: Player
  player2: Player
  showMatchNumber?: boolean
  matchNumber?: number
  event?: Event | null
  showEventLink?: boolean
  showLinksInHeader?: boolean
}

export function MatchCard({ match, player1, player2, showMatchNumber, matchNumber, event, showEventLink = false, showLinksInHeader = false }: MatchCardProps) {
  const { openMatch } = useMatchModal()
  const isCompleted = match.winner_id !== null
  const isP1Winner = match.winner_id === match.player1_id
  const hasLinks = (showEventLink && event) || match.vod_link

  return (
    <div className="group relative p-4 border border-border/40 rounded-lg space-y-3 bg-card/40 backdrop-blur-sm hover:bg-card/60 transition-all duration-300 hover:border-primary/50 hover:shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)] overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-transparent via-primary/0 to-transparent group-hover:via-primary/50 transition-all duration-500" />

      {(showMatchNumber || (showLinksInHeader && hasLinks)) && (
        <div className="flex items-center justify-between gap-2 flex-wrap border-b border-white/5 pb-2 mb-2">
          <div className="flex items-center gap-3 text-sm">
            {showLinksInHeader && hasLinks && (
              <>
                {showEventLink && event && (
                  <Link className="text-primary hover:text-primary/80 hover:underline inline-flex items-center gap-1 font-heading font-bold tracking-wide transition-colors" to="/events/$id" params={{ id: String(event.id) }}>
                    {event.title}
                  </Link>
                )}
                {match.vod_link && !showMatchNumber && (
                  <a
                    href={match.vod_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 border-2 border-red-600 text-red-600 rounded hover:bg-red-600 hover:text-white transition-all shadow-sm hover:shadow-red-600/20 text-xs font-heading font-bold uppercase tracking-wider inline-flex items-center gap-2"
                  >
                    {getVideoIcon(match.vod_link)}
                    Watch
                  </a>
                )}
              </>
            )}
            {showMatchNumber && (
              <>
                <div className="text-xs font-heading font-bold uppercase tracking-widest text-muted-foreground">
                  Match {matchNumber}
                </div>
                {isCompleted && (
                  <div className="text-[10px] font-bold uppercase tracking-wider text-green-500 px-1.5 py-0.5 bg-green-500/10 rounded border border-green-500/20">
                    Completed
                  </div>
                )}
              </>
            )}
          </div>
          {showMatchNumber && match.vod_link && (
            <a
              href={match.vod_link}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 border-2 border-red-600 text-red-600 rounded hover:bg-red-600 hover:text-white transition-all shadow-sm hover:shadow-red-600/20 text-xs font-heading font-bold uppercase tracking-wider inline-flex items-center gap-2"
            >
              {getVideoIcon(match.vod_link)}
              Watch
            </a>
          )}
        </div>
      )}

      <div className={`relative flex items-center justify-between p-2 rounded-md transition-colors ${isCompleted && isP1Winner ? 'bg-gradient-to-r from-yellow-500/10 to-transparent border-l-2 border-yellow-500' : 'hover:bg-white/5'}`}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <PlayerAvatar
            name={player1.name}
            twitter={player1.twitter}
            size={48}
            className={`h-12 w-12 shrink-0 border-2 ${isCompleted && isP1Winner ? 'border-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.3)]' : 'border-border'}`}
          />
          <div className="min-w-0">
            <Link to="/player/$id/$username" params={{ id: String(player1.id), username: slugify(player1.name) }} className="group/player">
              <div className={`font-heading font-bold text-lg flex items-center gap-2 flex-wrap transition-colors ${isCompleted && isP1Winner ? 'text-yellow-500' : 'text-foreground group-hover/player:text-primary'}`}>
                {isCompleted && isP1Winner && <span className="text-yellow-500">👑</span>}
                <span className="truncate">{player1.name}</span>
              </div>
            </Link>
            <div className="text-xs font-mono text-muted-foreground">
              Rating: {player1.rating === null ? 'Unrated' : Math.round(player1.rating)}
            </div>
          </div>
        </div>
        {isCompleted && (
          <div className="text-sm font-bold font-mono shrink-0">
            <span className={match.rating_change_p1 && match.rating_change_p1 >= 0 ? 'text-green-500' : 'text-red-500'}>
              {match.rating_change_p1 !== null && match.rating_change_p1 !== undefined ? formatRatingChange(match.rating_change_p1) : '—'}
            </span>
          </div>
        )}
      </div>

      {isCompleted ? (
        <button
          onClick={() => openMatch(match.id)}
          className="relative flex items-center justify-center gap-4 font-heading font-black cursor-pointer w-full py-1 hover:scale-105 transition-transform"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
          <span className={isP1Winner ? 'text-yellow-500 text-3xl drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]' : 'text-muted-foreground text-2xl'}>
            {match.player1_score ?? '?'}
          </span>
          <span className="text-muted-foreground/50 text-xl">-</span>
          <span className={!isP1Winner ? 'text-yellow-500 text-3xl drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]' : 'text-muted-foreground text-2xl'}>
            {match.player2_score ?? '?'}
          </span>
        </button>
      ) : (
        <div className="flex items-center justify-center py-2">
          <span className="text-2xl font-heading font-black text-transparent bg-clip-text bg-gradient-to-b from-muted-foreground to-muted-foreground/50 italic pr-1">
            VS
          </span>
        </div>
      )}

      <div className={`relative flex items-center justify-between p-2 rounded-md transition-colors ${isCompleted && !isP1Winner ? 'bg-gradient-to-r from-yellow-500/10 to-transparent border-l-2 border-yellow-500' : 'hover:bg-white/5'}`}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <PlayerAvatar
            name={player2.name}
            twitter={player2.twitter}
            size={48}
            className={`h-12 w-12 shrink-0 border-2 ${isCompleted && !isP1Winner ? 'border-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.3)]' : 'border-border'}`}
          />
          <div className="min-w-0">
            <Link to="/player/$id/$username" params={{ id: String(player2.id), username: slugify(player2.name) }} className="group/player">
              <div className={`font-heading font-bold text-lg flex items-center gap-2 flex-wrap transition-colors ${isCompleted && !isP1Winner ? 'text-yellow-500' : 'text-foreground group-hover/player:text-primary'}`}>
                {isCompleted && !isP1Winner && <span className="text-yellow-500">👑</span>}
                <span className="truncate">{player2.name}</span>
              </div>
            </Link>
            <div className="text-xs font-mono text-muted-foreground">
              Rating: {player2.rating === null ? 'Unrated' : Math.round(player2.rating)}
            </div>
          </div>
        </div>
        {isCompleted && (
          <div className="text-sm font-bold font-mono shrink-0">
            <span className={match.rating_change_p2 && match.rating_change_p2 >= 0 ? 'text-green-500' : 'text-red-500'}>
              {match.rating_change_p2 !== null && match.rating_change_p2 !== undefined ? formatRatingChange(match.rating_change_p2) : '—'}
            </span>
          </div>
        )}
      </div>

      {!showLinksInHeader && !showMatchNumber && hasLinks && (
        <div className="flex items-center justify-center gap-4 text-xs font-bold uppercase tracking-wider text-muted-foreground border-t border-white/5 pt-3 mt-2">
          {showEventLink && event && (
            <Link className="text-primary hover:text-primary/80 hover:underline inline-flex items-center gap-1 transition-colors" to="/events/$id" params={{ id: String(event.id) }}>
              Event: {event.title}
            </Link>
          )}
          {match.vod_link && (
            <a
              href={match.vod_link}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 border-2 border-red-600 text-red-600 rounded hover:bg-red-600 hover:text-white transition-all shadow-sm hover:shadow-red-600/20 text-xs font-heading font-bold uppercase tracking-wider inline-flex items-center gap-2"
            >
              {getVideoIcon(match.vod_link)}
              Watch
            </a>
          )}
        </div>
      )}
    </div>
  )
}
