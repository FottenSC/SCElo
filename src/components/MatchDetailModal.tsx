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
import { supabase } from '@/supabase/client'

interface MatchDetailModalProps {
  matchId: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MatchDetailModal({ matchId, open, onOpenChange }: MatchDetailModalProps) {
  const { players, matches } = usePlayersAndMatches()
  const [eventTitle, setEventTitle] = React.useState<string | null>(null)
  const [seasonName, setSeasonName] = React.useState<string | null>(null)
  const [matchRatingEvents, setMatchRatingEvents] = React.useState<Record<number, { rating: number | null; rating_change: number | null }>>({})

  const match = React.useMemo(() => matches.find(m => m.id === matchId), [matches, matchId])
  const p1 = players.find(p => p.id === match?.player1_id)
  const p2 = players.find(p => p.id === match?.player2_id)

  React.useEffect(() => {
    let active = true

    if (!match?.id) {
      setMatchRatingEvents({})
      return () => {
        active = false
      }
    }

    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('rating_events')
          .select('player_id, rating, rating_change, event_type')
          .eq('match_id', match.id)

        if (!active) return

        if (error) {
          console.warn('Failed to fetch rating events for match', match.id, error)
          setMatchRatingEvents({})
          return
        }

        const map: Record<number, { rating: number | null; rating_change: number | null }> = {}

        for (const event of data ?? []) {
          if (event?.event_type !== 'match' || typeof event?.player_id !== 'number') continue

          map[event.player_id] = {
            rating: typeof event.rating === 'number' ? event.rating : event.rating ?? null,
            rating_change: typeof event.rating_change === 'number' ? event.rating_change : event.rating_change ?? null,
          }
        }

        setMatchRatingEvents(map)
      } catch (err) {
        if (!active) return
        console.warn('Failed to load rating events for match', match.id, err)
        setMatchRatingEvents({})
      }
    })()

    return () => {
      active = false
    }
  }, [match?.id])

  type RatingDetail = {
    ratingAfter: number | null
    ratingBefore: number | null
    ratingChange: number | null
  }

  const ratingDetails = React.useMemo((): { p1: RatingDetail | null; p2: RatingDetail | null } => {
    if (!match) {
      return { p1: null, p2: null }
    }

    const computeFallback = (player: typeof p1, ratingChange: number | null | undefined): RatingDetail | null => {
      if (!player) return null

      const laterMatches = matches.filter(m =>
        m.id > match.id && (m.player1_id === player.id || m.player2_id === player.id)
      )

      let rating = player.rating ?? 1500
      for (const m of laterMatches) {
        const change = m.player1_id === player.id ? (m.rating_change_p1 ?? 0) : (m.rating_change_p2 ?? 0)
        rating -= change
      }

      const changeValue = ratingChange ?? null
      const before = changeValue !== null ? rating - changeValue : null

      return {
        ratingAfter: Number.isFinite(rating) ? rating : null,
        ratingBefore: before !== null && Number.isFinite(before) ? before : null,
        ratingChange: changeValue,
      }
    }

    const getFromEvents = (player: typeof p1, fallbackChange: number | null | undefined): RatingDetail | null => {
      if (!player) return null
      const event = matchRatingEvents[player.id]
      if (!event) return null

      const changeValue = event.rating_change ?? (fallbackChange ?? null)
      const after = event.rating ?? null
      const before = changeValue !== null && after !== null ? after - changeValue : null

      return {
        ratingAfter: after,
        ratingBefore: before,
        ratingChange: changeValue,
      }
    }

    const p1Fallback = computeFallback(p1, match.rating_change_p1 ?? null)
    const p2Fallback = computeFallback(p2, match.rating_change_p2 ?? null)

    return {
      p1: getFromEvents(p1, match.rating_change_p1 ?? null) ?? p1Fallback,
      p2: getFromEvents(p2, match.rating_change_p2 ?? null) ?? p2Fallback,
    }
  }, [match, p1, p2, matches, matchRatingEvents])

  const p1Ratings = ratingDetails.p1
  const p2Ratings = ratingDetails.p2
  const p1RatingChange = p1Ratings?.ratingChange ?? (match?.rating_change_p1 ?? null)
  const p2RatingChange = p2Ratings?.ratingChange ?? (match?.rating_change_p2 ?? null)

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

  React.useEffect(() => {
    if (!match?.season_id) {
      setSeasonName(null)
      return
    }
    
    let active = true
    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('seasons')
          .select('name')
          .eq('id', match.season_id)
          .single()
        
        if (!active) return
        
        if (error) {
          console.warn('Failed to fetch season', error)
          setSeasonName(null)
          return
        }
        
        setSeasonName(data?.name ?? null)
      } catch (err) {
        if (!active) return
        console.warn('Failed to load season', err)
        setSeasonName(null)
      }
    })()
    return () => { active = false }
  }, [match?.season_id])

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
                          {match.player1_score ?? '?'}
                        </div>
                        {match.winner_id === match.player1_id && (
                          <div className="text-sm font-medium text-green-600 dark:text-green-400">Winner</div>
                        )}
                      </div>
                      
                      {p1RatingChange !== null && (
                        <div className="pt-3 border-t space-y-2">
                          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Rating Change</div>
                          <div className="inline-flex items-center gap-2 text-xl font-bold">
                            {(p1RatingChange ?? 0) >= 0 ? (
                              <ArrowUp size={20} className="text-green-600 dark:text-green-400" />
                            ) : (
                              <ArrowDown size={20} className="text-red-600 dark:text-red-400" />
                            )}
                            <span className={(p1RatingChange ?? 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                              {Math.abs(p1RatingChange ?? 0).toFixed(1)}
                            </span>
                          </div>
                          {p1Ratings && p1Ratings.ratingBefore !== null && p1Ratings.ratingAfter !== null && (
                            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                              <span className="font-semibold text-foreground">{Math.round(p1Ratings.ratingBefore)}</span>
                              <span className={(p1RatingChange ?? 0) >= 0 ? 'text-green-600 dark:text-green-400 text-lg' : 'text-red-600 dark:text-red-400 text-lg'}>
                                →
                              </span>
                              <span className="font-semibold text-foreground">{Math.round(p1Ratings.ratingAfter)}</span>
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
                          {match.player2_score ?? '?'}
                        </div>
                        {match.winner_id === match.player2_id && (
                          <div className="text-sm font-medium text-green-600 dark:text-green-400">Winner</div>
                        )}
                      </div>
                      
                      {p2RatingChange !== null && (
                        <div className="pt-3 border-t space-y-2">
                          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Rating Change</div>
                          <div className="inline-flex items-center gap-2 text-xl font-bold">
                            {(p2RatingChange ?? 0) >= 0 ? (
                              <ArrowUp size={20} className="text-green-600 dark:text-green-400" />
                            ) : (
                              <ArrowDown size={20} className="text-red-600 dark:text-red-400" />
                            )}
                            <span className={(p2RatingChange ?? 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                              {Math.abs(p2RatingChange ?? 0).toFixed(1)}
                            </span>
                          </div>
                          {p2Ratings && p2Ratings.ratingBefore !== null && p2Ratings.ratingAfter !== null && (
                            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                              <span className="font-semibold text-foreground">{Math.round(p2Ratings.ratingBefore)}</span>
                              <span className={(p2RatingChange ?? 0) >= 0 ? 'text-green-600 dark:text-green-400 text-lg' : 'text-red-600 dark:text-red-400 text-lg'}>
                                →
                              </span>
                              <span className="font-semibold text-foreground">{Math.round(p2Ratings.ratingAfter)}</span>
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
          {(match.event_id || match.vod_link || seasonName) && (
            <div className="flex items-center justify-center gap-8 pt-4 border-t flex-wrap">
              {seasonName && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Season:</span>
                  <span className="font-medium text-base">{seasonName}</span>
                </div>
              )}
              
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
