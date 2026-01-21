import { useEffect, useState, useMemo } from 'react'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useParams, Link } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { fetchPlayers, fetchEvents, fetchMatches } from '@/lib/data'
import { MatchCard } from '@/components/MatchCard'
import type { Player, Event, Match } from '@/types/models'
import { Skeleton } from '@/components/ui/skeleton'
import { PageTransition } from '@/components/PageTransition'
import { Youtube } from 'lucide-react'

type MatchWithPlayers = Match & {
  player1?: Player
  player2?: Player
}

export default function SingleEvent() {
  const { id } = useParams({ strict: false })
  const [players, setPlayers] = useState<Player[]>([])
  const [event, setEvent] = useState<Event | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
      ; (async () => {
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

  useDocumentTitle(
    loading ? 'Event' :
      !event ? 'Event Not Found' :
        `Event - ${event.title}`
  )

  const content = (() => {
    if (loading) {
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-9 w-32" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-12 w-96" />
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-20 w-full" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <div className="flex items-center justify-center gap-4 p-4">
                    <div className="flex items-center gap-3 flex-1 justify-end">
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-12 w-12 rounded-full" />
                    </div>
                    <Skeleton className="h-8 w-16" />
                    <div className="flex items-center gap-3 flex-1 justify-start">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <Skeleton className="h-5 w-24" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
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
            <Button variant="ghost" size="sm" className="hover:bg-primary/10 hover:text-primary transition-colors font-heading uppercase tracking-wider font-bold">
              ← Back to Events
            </Button>
          </Link>
        </div>

        <Card className="bg-card/80 backdrop-blur-md border-border/60 shadow-lg overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          <CardHeader className="border-b border-border/30 bg-muted/20 relative z-10">
            <div className="flex flex-col md:flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-3 font-heading text-3xl font-bold tracking-wide text-primary drop-shadow-md">
                  {event.title}
                  {isPastEvent && (
                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-2 py-1 bg-muted/50 rounded border border-border/50">
                      Past Event
                    </span>
                  )}
                </CardTitle>
                <CardDescription className="font-body text-lg mt-1">
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
                  <p className="text-sm text-muted-foreground mt-4 max-w-2xl leading-relaxed border-l-2 border-primary/30 pl-4 italic">
                    {event.description}
                  </p>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                {event.stream_url && (
                  <a
                    href={event.stream_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-all shadow-lg hover:shadow-primary/25 font-heading font-bold uppercase tracking-wider text-sm text-center flex items-center justify-center gap-2"
                  >
                    <span className="text-lg">📺</span> Watch Stream
                  </a>
                )}
                {event.vod_link && (
                  <a
                    href={event.vod_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-2 border-2 border-red-600 text-red-600 rounded hover:bg-red-600 hover:text-white transition-all shadow-lg hover:shadow-red-600/25 font-heading font-bold uppercase tracking-wider text-sm text-center flex items-center justify-center gap-2"
                  >
                    <Youtube className="w-5 h-5" /> Watch
                  </a>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 relative z-10">
            {matchesWithPlayers.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-border/30 rounded-lg bg-card/30">
                <p className="text-muted-foreground font-heading uppercase tracking-wider">No matches scheduled for this event yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {matchesWithPlayers.map((match, idx) => {
                  const { player1, player2 } = match
                  if (!player1 || !player2) {
                    return (
                      <div key={match.id} className="p-4 border border-border/40 rounded-lg bg-card/30 backdrop-blur-sm">
                        <p className="text-muted-foreground italic">
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

          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />
        </Card>
      </div>
    )
  })()

  return (
    <PageTransition>
      {content}
    </PageTransition>
  )
}
