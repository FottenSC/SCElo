import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { usePlayersAndMatches } from '@/lib/data'
import { Link } from 'react-router-dom'

export default function Matches() {
  const { players, matches, loading } = usePlayersAndMatches()
  const [query, setQuery] = React.useState('')
  const byId = new Map(players.map((p) => [p.id, p]))
  const sorted = [...matches].sort((a, b) => (b.at ?? 0) - (a.at ?? 0))
  const filtered = sorted.filter((m) => {
    const a = byId.get(m.aId)?.name ?? ''
    const b = byId.get(m.bId)?.name ?? ''
    const q = query.toLowerCase()
    return a.toLowerCase().includes(q) || b.toLowerCase().includes(q)
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
                  const a = byId.get(m.aId)!
                  const b = byId.get(m.bId)!
                  const winner = byId.get(m.winnerId)!
                  return (
                    <tr className="border-b last:border-0" key={m.id}>
                      <td className="py-2 pr-4 w-24">{m.id}</td>
                      <td className="py-2 pr-4">
                        <Link className="text-primary" to={`/players/${m.aId}`}>{a?.name ?? m.aId}</Link>
                      </td>
                      <td className="py-2 pr-4">
                        <Link className="text-primary" to={`/players/${m.bId}`}>{b?.name ?? m.bId}</Link>
                      </td>
                      <td className="py-2 pr-4 font-medium">
                        <Link className="text-primary" to={`/players/${m.winnerId}`}>{winner?.name ?? m.winnerId}</Link>
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
