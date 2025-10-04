import * as React from 'react'
import { Link } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { usePlayersAndMatches, fetchEvents } from '@/lib/data'
import { getPlayerAvatarUrl, getPlayerInitials } from '@/lib/avatar'
import { ArrowUp, ArrowDown, Youtube, ExternalLink } from 'lucide-react'

interface MatchDetailModalProps {
  matchId: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MatchDetailModal({ matchId, open, onOpenChange }: MatchDetailModalProps) {
  const { players, matches } = usePlayersAndMatches()
  const [eventTitle, setEventTitle] = React.useState<string | null>(null)

  const match = React.useMemo(() => matches.find(m => m.id === matchId), [matches, matchId])
  const p1 = players.find(p => p.id === match?.player1_id)
  const p2 = players.find(p => p.id === match?.player2_id)

  React.useEffect(() => {
    if (!match?.event_id) {
      setEventTitle(null)
      return
    }
    
    let active = true
    ;(async () => {
      const events = await fetchEvents()
      if (!active) return
      const ev = events.find(e => e.id === match.event_id)
      setEventTitle(ev?.title ?? null)
    })()
    return () => { active = false }
  }, [match?.event_id])

  if (!match) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Match Not Found</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">The match you're looking for doesn't exist.</p>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Match Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Score Display */}
          <div className="flex items-center justify-center gap-4 py-6">
            <div className="flex items-center gap-4">
              {p1 && (
                <div className="text-center">
                  <Link 
                    className="text-primary hover:underline block mb-2" 
                    to={`/players/${p1.id}`}
                    onClick={() => onOpenChange(false)}
                  >
                    <Avatar className="h-16 w-16 mx-auto">
                      <AvatarImage src={getPlayerAvatarUrl(p1.twitter, 96, p1.name)} />
                      <AvatarFallback className="text-lg">{getPlayerInitials(p1.name)}</AvatarFallback>
                    </Avatar>
                    <div className="font-medium mt-2">{p1.name}</div>
                  </Link>
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className={`text-4xl font-bold ${match.winner_id === match.player1_id ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                  {match.player1_score}
                </div>
                <div className="text-2xl text-muted-foreground">-</div>
                <div className={`text-4xl font-bold ${match.winner_id === match.player2_id ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                  {match.player2_score ?? 0}
                </div>
              </div>
              {p2 && (
                <div className="text-center">
                  <Link 
                    className="text-primary hover:underline block mb-2" 
                    to={`/players/${p2.id}`}
                    onClick={() => onOpenChange(false)}
                  >
                    <Avatar className="h-16 w-16 mx-auto">
                      <AvatarImage src={getPlayerAvatarUrl(p2.twitter, 96, p2.name)} />
                      <AvatarFallback className="text-lg">{getPlayerInitials(p2.name)}</AvatarFallback>
                    </Avatar>
                    <div className="font-medium mt-2">{p2.name}</div>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Rating Changes */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 border-t pt-4">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Rating Change</div>
              {p1 ? (
                <div className="text-sm">
                  {(match.rating_change_p1 ?? null) !== null ? (
                    <span className="inline-flex items-center gap-1">
                      {(match.rating_change_p1 ?? 0) >= 0 ? (
                        <ArrowUp size={14} className="text-green-600 dark:text-green-400" />
                      ) : (
                        <ArrowDown size={14} className="text-red-600 dark:text-red-400" />
                      )}
                      <span className={(match.rating_change_p1 ?? 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                        {Math.abs(match.rating_change_p1 ?? 0).toFixed(1)}
                      </span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
              ) : (
                <span className="text-muted-foreground">Unknown Player</span>
              )}
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Rating Change</div>
              {p2 ? (
                <div className="text-sm">
                  {(match.rating_change_p2 ?? null) !== null ? (
                    <span className="inline-flex items-center gap-1">
                      {(match.rating_change_p2 ?? 0) >= 0 ? (
                        <ArrowUp size={14} className="text-green-600 dark:text-green-400" />
                      ) : (
                        <ArrowDown size={14} className="text-red-600 dark:text-red-400" />
                      )}
                      <span className={(match.rating_change_p2 ?? 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                        {Math.abs(match.rating_change_p2 ?? 0).toFixed(1)}
                      </span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
              ) : (
                <span className="text-muted-foreground">Unknown Player</span>
              )}
            </div>
          </div>

          <div className="border-t pt-4 space-y-4">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Event</div>
              <div className="font-medium">
                {match.event_id ? (
                  <Link 
                    className="text-primary hover:underline" 
                    to={`/events/${match.event_id}`}
                    onClick={() => onOpenChange(false)}
                  >
                    {eventTitle ?? 'Loading...'}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
            </div>
            
            {match.vod_link && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">Match Video</div>
                <a 
                  href={match.vod_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-primary hover:underline font-medium"
                >
                  {match.vod_link.includes('youtube.com') || match.vod_link.includes('youtu.be') ? (
                    <Youtube className="h-4 w-4 text-red-600" />
                  ) : match.vod_link.includes('twitch.tv') ? (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#9146FF' }}>
                      <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
                    </svg>
                  ) : (
                    <ExternalLink className="h-4 w-4" />
                  )}
                  Watch Video
                </a>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
