import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { usePlayersAndMatches, fetchEvents } from '@/lib/data'
import { Link } from 'react-router-dom'
import { getPlayerAvatarUrl, getPlayerInitials } from '@/lib/avatar'
import { formatRatingChange } from '@/lib/predictions'
import type { Event } from '@/types/models'

export default function Matches() {
  const { players, matches, loading } = usePlayersAndMatches()
  const [events, setEvents] = React.useState<Event[]>([])
  const [query, setQuery] = React.useState('')
  
  React.useEffect(() => {
    let active = true
    ;(async () => {
      const e = await fetchEvents()
      if (!active) return
      setEvents(e)
    })()
    return () => {
      active = false
    }
  }, [])
  
  const byId = new Map(players.map((p) => [p.id, p]))
  const eventById = new Map(events.map((e) => [e.id, e]))
  const sorted = [...matches].sort((a, b) => b.id - a.id)
  const filtered = sorted.filter((m) => {
    const p1 = byId.get(m.player1_id)?.name ?? ''
    const p2 = byId.get(m.player2_id)?.name ?? ''
    const q = query.toLowerCase()
    return p1.toLowerCase().includes(q) || p2.toLowerCase().includes(q)
  })
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Matches</h2>
      {loading && <p className="text-muted-foreground">Loading...</p>}
      <div className="max-w-md">
        <Input
          placeholder="Filter by player name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Recent Matches</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pr-4">Player A</th>
                  <th className="py-2 pr-4">Rating Δ</th>
                  <th className="py-2 pr-4">Player B</th>
                  <th className="py-2 pr-4">Rating Δ</th>
                  <th className="py-2 pr-4">Winner</th>
                  <th className="py-2 pr-4">Event</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => {
                  const p1 = byId.get(m.player1_id)
                  const p2 = byId.get(m.player2_id)
                  const winner = m.winner_id ? byId.get(m.winner_id) : null
                  const event = m.event_id ? eventById.get(m.event_id) : null
                  const isP1Winner = m.winner_id === m.player1_id
                  return (
                    <tr className="border-b last:border-0" key={m.id}>
                      <td className="py-2 pr-4">
                        {p1 ? (
                          <Link 
                            className="flex items-center gap-2 text-primary hover:underline" 
                            to={`/players/${m.player1_id}`}
                          >
                            <Avatar className="h-6 w-6">
                              <AvatarImage 
                                src={getPlayerAvatarUrl(p1.twitter, 36, p1.name)} 
                                alt={p1.name}
                              />
                              <AvatarFallback className="text-xs">
                                {getPlayerInitials(p1.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className={isP1Winner ? 'font-semibold' : ''}>{p1.name}</span>
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">{m.player1_id}</span>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-sm font-medium">
                        {m.rating_change_p1 !== null && m.rating_change_p1 !== undefined ? (
                          <span className={m.rating_change_p1 >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                            {formatRatingChange(m.rating_change_p1)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        {p2 ? (
                          <Link 
                            className="flex items-center gap-2 text-primary hover:underline" 
                            to={`/players/${m.player2_id}`}
                          >
                            <Avatar className="h-6 w-6">
                              <AvatarImage 
                                src={getPlayerAvatarUrl(p2.twitter, 36, p2.name)} 
                                alt={p2.name}
                              />
                              <AvatarFallback className="text-xs">
                                {getPlayerInitials(p2.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className={!isP1Winner ? 'font-semibold' : ''}>{p2.name}</span>
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">{m.player2_id}</span>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-sm font-medium">
                        {m.rating_change_p2 !== null && m.rating_change_p2 !== undefined ? (
                          <span className={m.rating_change_p2 >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                            {formatRatingChange(m.rating_change_p2)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2 pr-4 font-medium">
                        {winner ? (
                          <Link className="text-primary hover:underline" to={`/players/${m.winner_id}`}>
                            {winner.name}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">{m.winner_id}</span>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-sm">
                        {event ? (
                          <Link className="text-primary hover:underline" to={`/events/${event.id}`}>
                            {event.title}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
