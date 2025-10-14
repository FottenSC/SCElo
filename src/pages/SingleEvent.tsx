import { useEffect, useState, useMemo } from 'react'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useParams, Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { fetchPlayers, fetchEvents, fetchMatches } from '@/lib/data'
import { MatchCard } from '@/components/MatchCard'
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
    useDocumentTitle('Event')
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
    useDocumentTitle('Event Not Found')
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
  useDocumentTitle(`Event - ${event.title}`)

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
            <div className="flex flex-col gap-2">
              {event.stream_url && (
                <a
                  href={event.stream_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium text-center"
                >
                  {isPastEvent ? 'Stream VOD' : 'Watch Stream'}
                </a>
              )}
              {event.vod_link && (
                <a
                  href={event.vod_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors text-sm font-medium text-center"
                >
                  Event VOD
                </a>
              )}
            </div>
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

                return (
                  <MatchCard
                    key={match.id}
                    match={match}
                    player1={player1}
                    player2={player2}
                    event={event}
                    showMatchNumber
                    matchNumber={idx + 1}
                    showEventLink={false}
                  />
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
