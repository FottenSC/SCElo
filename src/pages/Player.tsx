import { useMemo, useState, useEffect } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Pagination } from '@/components/ui/pagination'
import { usePlayersAndMatches, fetchEvents } from '@/lib/data'
import { getPlayerAvatarUrl, getPlayerInitials } from '@/lib/avatar'
import { formatRatingChange } from '@/lib/predictions'
import { useMatchModal } from '@/components/MatchModalContext'
import { Link as LinkIcon, ArrowUp, ArrowDown, Trophy, TrendingUp } from 'lucide-react'
import type { Event } from '@/types/models'

const ITEMS_PER_PAGE = 20

function format(num: number, digits = 0) {
  return num.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  })
}

export default function Player() {
  const { id } = useParams()
  const playerId = parseInt(id!)
  const [searchParams, setSearchParams] = useSearchParams()
  const currentPage = parseInt(searchParams.get('page') || '1', 10)
  const { openMatch } = useMatchModal()
  const [historyCount, setHistoryCount] = useState<10 | 50 | 'all'>(10)
  
  const { players, matches, loading } = usePlayersAndMatches()
  const [events, setEvents] = useState<Event[]>([])
  
  useEffect(() => {
    let active = true
    ;(async () => {
      const ev = await fetchEvents()
      if (!active) return
      setEvents(ev)
    })()
    return () => { active = false }
  }, [])

  const player = useMemo(() => players.find((p) => p.id === playerId), [players, playerId])

  // Calculate player rank
  const playerRank = useMemo(() => {
    if (!player) return null
    const sorted = [...players].sort((a, b) => b.rating - a.rating)
    return sorted.findIndex(p => p.id === player.id) + 1
  }, [players, player])

  const myMatches = useMemo(() => {
    const filtered = matches.filter((m) => m.player1_id === playerId || m.player2_id === playerId)
    // sort by most recent first
    return filtered.sort((a, b) => b.id - a.id)
  }, [matches, playerId])
  
  // Calculate stats
  const stats = useMemo(() => {
    let w = 0, l = 0
    const recentForm: ('W' | 'L')[] = []
    
    for (const m of myMatches) {
      if (!m.winner_id) continue
      const won = m.winner_id === playerId
      if (won) {
        w++
        if (recentForm.length < 10) recentForm.push('W')
      } else {
        l++
        if (recentForm.length < 10) recentForm.push('L')
      }
    }
    
    const winRate = w + l > 0 ? (w / (w + l)) * 100 : 0
    
    return { w, l, winRate, recentForm }
  }, [myMatches, playerId])

  // Rating progression based on selected count
  const ratingHistory = useMemo(() => {
    if (!player) return []
    
    // Determine how many matches to show
    const count = historyCount === 'all' ? myMatches.length : historyCount
    
    // Get last N matches in chronological order (oldest to newest)
    const selectedMatches = [...myMatches].slice(0, count).reverse()
    
    if (selectedMatches.length === 0) return []
    
    // Calculate the starting rating by working backwards from current rating
    let startingRating = player.rating
    for (const m of selectedMatches) {
      if (!m.winner_id) continue
      const ratingChange = m.player1_id === playerId ? (m.rating_change_p1 || 0) : (m.rating_change_p2 || 0)
      startingRating -= ratingChange
    }
    
    // Now build the history forwards with opponent info
    const history: Array<{ 
      matchNum: number
      rating: number
      change: number
      won: boolean
      matchId: number
      opponentName: string
      eventTitle: string | null
    }> = []
    let currentRating = startingRating
    
    selectedMatches.forEach((m, index) => {
      if (!m.winner_id) return
      
      const ratingChange = m.player1_id === playerId ? (m.rating_change_p1 || 0) : (m.rating_change_p2 || 0)
      const won = m.winner_id === playerId
      const oppId = m.player1_id === playerId ? m.player2_id : m.player1_id
      const opponent = players.find(p => p.id === oppId)
      const event = m.event_id ? events.find(e => e.id === m.event_id) : null
      
      currentRating += ratingChange
      
      history.push({
        matchNum: index + 1,
        rating: currentRating,
        change: ratingChange,
        won,
        matchId: m.id,
        opponentName: opponent?.name || `Player ${oppId}`,
        eventTitle: event?.title || null
      })
    })
    
    return history
  }, [myMatches, playerId, player, players, events, historyCount])
  
  // Pagination calculations
  const totalPages = Math.ceil(myMatches.length / ITEMS_PER_PAGE)
  const paginatedMatches = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    const end = start + ITEMS_PER_PAGE
    return myMatches.slice(start, end)
  }, [myMatches, currentPage])
  
  const setCurrentPage = (page: number) => {
    setSearchParams({ page: page.toString() })
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
                <div className="text-muted-foreground text-xs">
                  <span className="sm:hidden">Rtng</span>
                  <span className="hidden sm:inline">Rating</span>
                </div>
                <div className="font-medium text-lg">{format(player.rating, 0)}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">RD</div>
                <div>{format(player.rd, 0)}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">
                  <span className="sm:hidden">Vol</span>
                  <span className="hidden sm:inline">Volatility</span>
                </div>
                <div>{player.volatility.toFixed(3)}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">
                  <span className="sm:hidden">W-L</span>
                  <span className="hidden sm:inline">Record</span>
                </div>
                <div>
                  <span className="font-medium">{stats.w}</span>
                  <span className="mx-1 text-muted-foreground">-</span>
                  <span>{stats.l}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({stats.winRate.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Stats Card */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Ranking & Peak */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Trophy size={18} className="text-yellow-500" />
                  Rankings & Achievements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Current Rank</span>
                  <span className="font-semibold text-lg">
                    #{playerRank}
                    {playerRank && playerRank <= 10 && (
                      <span className="ml-2 text-xs bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 px-2 py-0.5 rounded">
                        Top 10
                      </span>
                    )}
                  </span>
                </div>
                {player.peak_rating && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Peak Rating</span>
                    <div className="text-right">
                      <div className="font-semibold">{format(player.peak_rating, 0)}</div>
                      {player.peak_rating_date && (
                        <div className="text-xs text-muted-foreground">
                          {new Date(player.peak_rating_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Matches</span>
                  <span className="font-semibold">{myMatches.length}</span>
                </div>
              </CardContent>
            </Card>

            {/* Recent Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp size={18} className="text-blue-500" />
                  Recent Form
                </CardTitle>
                <CardDescription>Last 10 matches</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {stats.recentForm.length === 0 ? (
                    <span className="text-sm text-muted-foreground">No recent matches</span>
                  ) : (
                    stats.recentForm.map((result, i) => (
                      <div
                        key={i}
                        className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold ${
                          result === 'W'
                            ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                            : 'bg-red-500/20 text-red-600 dark:text-red-400'
                        }`}
                      >
                        {result}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Rating Progression */}
          {ratingHistory.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <TrendingUp size={18} className="text-purple-500" />
                      Rating Progression
                    </CardTitle>
                    <CardDescription>Last {ratingHistory.length} matches</CardDescription>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setHistoryCount(10)}
                      className={`px-3 py-1 text-sm rounded transition-colors ${
                        historyCount === 10
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                      }`}
                    >
                      10
                    </button>
                    <button
                      onClick={() => setHistoryCount(50)}
                      className={`px-3 py-1 text-sm rounded transition-colors ${
                        historyCount === 50
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                      }`}
                    >
                      50
                    </button>
                    <button
                      onClick={() => setHistoryCount('all')}
                      className={`px-3 py-1 text-sm rounded transition-colors ${
                        historyCount === 'all'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                      }`}
                    >
                      All
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Simple line graph using divs */}
                  <div className="relative h-32 overflow-x-auto pb-2 pt-6" style={{ overflowY: 'visible' }}>
                    <div className={`flex items-end justify-between ${ratingHistory.length > 50 ? 'gap-0.5' : ratingHistory.length > 20 ? 'gap-1' : 'gap-1'} px-2`} style={{ minWidth: ratingHistory.length > 50 ? `${ratingHistory.length * 8}px` : '100%' }}>
                      {ratingHistory.map((point, index) => {
                        const allRatings = ratingHistory.map(p => p.rating)
                        const minRating = Math.min(...allRatings)
                        const maxRating = Math.max(...allRatings)
                        const range = maxRating - minRating || 1
                        const heightPercent = ((point.rating - minRating) / range) * 100
                        
                        // Show rating number only for certain points based on count
                        const showRatingNumber = ratingHistory.length <= 20 || index % Math.ceil(ratingHistory.length / 20) === 0
                        
                        // Adjust tooltip position for edge cases
                        const isNearEnd = index >= ratingHistory.length - 2
                        const isNearStart = index <= 1
                        
                        return (
                          <div key={index} className="flex-1 flex flex-col items-center gap-1 relative group" style={{ minWidth: ratingHistory.length > 50 ? '6px' : 'auto' }}>
                            <div className="relative w-full flex items-end justify-center" style={{ height: '100px' }}>
                              <button
                                onClick={() => openMatch(point.matchId)}
                                className={`w-full rounded-t transition-all cursor-pointer relative ${
                                  point.won 
                                    ? 'bg-green-500/30 hover:bg-green-500/50' 
                                    : 'bg-red-500/30 hover:bg-red-500/50'
                                }`}
                                style={{ height: `${Math.max(heightPercent, 5)}%` }}
                              >
                                {showRatingNumber && (
                                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium whitespace-nowrap">
                                    {format(point.rating, 0)}
                                  </div>
                                )}
                              </button>
                              
                              {/* Tooltip on hover - adjust position for edges */}
                              <div className={`absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none ${
                                isNearEnd ? 'right-0' : isNearStart ? 'left-0' : 'left-1/2 -translate-x-1/2'
                              }`}>
                                <div className="bg-popover text-popover-foreground px-3 py-2 rounded-md shadow-lg border text-xs whitespace-nowrap">
                                  <div className="font-semibold">{point.won ? '✓ Win' : '✗ Loss'} vs {point.opponentName}</div>
                                  <div className="text-muted-foreground mt-1">
                                    Rating: <span className="font-medium text-foreground">{format(point.rating, 0)}</span>
                                    <span className={point.change >= 0 ? 'text-green-600 dark:text-green-400 ml-1' : 'text-red-600 dark:text-red-400 ml-1'}>
                                      ({point.change >= 0 ? '+' : ''}{point.change.toFixed(1)})
                                    </span>
                                  </div>
                                  {point.eventTitle && (
                                    <div className="text-muted-foreground mt-1">Event: {point.eventTitle}</div>
                                  )}
                                </div>
                              </div>
                            </div>
                            {(ratingHistory.length <= 20 || index % Math.ceil(ratingHistory.length / 20) === 0) && (
                              <div className="text-xs text-muted-foreground">{point.matchNum}</div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  
                  {/* Legend */}
                  <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-green-500/30"></div>
                      <span>Win</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-red-500/30"></div>
                      <span>Loss</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Recent Matches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground">
                    <tr className="border-b">
                      <th className="py-2 pr-2 w-8"></th>
                      <th className="py-2 pr-4">
                        <span className="sm:hidden">Opp</span>
                        <span className="hidden sm:inline">Opponent</span>
                      </th>
                      <th className="py-2 pr-4">
                        <span className="sm:hidden">Score</span>
                        <span className="hidden sm:inline">Score</span>
                      </th>
                      <th className="py-2 pr-4">
                        <span className="sm:hidden">Δ</span>
                        <span className="hidden sm:inline">Change</span>
                      </th>
                      <th className="py-2 pr-4">
                        <span className="sm:hidden">Evt</span>
                        <span className="hidden sm:inline">Event</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedMatches.map((m) => {
                      const oppId = m.player1_id === playerId ? m.player2_id : m.player1_id
                      const opp = players.find((p) => p.id === oppId)
                      const won = m.winner_id === playerId
                      const ratingDelta = m.player1_id === playerId ? m.rating_change_p1 : m.rating_change_p2
                      const event = m.event_id ? events.find(e => e.id === m.event_id) : null
                      const playerScore = m.player1_id === playerId ? (m.player1_score ?? '?') : (m.player2_score ?? '?')
                      const oppScore = m.player1_id === playerId ? (m.player2_score ?? '?') : (m.player1_score ?? '?')
                      return (
                        <tr className="border-b last:border-0" key={m.id}>
                          <td className="py-2 pr-2 text-muted-foreground">
                            <button onClick={() => openMatch(m.id)} title="Open match" className="inline-flex items-center hover:text-primary">
                              <LinkIcon size={16} />
                            </button>
                          </td>
                          <td className="py-2 pr-4">
                            {opp ? (
                              <Link 
                                className="flex items-center gap-2 text-primary hover:underline min-w-0" 
                                to={`/players/${oppId}`}
                              >
                                <Avatar className="h-6 w-6 flex-shrink-0">
                                  <AvatarImage 
                                    src={getPlayerAvatarUrl(opp.twitter, 36, opp.name)} 
                                    alt={opp.name}
                                  />
                                  <AvatarFallback className="text-xs">
                                    {getPlayerInitials(opp.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="truncate">{opp.name}</span>
                              </Link>
                            ) : (
                              <span className="text-muted-foreground">Unknown Player</span>
                            )}
                          </td>
                          <td className="py-2 pr-4">
                            <span className={`font-medium ${won ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {playerScore}
                            </span>
                            <span className="mx-1 text-muted-foreground">-</span>
                            <span className="text-muted-foreground">{oppScore}</span>
                          </td>
                          <td className="py-2 pr-4 font-medium">
                            {ratingDelta !== null && ratingDelta !== undefined ? (
                              <span className="inline-flex items-center gap-1">
                                {ratingDelta >= 0 ? (
                                  <ArrowUp size={14} className="text-green-600 dark:text-green-400" />
                                ) : (
                                  <ArrowDown size={14} className="text-red-600 dark:text-red-400" />
                                )}
                                <span className={ratingDelta >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                  {Math.abs(ratingDelta).toFixed(1)}
                                </span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="py-2 pr-4">
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
          
          {myMatches.length > ITEMS_PER_PAGE && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={ITEMS_PER_PAGE}
              totalItems={myMatches.length}
            />
          )}
        </>
      )}
    </section>
  )
}
