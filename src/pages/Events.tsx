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
    ;(async () => {
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
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Events</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {eventsWithMatchCount.map(event => {
          const isPastEvent = new Date(event.event_date) < new Date()
          return (
            <Link key={event.id} to={`/events/${event.id}`}>
              <Card className="h-full hover:bg-accent transition-colors cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    {event.title}
                    {isPastEvent && (
                      <span className="text-xs font-normal text-muted-foreground px-2 py-1 bg-muted rounded">
                        Past
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription className="text-sm">
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
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {event.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-muted-foreground">
                      <span className="font-medium text-foreground">{event.matchCount}</span> matches
                    </div>
                    {event.matchCount > 0 && (
                      <div className="text-muted-foreground">
                        <span className="font-medium text-foreground">{event.completedCount}</span> completed
                      </div>
                    )}
                  </div>
                  {event.stream_url && (
                    <div className="mt-3 text-xs text-primary">
                      {isPastEvent ? '📺 VOD Available' : '🔴 Live Stream'}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
