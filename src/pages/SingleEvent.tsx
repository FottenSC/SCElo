import { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { fetchPlayers, fetchEvents, fetchMatches } from '@/lib/data'
import { predictMatchRatingChanges, formatRatingChange } from '@/lib/predictions'
import { getPlayerAvatarUrl, getPlayerInitials } from '@/lib/avatar'
import type { Player, Event, Match } from '@/types/models'

type MatchWithPlayers = Match & {
  player1?: Player
  player2?: Player
}

export default function SingleEvent() {
  const { id } = useParams<{ id: string }>()
  const [players, setPlayers] = useState<Player[]>([])
  const [event, setEvent] = useState<Event | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    ;(async () => {
      const [p, e, m] = await Promise.all([
        fetchPlayers(),
        fetchEvents(),
        fetchMatches()
      ])
      if (!active) return
      setPlayers(p)
      const foundEvent = e.find(ev => ev.id === Number(id))
      setEvent(foundEvent || null)
      setMatches(m.filter(match => match.event_id === Number(id)))
      setLoading(false)
    })()
    return () => {
      active = false
    }
  }, [id])

  const matchesWithPlayers = useMemo<MatchWithPlayers[]>(() => {
    if (!players.length || !matches.length) return []

    const playerMap = new Map(players.map(p => [p.id, p]))

    return matches
      .map(match => ({
        ...match,
        player1: playerMap.get(match.player1_id),
        player2: playerMap.get(match.player2_id)
      }))
      .sort((a, b) => (a.match_order ?? 0) - (b.match_order ?? 0))
  }, [players, matches])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Link to="/events">
            <Button variant="outline" size="sm">← Back to Events</Button>
          </Link>
        </div>
        <h1 className="text-3xl font-bold">Loading...</h1>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Link to="/events">
            <Button variant="outline" size="sm">← Back to Events</Button>
          </Link>
        </div>
        <h1 className="text-3xl font-bold">Event Not Found</h1>
        <p className="text-muted-foreground">The event you're looking for doesn't exist.</p>
      </div>
    )
  }

  const isPastEvent = new Date(event.event_date) < new Date()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/events">
          <Button variant="outline" size="sm">← Back to Events</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {event.title}
                {isPastEvent && (
                  <span className="text-xs font-normal text-muted-foreground px-2 py-1 bg-muted rounded">
                    Past Event
                  </span>
                )}
              </CardTitle>
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
                {isPastEvent ? 'Watch VOD' : 'Watch Stream'}
              </a>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {matchesWithPlayers.length === 0 ? (
            <p className="text-muted-foreground text-sm">No matches scheduled for this event yet.</p>
          ) : (
            <div className="space-y-4">
              {matchesWithPlayers.map((match, idx) => {
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

                const isCompleted = match.winner_id !== null
                const isP1Winner = match.winner_id === match.player1_id
                const predictions = isCompleted ? null : predictMatchRatingChanges(player1, player2)

                return (
                  <div key={match.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-muted-foreground">
                        Match {idx + 1}
                      </div>
                      {isCompleted && (
                        <div className="text-xs font-medium text-muted-foreground px-2 py-1 bg-muted rounded">
                          Completed
                        </div>
                      )}
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
                          <Link to={`/players/${player1.id}`} className="hover:underline">
                            <div className={`font-semibold ${isCompleted && isP1Winner ? 'text-primary' : ''}`}>
                              {player1.name}
                              {isCompleted && isP1Winner && ' 🏆'}
                            </div>
                          </Link>
                          <div className="text-sm text-muted-foreground">
                            Rating: {Math.round(player1.rating)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        {isCompleted ? (
                          <div className="text-sm font-medium">
                            <span className={match.rating_change_p1 && match.rating_change_p1 >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                              {match.rating_change_p1 !== null && match.rating_change_p1 !== undefined ? formatRatingChange(match.rating_change_p1) : '—'}
                            </span>
                          </div>
                        ) : predictions ? (
                          <>
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
                          </>
                        ) : null}
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
                          <Link to={`/players/${player2.id}`} className="hover:underline">
                            <div className={`font-semibold ${isCompleted && !isP1Winner ? 'text-primary' : ''}`}>
                              {player2.name}
                              {isCompleted && !isP1Winner && ' 🏆'}
                            </div>
                          </Link>
                          <div className="text-sm text-muted-foreground">
                            Rating: {Math.round(player2.rating)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        {isCompleted ? (
                          <div className="text-sm font-medium">
                            <span className={match.rating_change_p2 && match.rating_change_p2 >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                              {match.rating_change_p2 !== null && match.rating_change_p2 !== undefined ? formatRatingChange(match.rating_change_p2) : '—'}
                            </span>
                          </div>
                        ) : predictions ? (
                          <>
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
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
