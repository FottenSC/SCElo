import * as React from 'react'
import { Link } from '@tanstack/react-router'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PlayerAvatar } from '@/components/PlayerAvatar'
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
  const [serverMatch, setServerMatch] = React.useState<any>(null)
  const [fetchingFromServer, setFetchingFromServer] = React.useState(false)

  const localMatch = React.useMemo(() => matches.find(m => m.id === matchId), [matches, matchId])
  const match = React.useMemo(() => localMatch || serverMatch, [localMatch, serverMatch])
  const p1 = players.find(p => p.id === match?.player1_id)
  const p2 = players.find(p => p.id === match?.player2_id)

  // Fetch match from server if not found locally
  React.useEffect(() => {
    if (!matchId || localMatch) {
      return
    }

    let active = true
    setFetchingFromServer(true)

      ; (async () => {
        try {
          const { data, error } = await supabase
            .from('matches')
            .select('id, player1_id, player2_id, winner_id, player1_score, player2_score, rating_change_p1, rating_change_p2, event_id, match_order, vod_link, season_id')
            .eq('id', matchId)
            .single()

          if (!active) return

          if (error) {
            console.warn('Failed to fetch match from server:', error)
            setServerMatch(null)
            setFetchingFromServer(false)
            return
          }

          if (data) {
            console.log('Fetched match from server:', data)
            setServerMatch(data)
          }
          setFetchingFromServer(false)
        } catch (err) {
          if (!active) return
          console.warn('Error fetching match from server:', err)
          setServerMatch(null)
          setFetchingFromServer(false)
        }
      })()

    return () => {
      active = false
    }
  }, [matchId, localMatch])

  React.useEffect(() => {
    let active = true

    if (!match?.id) {
      setMatchRatingEvents({})
      return () => {
        active = false
      }
    }

    ; (async () => {
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
      ; (async () => {
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
      ; (async () => {
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
          {fetchingFromServer ? (
            <p className="text-muted-foreground text-sm">Fetching match data from server...</p>
          ) : (
            <p className="text-muted-foreground text-sm">The match you're looking for doesn't exist.</p>
          )}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl bg-card/90 backdrop-blur-xl border-primary/50 shadow-[0_0_50px_rgba(0,0,0,0.5)] p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
        <DialogHeader className="sr-only">
          <DialogTitle>Match Details</DialogTitle>
        </DialogHeader>

        <div className="relative p-4 sm:p-6 md:p-10 space-y-6 md:space-y-8">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background/50 to-background pointer-events-none" />

          <div className="relative z-10 grid grid-cols-[1fr_60px_1fr] sm:grid-cols-[1fr_80px_1fr] md:grid-cols-[1fr_120px_1fr] gap-2 sm:gap-4 md:gap-8 items-start">
            <div className="flex flex-col items-center gap-2 sm:gap-4 md:gap-6">
              {p1 && (
                <>
                  <Link
                    className="group flex flex-col items-center"
                    to="/players/$id" params={{ id: String(p1.id) }}
                    onClick={() => onOpenChange(false)}
                  >
                    <div className="relative">
                      <div className="absolute inset-0 bg-primary/30 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <PlayerAvatar
                        name={p1.name}
                        twitter={p1.twitter}
                        size={120}
                        className={`h-16 w-16 sm:h-20 sm:w-20 md:h-32 md:w-32 mx-auto border-2 sm:border-4 transition-all duration-300 ${match.winner_id === match.player1_id ? 'border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.5)]' : 'border-border group-hover:border-primary'}`}
                      />
                    </div>
                    <div className="font-heading font-bold text-sm sm:text-lg md:text-2xl mt-2 sm:mt-4 group-hover:text-primary transition-colors text-center tracking-wide line-clamp-2">{p1.name}</div>
                  </Link>

                  <div className={`w-full rounded-lg border p-2 sm:p-3 md:p-4 backdrop-blur-sm transition-colors ${match.winner_id === match.player1_id
                    ? 'border-yellow-500/50 bg-yellow-500/5'
                    : 'border-border/50 bg-card/30'
                    }`}>
                    <div className="text-center space-y-1 sm:space-y-2 md:space-y-3">
                      <div>
                        <div className="text-3xl sm:text-4xl md:text-6xl font-heading font-black mb-0.5 sm:mb-1 drop-shadow-lg" style={{
                          color: match.winner_id === match.player1_id
                            ? '#eab308' // Yellow-500
                            : 'hsl(var(--muted-foreground))'
                        }}>
                          {match.player1_score ?? '?'}
                        </div>
                        {match.winner_id === match.player1_id && (
                          <div className="text-[10px] sm:text-xs md:text-sm font-heading font-bold text-yellow-500 uppercase tracking-widest">Victory</div>
                        )}
                      </div>

                      {p1RatingChange !== null && (
                        <div className="pt-1 sm:pt-2 md:pt-3 border-t border-border/30 space-y-1 sm:space-y-2">
                          <div className="text-[10px] sm:text-xs text-muted-foreground font-heading uppercase tracking-widest hidden sm:block">Rating</div>
                          <div className="inline-flex items-center gap-1 sm:gap-2 text-sm sm:text-lg md:text-xl font-bold font-mono">
                            {(p1RatingChange ?? 0) >= 0 ? (
                              <ArrowUp size={14} className="text-green-500 sm:w-5 sm:h-5" />
                            ) : (
                              <ArrowDown size={14} className="text-red-500 sm:w-5 sm:h-5" />
                            )}
                            <span className={(p1RatingChange ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'}>
                              {Math.abs(p1RatingChange ?? 0).toFixed(1)}
                            </span>
                          </div>
                          {p1Ratings && p1Ratings.ratingBefore !== null && p1Ratings.ratingAfter !== null && (
                            <div className="hidden sm:flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground font-mono">
                              <span className="font-semibold text-foreground">{Math.round(p1Ratings.ratingBefore)}</span>
                              <span className={(p1RatingChange ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'}>
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

            <div className="flex flex-col items-center justify-center py-2 sm:py-4 md:py-0 overflow-hidden">
              <div className="text-2xl sm:text-4xl md:text-7xl font-heading font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-700 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] italic pr-1 sm:pr-2">
                VS
              </div>
            </div>

            <div className="flex flex-col items-center gap-2 sm:gap-4 md:gap-6">
              {p2 && (
                <>
                  <Link
                    className="group flex flex-col items-center"
                    to="/players/$id" params={{ id: String(p2.id) }}
                    onClick={() => onOpenChange(false)}
                  >
                    <div className="relative">
                      <div className="absolute inset-0 bg-primary/30 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <PlayerAvatar
                        name={p2.name}
                        twitter={p2.twitter}
                        size={120}
                        className={`h-16 w-16 sm:h-20 sm:w-20 md:h-32 md:w-32 mx-auto border-2 sm:border-4 transition-all duration-300 ${match.winner_id === match.player2_id ? 'border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.5)]' : 'border-border group-hover:border-primary'}`}
                      />
                    </div>
                    <div className="font-heading font-bold text-sm sm:text-lg md:text-2xl mt-2 sm:mt-4 group-hover:text-primary transition-colors text-center tracking-wide line-clamp-2">{p2.name}</div>
                  </Link>

                  <div className={`w-full rounded-lg border p-2 sm:p-3 md:p-4 backdrop-blur-sm transition-colors ${match.winner_id === match.player2_id
                    ? 'border-yellow-500/50 bg-yellow-500/5'
                    : 'border-border/50 bg-card/30'
                    }`}>
                    <div className="text-center space-y-1 sm:space-y-2 md:space-y-3">
                      <div>
                        <div className="text-3xl sm:text-4xl md:text-6xl font-heading font-black mb-0.5 sm:mb-1 drop-shadow-lg" style={{
                          color: match.winner_id === match.player2_id
                            ? '#eab308' // Yellow-500
                            : 'hsl(var(--muted-foreground))'
                        }}>
                          {match.player2_score ?? '?'}
                        </div>
                        {match.winner_id === match.player2_id && (
                          <div className="text-[10px] sm:text-xs md:text-sm font-heading font-bold text-yellow-500 uppercase tracking-widest">Victory</div>
                        )}
                      </div>

                      {p2RatingChange !== null && (
                        <div className="pt-1 sm:pt-2 md:pt-3 border-t border-border/30 space-y-1 sm:space-y-2">
                          <div className="text-[10px] sm:text-xs text-muted-foreground font-heading uppercase tracking-widest hidden sm:block">Rating</div>
                          <div className="inline-flex items-center gap-1 sm:gap-2 text-sm sm:text-lg md:text-xl font-bold font-mono">
                            {(p2RatingChange ?? 0) >= 0 ? (
                              <ArrowUp size={14} className="text-green-500 sm:w-5 sm:h-5" />
                            ) : (
                              <ArrowDown size={14} className="text-red-500 sm:w-5 sm:h-5" />
                            )}
                            <span className={(p2RatingChange ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'}>
                              {Math.abs(p2RatingChange ?? 0).toFixed(1)}
                            </span>
                          </div>
                          {p2Ratings && p2Ratings.ratingBefore !== null && p2Ratings.ratingAfter !== null && (
                            <div className="hidden sm:flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground font-mono">
                              <span className="font-semibold text-foreground">{Math.round(p2Ratings.ratingBefore)}</span>
                              <span className={(p2RatingChange ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'}>
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

          {(match.event_id || match.vod_link || seasonName) && (
            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 md:gap-6 pt-4 sm:pt-6 border-t border-border/30">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
                {seasonName && (
                  <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 rounded-full bg-muted/20 border border-border/30">
                    <span className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-heading">Season</span>
                    <span className="font-bold text-xs sm:text-sm">{seasonName}</span>
                  </div>
                )}

                {match.event_id && (
                  <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 rounded-full bg-muted/20 border border-border/30">
                    <span className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-heading">Event</span>
                    <Link
                      className="text-primary hover:text-primary/80 hover:underline font-bold text-xs sm:text-sm transition-colors max-w-[100px] sm:max-w-none truncate"
                      to="/events/$id" params={{ id: String(match.event_id) }}
                      onClick={() => onOpenChange(false)}
                    >
                      {eventTitle ?? 'Loading...'}
                    </Link>
                  </div>
                )}
              </div>

              {match.vod_link && (
                <a
                  href={match.vod_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded bg-red-600 hover:bg-red-700 text-white font-heading font-bold text-xs sm:text-sm uppercase tracking-wider transition-colors shadow-lg hover:shadow-red-600/20"
                >
                  {match.vod_link.includes('youtube.com') || match.vod_link.includes('youtu.be') ? (
                    <Youtube className="h-3 w-3 sm:h-4 sm:w-4" />
                  ) : match.vod_link.includes('twitch.tv') ? (
                    <svg className="h-3 w-3 sm:h-4 sm:w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
                    </svg>
                  ) : (
                    <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4" />
                  )}
                  Watch
                </a>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
