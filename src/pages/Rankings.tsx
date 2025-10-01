import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Link } from 'react-router-dom'
import { usePlayersAndMatches } from '@/lib/data'
import { computeRatings, sortByRatingDesc } from '@/lib/rankings'

function format(num: number, digits = 0) {
  return num.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits })
}

export default function Rankings() {
  const { players, matches, loading } = usePlayersAndMatches()
  const ratings = sortByRatingDesc(computeRatings(players, matches))
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Rankings</h2>
      {loading && <p className="text-muted-foreground">Loading...</p>}
      <Card>
        <CardHeader>
          <CardTitle>Current Ratings</CardTitle>
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
                  <th className="py-2 pr-4">Vol</th>
                </tr>
              </thead>
              <tbody>
                {ratings.map((r, i) => (
                  <tr className="border-b last:border-0" key={r.player.id}>
                    <td className="py-2 pr-4 w-10">{i + 1}</td>
                    <td className="py-2 pr-4">
                      <Link className="text-primary" to={`/players/${r.player.id}`}>{r.player.name}</Link>
                    </td>
                    <td className="py-2 pr-4 font-medium">{format(r.rating, 0)}</td>
                    <td className="py-2 pr-4">{format(r.rd, 0)}</td>
                    <td className="py-2 pr-4">{r.vol.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
