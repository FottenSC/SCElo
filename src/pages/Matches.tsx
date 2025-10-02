import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { usePlayersAndMatches } from '@/lib/data'
import { Link } from 'react-router-dom'
import { getPlayerAvatarUrl, getPlayerInitials } from '@/lib/avatar'

export default function Matches() {
  const { players, matches, loading } = usePlayersAndMatches()
  const [query, setQuery] = React.useState('')
  const byId = new Map(players.map((p) => [p.id, p]))
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
                  <th className="py-2 pr-4">ID</th>
                  <th className="py-2 pr-4">Player A</th>
                  <th className="py-2 pr-4">Player B</th>
                  <th className="py-2 pr-4">Winner</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => {
                  const p1 = byId.get(m.player1_id)
                  const p2 = byId.get(m.player2_id)
                  const winner = byId.get(m.winner_id)
                  const isP1Winner = m.winner_id === m.player1_id
                  return (
                    <tr className="border-b last:border-0" key={m.id}>
                      <td className="py-2 pr-4 w-24">{m.id}</td>
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
                      <td className="py-2 pr-4 font-medium">
                        {winner ? (
                          <Link className="text-primary hover:underline" to={`/players/${m.winner_id}`}>
                            {winner.name}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">{m.winner_id}</span>
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
