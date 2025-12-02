import { useEffect, useState, useMemo } from 'react'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { fetchPlayers, fetchUpcomingEvents, fetchUpcomingMatches } from '@/lib/data'
import { predictMatchRatingChanges, formatRatingChange } from '@/lib/predictions'
import { getPlayerAvatarUrl, getPlayerInitials } from '@/lib/avatar'
import type { Player, Event, Match } from '@/types/models'

type EventWithMatches = Event & {
  matches: Array<Match & {
    player1?: Player
    player2?: Player
  }>
}

export function UpcomingMatches() {
  useDocumentTitle('Upcoming Matches')
  const [players, setPlayers] = useState<Player[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
      ; (async () => {
        const [p, e, um] = await Promise.all([
          fetchPlayers(),
          fetchUpcomingEvents(),
          fetchUpcomingMatches()
        ])
        if (!active) return
        setPlayers(p)
        setEvents(e)
        setUpcomingMatches(um)
        setLoading(false)
      })()
    return () => {
      active = false
    }
  }, [])

  const eventsWithMatches = useMemo<EventWithMatches[]>(() => {
    if (!players.length || !events.length) return []

    const playerMap = new Map(players.map(p => [p.id, p]))

    return events.map(event => ({
      ...event,
      matches: upcomingMatches
        .filter(m => m.event_id === event.id)
        .map(match => ({
          ...match,
          player1: playerMap.get(match.player1_id),
          player2: playerMap.get(match.player2_id)
        }))
        .sort((a, b) => (a.match_order ?? 0) - (b.match_order ?? 0))
    }))
  }, [players, events, upcomingMatches])

  const getEventTimeDisplay = (eventDate: string): string => {
    const date = new Date(eventDate)
    date.setHours(date.getHours() + 3)
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Upcoming Matches</h1>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (eventsWithMatches.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Upcoming Matches</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">No upcoming events scheduled.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between border-b border-primary/30 pb-4">
        <h1 className="text-4xl font-heading font-bold text-primary drop-shadow-[0_0_10px_rgba(234,179,8,0.3)] uppercase tracking-widest">
          Upcoming Battles
        </h1>
        <div className="h-1 w-24 bg-primary/50 rounded-full" />
      </div>

      {eventsWithMatches.map(event => (
        <Card key={event.id} className="bg-card/80 backdrop-blur-md border-border/60 shadow-lg overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary/50 group-hover:bg-primary transition-colors" />
          <CardHeader className="bg-muted/30 border-b border-border/30 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="font-heading text-2xl text-foreground tracking-wide flex items-center gap-3">
                  {event.title}
                  <span className="text-xs font-body font-normal text-muted-foreground px-2 py-0.5 border border-border rounded uppercase tracking-wider">
                    Event
                  </span>
                </CardTitle>
                <CardDescription className="font-body text-base mt-1 flex items-center gap-2">
                  <span className="text-primary">📅</span> {getEventTimeDisplay(event.event_date)}
                </CardDescription>
                {event.description && (
                  <p className="text-sm text-muted-foreground mt-3 italic border-l-2 border-primary/30 pl-3">
                    "{event.description}"
                  </p>
                )}
              </div>
              {event.stream_url && (
                <a
                  href={event.stream_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-2 bg-primary/10 border border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 text-sm font-heading font-bold uppercase tracking-wider rounded-sm shadow-[0_0_10px_rgba(234,179,8,0.1)] hover:shadow-[0_0_15px_rgba(234,179,8,0.4)]"
                >
                  Watch Stream
                </a>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {event.matches.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground italic font-body">
                No battles scheduled for this event yet.
              </div>
            ) : (
              <div className="space-y-4">
                {event.matches.map((match, idx) => {
                  const { player1, player2 } = match
                  if (!player1 || !player2) {
                    return (
                      <div key={match.id} className="p-4 border border-destructive/30 bg-destructive/10 rounded text-destructive text-center font-heading">
                        Match {idx + 1}: Player data missing
                      </div>
                    )
                  }

                  const predictions = predictMatchRatingChanges(player1, player2)

                  return (
                    <div key={match.id} className="relative p-4 border border-border/40 bg-background/40 rounded-sm hover:border-primary/50 transition-colors group/match">
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs font-heading font-bold text-muted-foreground uppercase tracking-widest border border-border/30 rounded-full">
                        Match {idx + 1}
                      </div>

                      <div className="flex items-center justify-between gap-4 mt-2">
                        <div className="flex items-center gap-4 flex-1">
                          <Link to={`/players/${player1.id}`} className="relative shrink-0 group/p1">
                            <div className="absolute inset-0 bg-primary/20 rounded-full blur-md opacity-0 group-hover/p1:opacity-100 transition-opacity" />
                            <PlayerAvatar
                              name={player1.name}
                              twitter={player1.twitter}
                              size={56}
                              className="h-14 w-14 border-2 border-border group-hover/p1:border-primary transition-colors relative z-10"
                            />
                          </Link>
                          <div className="flex-1 min-w-0">
                            <Link to={`/players/${player1.id}`} className="hover:text-primary transition-colors block">
                              <div className="font-heading font-bold text-lg leading-tight truncate">
                                {player1.name}
                              </div>
                            </Link>
                            <div className="text-xs font-body text-muted-foreground uppercase tracking-wider mt-0.5">
                              Rating: <span className="text-foreground font-bold">{player1.rating === null ? 'Unrated' : Math.round(player1.rating)}</span>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs font-bold">
                              <span className="text-green-500 drop-shadow-[0_0_5px_rgba(34,197,94,0.3)]">
                                +{formatRatingChange(predictions.player1.winRatingChange)}
                              </span>
                              <span className="text-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.3)]">
                                {formatRatingChange(predictions.player1.loseRatingChange)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="font-heading font-black text-2xl text-primary/20 shrink-0 px-4 select-none group-hover/match:text-primary/40 transition-colors italic">
                          VS
                        </div>

                        <div className="flex items-center gap-4 flex-1 flex-row-reverse text-right">
                          <Link to={`/players/${player2.id}`} className="relative shrink-0 group/p2">
                            <div className="absolute inset-0 bg-primary/20 rounded-full blur-md opacity-0 group-hover/p2:opacity-100 transition-opacity" />
                            <PlayerAvatar
                              name={player2.name}
                              twitter={player2.twitter}
                              size={56}
                              className="h-14 w-14 border-2 border-border group-hover/p2:border-primary transition-colors relative z-10"
                            />
                          </Link>
                          <div className="flex-1 min-w-0">
                            <Link to={`/players/${player2.id}`} className="hover:text-primary transition-colors block">
                              <div className="font-heading font-bold text-lg leading-tight truncate">
                                {player2.name}
                              </div>
                            </Link>
                            <div className="text-xs font-body text-muted-foreground uppercase tracking-wider mt-0.5">
                              Rating: <span className="text-foreground font-bold">{player2.rating === null ? 'Unrated' : Math.round(player2.rating)}</span>
                            </div>
                            <div className="flex items-center justify-end gap-3 mt-1 text-xs font-bold">
                              <span className="text-green-500 drop-shadow-[0_0_5px_rgba(34,197,94,0.3)]">
                                +{formatRatingChange(predictions.player2.winRatingChange)}
                              </span>
                              <span className="text-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.3)]">
                                {formatRatingChange(predictions.player2.loseRatingChange)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
