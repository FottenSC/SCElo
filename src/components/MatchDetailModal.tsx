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

  // Calculate rating after this match by subtracting all subsequent rating changes from current rating
  const p1RatingAfter = React.useMemo(() => {
    if (!p1 || !match) return null
    
    // Get all matches after this one for player 1
    const laterMatches = matches.filter(m => 
      m.id > match.id && (m.player1_id === p1.id || m.player2_id === p1.id)
    )
    
    // Work backwards from current rating
    let rating = p1.rating
    for (const m of laterMatches) {
      const change = m.player1_id === p1.id ? (m.rating_change_p1 || 0) : (m.rating_change_p2 || 0)
      rating -= change
    }
    
    return rating
  }, [p1, match, matches])

  const p2RatingAfter = React.useMemo(() => {
    if (!p2 || !match) return null
    
    // Get all matches after this one for player 2
    const laterMatches = matches.filter(m => 
      m.id > match.id && (m.player1_id === p2.id || m.player2_id === p2.id)
    )
    
    // Work backwards from current rating
    let rating = p2.rating
    for (const m of laterMatches) {
      const change = m.player1_id === p2.id ? (m.rating_change_p1 || 0) : (m.rating_change_p2 || 0)
      rating -= change
    }
    
    return rating
  }, [p2, match, matches])

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
      <DialogContent className="max-w-4xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Match Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-8 py-2">
          {/* Main Match Display - Side by Side Layout */}
          <div className="grid grid-cols-[1fr_auto_1fr] gap-8 items-start">
            {/* Player 1 Column */}
            <div className="flex flex-col items-center gap-4">
              {p1 && (
                <>
                  <Link 
                    className="group text-center" 
                    to={`/players/${p1.id}`}
                    onClick={() => onOpenChange(false)}
                  >
                    <Avatar className="h-24 w-24 mx-auto ring-2 ring-border group-hover:ring-primary transition-all">
                      <AvatarImage src={getPlayerAvatarUrl(p1.twitter, 144, p1.name)} />
                      <AvatarFallback className="text-2xl">{getPlayerInitials(p1.name)}</AvatarFallback>
                    </Avatar>
                    <div className="font-semibold text-lg mt-3 group-hover:text-primary transition-colors">{p1.name}</div>
                  </Link>
                  
                  {/* Player 1 Stats Card */}
                  <div className={`w-full rounded-lg border-2 p-4 ${
                    match.winner_id === match.player1_id 
                      ? 'border-green-500/50 bg-green-500/5' 
                      : 'border-border'
                  }`}>
                    <div className="text-center space-y-3">
                      <div>
                        <div className="text-6xl font-bold mb-1" style={{
                          color: match.winner_id === match.player1_id 
                            ? 'hsl(var(--chart-2))' 
                            : 'hsl(var(--muted-foreground))'
                        }}>
                          {match.player1_score}
                        </div>
                        {match.winner_id === match.player1_id && (
                          <div className="text-sm font-medium text-green-600 dark:text-green-400">Winner</div>
                        )}
                      </div>
                      
                      {(match.rating_change_p1 ?? null) !== null && (
                        <div className="pt-3 border-t space-y-2">
                          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Rating Change</div>
                          <div className="inline-flex items-center gap-2 text-xl font-bold">
                            {(match.rating_change_p1 ?? 0) >= 0 ? (
                              <ArrowUp size={20} className="text-green-600 dark:text-green-400" />
                            ) : (
                              <ArrowDown size={20} className="text-red-600 dark:text-red-400" />
                            )}
                            <span className={(match.rating_change_p1 ?? 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                              {Math.abs(match.rating_change_p1 ?? 0).toFixed(1)}
                            </span>
                          </div>
                          {p1RatingAfter !== null && (
                            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                              <span className="font-semibold text-foreground">{Math.round(p1RatingAfter - (match.rating_change_p1 ?? 0))}</span>
                              <span className={(match.rating_change_p1 ?? 0) >= 0 ? 'text-green-600 dark:text-green-400 text-lg' : 'text-red-600 dark:text-red-400 text-lg'}>
                                →
                              </span>
                              <span className="font-semibold text-foreground">{Math.round(p1RatingAfter)}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* VS Divider */}
            <div className="flex items-center justify-center pt-20">
              <div className="text-3xl font-bold text-muted-foreground">VS</div>
            </div>

            {/* Player 2 Column */}
            <div className="flex flex-col items-center gap-4">
              {p2 && (
                <>
                  <Link 
                    className="group text-center" 
                    to={`/players/${p2.id}`}
                    onClick={() => onOpenChange(false)}
                  >
                    <Avatar className="h-24 w-24 mx-auto ring-2 ring-border group-hover:ring-primary transition-all">
                      <AvatarImage src={getPlayerAvatarUrl(p2.twitter, 144, p2.name)} />
                      <AvatarFallback className="text-2xl">{getPlayerInitials(p2.name)}</AvatarFallback>
                    </Avatar>
                    <div className="font-semibold text-lg mt-3 group-hover:text-primary transition-colors">{p2.name}</div>
                  </Link>
                  
                  {/* Player 2 Stats Card */}
                  <div className={`w-full rounded-lg border-2 p-4 ${
                    match.winner_id === match.player2_id 
                      ? 'border-green-500/50 bg-green-500/5' 
                      : 'border-border'
                  }`}>
                    <div className="text-center space-y-3">
                      <div>
                        <div className="text-6xl font-bold mb-1" style={{
                          color: match.winner_id === match.player2_id 
                            ? 'hsl(var(--chart-2))' 
                            : 'hsl(var(--muted-foreground))'
                        }}>
                          {match.player2_score ?? 0}
                        </div>
                        {match.winner_id === match.player2_id && (
                          <div className="text-sm font-medium text-green-600 dark:text-green-400">Winner</div>
                        )}
                      </div>
                      
                      {(match.rating_change_p2 ?? null) !== null && (
                        <div className="pt-3 border-t space-y-2">
                          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Rating Change</div>
                          <div className="inline-flex items-center gap-2 text-xl font-bold">
                            {(match.rating_change_p2 ?? 0) >= 0 ? (
                              <ArrowUp size={20} className="text-green-600 dark:text-green-400" />
                            ) : (
                              <ArrowDown size={20} className="text-red-600 dark:text-red-400" />
                            )}
                            <span className={(match.rating_change_p2 ?? 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                              {Math.abs(match.rating_change_p2 ?? 0).toFixed(1)}
                            </span>
                          </div>
                          {p2RatingAfter !== null && (
                            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                              <span className="font-semibold text-foreground">{Math.round(p2RatingAfter - (match.rating_change_p2 ?? 0))}</span>
                              <span className={(match.rating_change_p2 ?? 0) >= 0 ? 'text-green-600 dark:text-green-400 text-lg' : 'text-red-600 dark:text-red-400 text-lg'}>
                                →
                              </span>
                              <span className="font-semibold text-foreground">{Math.round(p2RatingAfter)}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Event and Video Links */}
          {(match.event_id || match.vod_link) && (
            <div className="flex items-center justify-center gap-8 pt-4 border-t">
              {match.event_id && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Event:</span>
                  <Link 
                    className="text-primary hover:underline font-medium text-base" 
                    to={`/events/${match.event_id}`}
                    onClick={() => onOpenChange(false)}
                  >
                    {eventTitle ?? 'Loading...'}
                  </Link>
                </div>
              )}
              
              {match.vod_link && (
                <a 
                  href={match.vod_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-primary hover:underline font-medium text-base"
                >
                  {match.vod_link.includes('youtube.com') || match.vod_link.includes('youtu.be') ? (
                    <Youtube className="h-5 w-5 text-red-600" />
                  ) : match.vod_link.includes('twitch.tv') ? (
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#9146FF' }}>
                      <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
                    </svg>
                  ) : (
                    <ExternalLink className="h-5 w-5" />
                  )}
                  Watch Video
                </a>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
