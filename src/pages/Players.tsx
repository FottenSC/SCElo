import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Link } from 'react-router-dom'
import { usePlayersAndMatches } from '@/lib/data'
import { computeRatings, sortByRatingDesc } from '@/lib/rankings'

function format(num: number, digits = 0) {
  return num.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  })
}

export default function Players() {
  const { players, matches, loading } = usePlayersAndMatches()
  const [query, setQuery] = React.useState('')
  const ratings = sortByRatingDesc(computeRatings(players, matches))
  const filtered = ratings.filter((r) => r.player.name.toLowerCase().includes(query.toLowerCase()))

  const wl = new Map<string, { w: number; l: number }>()
  for (const p of players) wl.set(p.id, { w: 0, l: 0 })
  for (const m of matches) {
    const a = wl.get(m.aId)!
    const b = wl.get(m.bId)!
    if (m.winnerId === m.aId) {
      a.w++
      b.l++
    } else {
      b.w++
      a.l++
    }
  }

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Players</h2>
      {loading && <p className="text-muted-foreground">Loading...</p>}
      <div className="max-w-md">
        <Input
          placeholder="Search players..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Players</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pr-4">#</th>
                  <th className="py-2 pr-4">Player</th>
                  <th className="py-2 pr-4">Rating</th>
                  <th className="py-2 pr-4">RD</th>
                  <th className="py-2 pr-4">W-L</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const rec = wl.get(r.player.id)!
                  return (
                    <tr className="border-b last:border-0" key={r.player.id}>
                      <td className="py-2 pr-4 w-10">{i + 1}</td>
                      <td className="py-2 pr-4">
                        <Link className="text-primary" to={`/players/${r.player.id}`}>{r.player.name}</Link>
                      </td>
                      <td className="py-2 pr-4 font-medium">{format(r.rating, 0)}</td>
                      <td className="py-2 pr-4">{format(r.rd, 0)}</td>
                      <td className="py-2 pr-4">
                        <span className="font-medium">{rec.w}</span>
                        <span className="mx-1 text-muted-foreground">-</span>
                        <span>{rec.l}</span>
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
