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
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Upcoming Matches</h1>

      {eventsWithMatches.map(event => (
        <Card key={event.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>{event.title}</CardTitle>
                <CardDescription>
                  {getEventTimeDisplay(event.event_date)}
                </CardDescription>
                {event.description && (
                  <p className="text-sm text-muted-foreground mt-2">{event.description}</p>
                )}
              </div>
              {event.stream_url && (
                <a
                  href={event.stream_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"
                >
                  Watch Stream
                </a>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {event.matches.length === 0 ? (
              <p className="text-muted-foreground text-sm">No matches scheduled for this event yet.</p>
            ) : (
              <div className="space-y-4">
                {event.matches.map((match, idx) => {
                  const { player1, player2 } = match
                  if (!player1 || !player2) {
                    return (
                      <div key={match.id} className="p-4 border rounded-lg">
                        <p className="text-muted-foreground">
                          Match {idx + 1}: Player data not found
                        </p>
                      </div>
                    )
                  }

                  const predictions = predictMatchRatingChanges(player1, player2)

                  return (
                    <div key={match.id} className="p-3 border rounded-lg">
                      <div className="text-xs font-medium text-muted-foreground mb-2">
                        Match {idx + 1}
                      </div>

                      {/* Match layout: Player1 | VS | Player2 */}
                      <div className="flex items-center justify-between gap-4">
                        {/* Player 1 */}
                        <div className="flex items-center gap-2 flex-1">
                          <Link to={`/players/${player1.id}`} className="hover:underline text-primary shrink-0">
                            <PlayerAvatar
                              name={player1.name}
                              twitter={player1.twitter}
                              size={40}
                              className="h-10 w-10"
                            />
                          </Link>
                          <div className="flex-1 min-w-0">
                            <Link to={`/players/${player1.id}`} className="hover:underline text-primary">
                              <div className="font-semibold text-sm leading-tight truncate">
                                {player1.name}
                              </div>
                            </Link>
                            <div className="text-xs text-muted-foreground leading-tight">
                              {player1.rating === null ? 'Unrated' : Math.round(player1.rating)}
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="text-green-600 dark:text-green-400 font-semibold text-sm leading-tight">
                              W:{formatRatingChange(predictions.player1.winRatingChange)}
                            </div>
                            <div className="text-red-600 dark:text-red-400 font-semibold text-sm leading-tight">
                              L:{formatRatingChange(predictions.player1.loseRatingChange)}
                            </div>
                          </div>
                        </div>

                        {/* VS */}
                        <div className="font-bold text-muted-foreground shrink-0">
                          VS
                        </div>

                        {/* Player 2 */}
                        <div className="flex items-center gap-2 flex-1 flex-row-reverse">
                          <Link to={`/players/${player2.id}`} className="hover:underline text-primary shrink-0">
                            <PlayerAvatar
                              name={player2.name}
                              twitter={player2.twitter}
                              size={40}
                              className="h-10 w-10"
                            />
                          </Link>
                          <div className="flex-1 min-w-0">
                            <Link to={`/players/${player2.id}`} className="hover:underline text-primary">
                              <div className="font-semibold text-sm leading-tight truncate text-right">
                                {player2.name}
                              </div>
                            </Link>
                            <div className="text-xs text-muted-foreground leading-tight text-right">
                              {player2.rating === null ? 'Unrated' : Math.round(player2.rating)}
                            </div>
                          </div>
                          <div className="shrink-0 text-left">
                            <div className="text-green-600 dark:text-green-400 font-semibold text-sm leading-tight">
                              W:{formatRatingChange(predictions.player2.winRatingChange)}
                            </div>
                            <div className="text-red-600 dark:text-red-400 font-semibold text-sm leading-tight">
                              L:{formatRatingChange(predictions.player2.loseRatingChange)}
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
