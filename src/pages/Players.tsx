import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Link } from 'react-router-dom'
import { usePlayersAndMatches } from '@/lib/data'
import { getPlayerAvatarUrl, getPlayerInitials } from '@/lib/avatar'

function format(num: number, digits = 0) {
  return num.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  })
}

export default function Players() {
  const { players, matches, loading, error } = usePlayersAndMatches()
  const [query, setQuery] = useState('')

  // Compute win/loss records with defensive programming
  const winLossMap = useMemo(() => {
    const wl = new Map<number, { w: number; l: number }>()
    
    // Initialize all players with 0-0 record
    players.forEach(p => {
      wl.set(p.id, { w: 0, l: 0 })
    })

    // Calculate win/loss from matches
    matches.forEach(m => {
      const p1Record = wl.get(m.player1_id)
      const p2Record = wl.get(m.player2_id)
      
      // Only count matches where both players exist
      if (!p1Record || !p2Record) return

      if (m.winner_id === m.player1_id) {
        p1Record.w++
        p2Record.l++
      } else if (m.winner_id === m.player2_id) {
        p2Record.w++
        p1Record.l++
      }
    })

    return wl
  }, [players, matches])

  // Filter players based on search query
  const filteredPlayers = useMemo(() => {
    if (!query.trim()) return players
    const lowerQuery = query.toLowerCase()
    return players.filter(p => 
      p.name.toLowerCase().includes(lowerQuery)
    )
  }, [players, query])

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Players</h2>
      
      {loading && <p className="text-muted-foreground">Loading players...</p>}
      
      {error && (
        <div className="text-red-500 text-sm">
          Error loading data: {error}
        </div>
      )}
      
      {!loading && (
        <>
          <div className="max-w-md">
            <Input
              placeholder="Search players..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={players.length === 0}
            />
          </div>
          
          {filteredPlayers.length === 0 && !query && (
            <p className="text-muted-foreground">No players found.</p>
          )}
          
          {filteredPlayers.length === 0 && query && (
            <p className="text-muted-foreground">
              No players match "{query}"
            </p>
          )}
          
          {filteredPlayers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  All Players {query && `(${filteredPlayers.length} results)`}
                </CardTitle>
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
                      {filteredPlayers.map((player, i) => {
                        const record = winLossMap.get(player.id) ?? { w: 0, l: 0 }
                        return (
                          <tr className="border-b last:border-0" key={player.id}>
                            <td className="py-2 pr-4 w-10">{i + 1}</td>
                            <td className="py-2 pr-4">
                              <Link 
                                className="flex items-center gap-2 text-primary hover:underline" 
                                to={`/players/${player.id}`}
                              >
                                <Avatar className="h-8 w-8">
                                  <AvatarImage 
                                    src={getPlayerAvatarUrl(player.twitter, 48, player.name)} 
                                    alt={player.name}
                                  />
                                  <AvatarFallback className="text-xs">
                                    {getPlayerInitials(player.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <span>{player.name}</span>
                              </Link>
                            </td>
                            <td className="py-2 pr-4 font-medium">{format(player.rating, 0)}</td>
                            <td className="py-2 pr-4">{format(player.rd, 0)}</td>
                            <td className="py-2 pr-4">
                              <span className="font-medium">{record.w}</span>
                              <span className="mx-1 text-muted-foreground">-</span>
                              <span>{record.l}</span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </section>
  )
}
