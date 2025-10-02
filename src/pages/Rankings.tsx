import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Link } from 'react-router-dom'
import { usePlayersAndMatches } from '@/lib/data'
import { getPlayerAvatarUrl, getPlayerInitials } from '@/lib/avatar'

function format(num: number, digits = 0) {
  return num.toLocaleString(undefined, { 
    maximumFractionDigits: digits, 
    minimumFractionDigits: digits 
  })
}

export default function Rankings() {
  const { players, loading, error } = usePlayersAndMatches()
  
  // Players are already sorted by rating from the database query
  const rankedPlayers = players

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Rankings</h2>
      
      {loading && <p className="text-muted-foreground">Loading rankings...</p>}
      
      {error && (
        <div className="text-red-500 text-sm">
          Error loading data: {error}
        </div>
      )}
      
      {!loading && !error && rankedPlayers.length === 0 && (
        <p className="text-muted-foreground">No players found.</p>
      )}
      
      {!loading && rankedPlayers.length > 0 && (
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
                  {rankedPlayers.map((player, i) => (
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
                      <td className="py-2 pr-4">{player.volatility.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  )
}
