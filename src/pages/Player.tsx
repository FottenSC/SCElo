import { useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { usePlayersAndMatches } from '@/lib/data'
import { getPlayerAvatarUrl, getPlayerInitials } from '@/lib/avatar'

function format(num: number, digits = 0) {
  return num.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  })
}

export default function Player() {
  const { id } = useParams<{ id: string }>()
  const playerId = id ? parseInt(id, 10) : undefined
  const { players, matches, loading } = usePlayersAndMatches()

  const player = useMemo(() => players.find((p) => p.id === playerId), [players, playerId])

  const myMatches = useMemo(() => matches.filter((m) => m.player1_id === playerId || m.player2_id === playerId), [matches, playerId])

  let w = 0,
    l = 0
  for (const m of myMatches) {
    if (!m.winner_id) continue // Skip upcoming matches (shouldn't happen with fetchCompletedMatches, but be defensive)
    if (m.winner_id === playerId) w++
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
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage 
                    src={getPlayerAvatarUrl(player.twitter, 96, player.name)} 
                    alt={player.name}
                  />
                  <AvatarFallback className="text-2xl">
                    {getPlayerInitials(player.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle>{player.name}</CardTitle>
                  {player.twitter && (
                    <a 
                      href={`https://twitter.com/${player.twitter.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-primary"
                    >
                      @{player.twitter.replace('@', '')}
                    </a>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <div className="text-muted-foreground text-xs">Rating</div>
                <div className="font-medium text-lg">{format(player.rating, 0)}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">RD</div>
                <div>{format(player.rd, 0)}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Volatility</div>
                <div>{player.volatility.toFixed(3)}</div>
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
                      const oppId = m.player1_id === playerId ? m.player2_id : m.player1_id
                      const opp = players.find((p) => p.id === oppId)
                      const won = m.winner_id === playerId
                      return (
                        <tr className="border-b last:border-0" key={m.id}>
                          <td className="py-2 pr-4 w-24">{m.id}</td>
                          <td className="py-2 pr-4">
                            {opp ? (
                              <Link 
                                className="flex items-center gap-2 text-primary hover:underline" 
                                to={`/players/${oppId}`}
                              >
                                <Avatar className="h-6 w-6">
                                  <AvatarImage 
                                    src={getPlayerAvatarUrl(opp.twitter, 36, opp.name)} 
                                    alt={opp.name}
                                  />
                                  <AvatarFallback className="text-xs">
                                    {getPlayerInitials(opp.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <span>{opp.name}</span>
                              </Link>
                            ) : (
                              <span className="text-muted-foreground">{oppId}</span>
                            )}
                          </td>
                          <td className="py-2 pr-4">
                            <span className={won ? 'text-green-600 font-medium' : 'text-red-600'}>
                              {won ? 'Win' : 'Loss'}
                            </span>
                          </td>
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
