import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
  const [players, setPlayers] = useState<Player[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    ;(async () => {
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
                  {new Date(event.event_date).toLocaleString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
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
                    <div key={match.id} className="p-4 border rounded-lg space-y-3">
                      <div className="text-sm font-medium text-muted-foreground">
                        Match {idx + 1}
                      </div>
                      
                      {/* Player 1 */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <Avatar className="h-12 w-12">
                            <AvatarImage
                              src={getPlayerAvatarUrl(player1.twitter, 72, player1.name)}
                              alt={player1.name}
                            />
                            <AvatarFallback>{getPlayerInitials(player1.name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-semibold">
                              <Link to={`/players/${player1.id}`} className="hover:underline text-primary">
                                {player1.name}
                              </Link>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Rating: {Math.round(player1.rating)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <div className="text-sm">
                            <span className="text-green-600 dark:text-green-400 font-medium">
                              Win: {formatRatingChange(predictions.player1.winRatingChange)}
                            </span>
                            <span className="text-muted-foreground text-xs ml-1">
                              (→{Math.round(predictions.player1.winNewRating)})
                            </span>
                          </div>
                          <div className="text-sm">
                            <span className="text-red-600 dark:text-red-400 font-medium">
                              Loss: {formatRatingChange(predictions.player1.loseRatingChange)}
                            </span>
                            <span className="text-muted-foreground text-xs ml-1">
                              (→{Math.round(predictions.player1.loseNewRating)})
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-center text-muted-foreground font-semibold">
                        VS
                      </div>

                      {/* Player 2 */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <Avatar className="h-12 w-12">
                            <AvatarImage
                              src={getPlayerAvatarUrl(player2.twitter, 72, player2.name)}
                              alt={player2.name}
                            />
                            <AvatarFallback>{getPlayerInitials(player2.name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-semibold">
                              <Link to={`/players/${player2.id}`} className="hover:underline text-primary">
                                {player2.name}
                              </Link>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Rating: {Math.round(player2.rating)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <div className="text-sm">
                            <span className="text-green-600 dark:text-green-400 font-medium">
                              Win: {formatRatingChange(predictions.player2.winRatingChange)}
                            </span>
                            <span className="text-muted-foreground text-xs ml-1">
                              (→{Math.round(predictions.player2.winNewRating)})
                            </span>
                          </div>
                          <div className="text-sm">
                            <span className="text-red-600 dark:text-red-400 font-medium">
                              Loss: {formatRatingChange(predictions.player2.loseRatingChange)}
                            </span>
                            <span className="text-muted-foreground text-xs ml-1">
                              (→{Math.round(predictions.player2.loseNewRating)})
                            </span>
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
