import { Link } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getPlayerAvatarUrl, getPlayerInitials } from '@/lib/avatar'
import { formatRatingChange } from '@/lib/predictions'
import { useMatchModal } from '@/components/MatchModalContext'
import { ExternalLink, Youtube } from 'lucide-react'
import type { Player, Match, Event } from '@/types/models'

// Helper function to determine if a URL is YouTube or Twitch
function getVideoIcon(url: string) {
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return <Youtube size={14} />
  }
  if (url.includes('twitch.tv')) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="inline-block">
        <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
      </svg>
    )
  }
  return <ExternalLink size={14} />
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
    <div className="p-4 border rounded-lg space-y-3">
      {/* Header with Match Number or Links */}
      {(showMatchNumber || (showLinksInHeader && hasLinks)) && (
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3 text-sm">
            {showLinksInHeader && hasLinks && (
              <>
                {showEventLink && event && (
                  <Link className="text-primary hover:underline inline-flex items-center gap-1" to={`/events/${event.id}`}>
                    {event.title}
                  </Link>
                )}
                {match.vod_link && !showMatchNumber && (
                  <a 
                    href={match.vod_link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    {getVideoIcon(match.vod_link)}
                    Match Video
                  </a>
                )}
              </>
            )}
            {showMatchNumber && (
              <>
                <div className="text-sm font-medium text-muted-foreground">
                  Match {matchNumber}
                </div>
                {isCompleted && (
                  <div className="text-xs font-medium text-muted-foreground px-2 py-1 bg-muted rounded">
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
              className="text-primary hover:underline inline-flex items-center gap-1 text-sm"
            >
              {getVideoIcon(match.vod_link)}
              Match Video
            </a>
          )}
        </div>
      )}
      
      {/* Player 1 */}
      <div className={`flex items-center justify-between ${isCompleted && isP1Winner ? 'bg-green-500/10 -mx-4 px-4 py-2 rounded-lg' : ''}`}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar className="h-12 w-12 shrink-0">
            <AvatarImage
              src={getPlayerAvatarUrl(player1.twitter, 72, player1.name)}
              alt={player1.name}
            />
            <AvatarFallback>{getPlayerInitials(player1.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <Link to={`/players/${player1.id}`} className="hover:underline">
              <div className={`font-semibold flex items-center gap-2 flex-wrap ${isCompleted && isP1Winner ? 'text-green-600 dark:text-green-400' : isCompleted ? 'text-muted-foreground' : ''}`}>
                {isCompleted && isP1Winner && <span className="text-green-600 dark:text-green-400">✓</span>}
                <span className="truncate">{player1.name}</span>
                {isCompleted && isP1Winner && <span className="text-xs font-normal uppercase px-1.5 py-0.5 bg-green-600/20 rounded whitespace-nowrap">Winner</span>}
              </div>
            </Link>
            <div className="text-sm text-muted-foreground">
              Rating: {Math.round(player1.rating)}
            </div>
          </div>
        </div>
        {isCompleted && (
          <div className="text-sm font-medium shrink-0">
            <span className={match.rating_change_p1 && match.rating_change_p1 >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
              {match.rating_change_p1 !== null && match.rating_change_p1 !== undefined ? formatRatingChange(match.rating_change_p1) : '—'}
            </span>
          </div>
        )}
      </div>

      {/* Score / VS */}
      {isCompleted ? (
        <button 
          onClick={() => openMatch(match.id)} 
          className="flex items-center justify-center gap-2 font-semibold cursor-pointer w-full"
        >
          <span className={isP1Winner ? 'text-green-600 dark:text-green-400 text-2xl' : 'text-muted-foreground text-xl'}>
            {match.player1_score ?? '?'}
          </span>
          <span className="text-muted-foreground">-</span>
          <span className={!isP1Winner ? 'text-green-600 dark:text-green-400 text-2xl' : 'text-muted-foreground text-xl'}>
            {match.player2_score ?? '?'}
          </span>
        </button>
      ) : (
        <div className="flex items-center justify-center text-muted-foreground font-semibold">
          VS
        </div>
      )}

      {/* Player 2 */}
      <div className={`flex items-center justify-between ${isCompleted && !isP1Winner ? 'bg-green-500/10 -mx-4 px-4 py-2 rounded-lg' : ''}`}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar className="h-12 w-12 shrink-0">
            <AvatarImage
              src={getPlayerAvatarUrl(player2.twitter, 72, player2.name)}
              alt={player2.name}
            />
            <AvatarFallback>{getPlayerInitials(player2.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <Link to={`/players/${player2.id}`} className="hover:underline">
              <div className={`font-semibold flex items-center gap-2 flex-wrap ${isCompleted && !isP1Winner ? 'text-green-600 dark:text-green-400' : isCompleted ? 'text-muted-foreground' : ''}`}>
                {isCompleted && !isP1Winner && <span className="text-green-600 dark:text-green-400">✓</span>}
                <span className="truncate">{player2.name}</span>
                {isCompleted && !isP1Winner && <span className="text-xs font-normal uppercase px-1.5 py-0.5 bg-green-600/20 rounded whitespace-nowrap">Winner</span>}
              </div>
            </Link>
            <div className="text-sm text-muted-foreground">
              Rating: {Math.round(player2.rating)}
            </div>
          </div>
        </div>
        {isCompleted && (
          <div className="text-sm font-medium shrink-0">
            <span className={match.rating_change_p2 && match.rating_change_p2 >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
              {match.rating_change_p2 !== null && match.rating_change_p2 !== undefined ? formatRatingChange(match.rating_change_p2) : '—'}
            </span>
          </div>
        )}
      </div>
      
      {/* Footer with Event Link and VOD Links (only if not shown in header) */}
      {!showLinksInHeader && !showMatchNumber && hasLinks && (
        <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground border-t pt-2">
          {showEventLink && event && (
            <Link className="text-primary hover:underline inline-flex items-center gap-1" to={`/events/${event.id}`}>
              Event: {event.title}
            </Link>
          )}
          {match.vod_link && (
            <a 
              href={match.vod_link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              {getVideoIcon(match.vod_link)}
              Match Video
            </a>
          )}
        </div>
      )}
    </div>
  )
}
