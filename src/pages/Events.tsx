import { useEffect, useState, useMemo } from 'react'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { fetchEvents, fetchMatches } from '@/lib/data'
import { Link } from 'react-router-dom'
import type { Event, Match } from '@/types/models'

type EventWithMatchCount = Event & {
  matchCount: number
  completedCount: number
}

export default function Events() {
  useDocumentTitle('Events')
  const [events, setEvents] = useState<Event[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
      ; (async () => {
        const [e, m] = await Promise.all([
          fetchEvents(),
          fetchMatches()
        ])
        if (!active) return
        setEvents(e)
        setMatches(m)
        setLoading(false)
      })()
    return () => {
      active = false
    }
  }, [])

  const eventsWithMatchCount = useMemo<EventWithMatchCount[]>(() => {
    if (!events.length) return []

    return events.map(event => {
      const eventMatches = matches.filter(m => m.event_id === event.id)
      const completedMatches = eventMatches.filter(m => m.winner_id !== null)

      return {
        ...event,
        matchCount: eventMatches.length,
        completedCount: completedMatches.length
      }
    })
  }, [events, matches])

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Events</h1>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (eventsWithMatchCount.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Events</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">No events found.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl md:text-5xl font-heading font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary/80 to-primary/50 drop-shadow-sm">
          Events
        </h1>
        <p className="text-muted-foreground font-body text-lg max-w-2xl">
          Upcoming tournaments and past battle records.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {eventsWithMatchCount.map(event => {
          const isPastEvent = new Date(event.event_date) < new Date()
          return (
            <Link key={event.id} to={`/events/${event.id}`} className="group block h-full">
              <Card className="h-full bg-card/40 backdrop-blur-sm border-border/40 hover:bg-card/60 hover:border-primary/50 transition-all duration-300 hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.15)] overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/0 to-transparent group-hover:via-primary/50 transition-all duration-500" />

                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-4">
                    <CardTitle className="font-heading text-xl font-bold tracking-wide group-hover:text-primary transition-colors line-clamp-2">
                      {event.title}
                    </CardTitle>
                    {isPastEvent ? (
                      <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2 py-1 bg-muted/50 rounded border border-border/50">
                        Past
                      </span>
                    ) : (
                      <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-green-500 px-2 py-1 bg-green-500/10 rounded border border-green-500/20 animate-pulse">
                        Upcoming
                      </span>
                    )}
                  </div>
                  <CardDescription className="font-mono text-xs uppercase tracking-wider mt-1">
                    {new Date(event.event_date).toLocaleString('en-US', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  {event.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2 border-l-2 border-primary/20 pl-3 italic">
                      {event.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Matches</span>
                        <span className="font-heading font-bold text-lg">{event.matchCount}</span>
                      </div>
                      {event.matchCount > 0 && (
                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Completed</span>
                          <span className="font-heading font-bold text-lg text-primary">{event.completedCount}</span>
                        </div>
                      )}
                    </div>

                    {event.stream_url && (
                      <div className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${isPastEvent ? 'text-muted-foreground' : 'text-red-500'}`}>
                        {isPastEvent ? (
                          <>
                            <span>📺</span> VOD
                          </>
                        ) : (
                          <>
                            <span className="relative flex h-2 w-2 mr-1">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                            Live
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
