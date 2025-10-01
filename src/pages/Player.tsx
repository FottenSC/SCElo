import { useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { usePlayersAndMatches } from '@/lib/data'
import { computeRatings } from '@/lib/rankings'

function format(num: number, digits = 0) {
  return num.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  })
}

export default function Player() {
  const { id } = useParams<{ id: string }>()
  const { players, matches, loading } = usePlayersAndMatches()

  const player = useMemo(() => players.find((p) => p.id === id), [players, id])
  const ratings = useMemo(() => computeRatings(players, matches), [players, matches])
  const pr = ratings.find((r) => r.player.id === id)

  const myMatches = useMemo(() => matches.filter((m) => m.aId === id || m.bId === id), [matches, id])

  let w = 0,
    l = 0
  for (const m of myMatches) {
    if (m.winnerId === id) w++
    else l++
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Player</h2>
        <Link className="text-sm text-primary" to="/players">
          ← Back to Players
        </Link>
      </div>
      {loading && <p className="text-muted-foreground">Loading...</p>}
      {!player && !loading && <p className="text-muted-foreground">Player not found.</p>}
      {player && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{player.name}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <div className="text-muted-foreground text-xs">Rating</div>
                <div className="font-medium text-lg">{format(pr?.rating ?? 1500, 0)}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">RD</div>
                <div>{format(pr?.rd ?? 350, 0)}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Volatility</div>
                <div>{(pr?.vol ?? 0.06).toFixed(3)}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Record</div>
                <div>
                  <span className="font-medium">{w}</span>
                  <span className="mx-1 text-muted-foreground">-</span>
                  <span>{l}</span>
                </div>
              </div>
            </CardContent>
          </Card>

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
                      <th className="py-2 pr-4">Opponent</th>
                      <th className="py-2 pr-4">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myMatches.map((m) => {
                      const oppId = m.aId === id ? m.bId : m.aId
                      const opp = players.find((p) => p.id === oppId)
                      const won = m.winnerId === id
                      return (
                        <tr className="border-b last:border-0" key={m.id}>
                          <td className="py-2 pr-4 w-24">{m.id}</td>
                          <td className="py-2 pr-4">
                            <Link className="text-primary" to={`/players/${oppId}`}>{opp?.name ?? oppId}</Link>
                          </td>
                          <td className="py-2 pr-4">{won ? 'Win' : 'Loss'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </section>
  )
}
