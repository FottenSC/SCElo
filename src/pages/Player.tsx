import { useMemo, useState, useEffect, useRef } from 'react'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Pagination } from '@/components/ui/pagination'
import { usePlayersAndMatches, fetchEvents, fetchAllCompletedMatches } from '@/lib/data'
import { getPlayerAvatarUrl, getPlayerInitials } from '@/lib/avatar'
import { formatRatingChange } from '@/lib/predictions'
import { useMatchModal } from '@/components/MatchModalContext'
import { RatingProgressionChart } from '@/components/RatingProgressionChart'
import { Link as LinkIcon, ArrowUp, ArrowDown, Trophy, TrendingUp } from 'lucide-react'
import { supabase } from '@/supabase/client'
import type { Event, RatingEvent, Season, Match } from '@/types/models'
import { getAllSeasons } from '@/lib/seasons'
import { Combobox } from '@/components/ui/combobox'

const ITEMS_PER_PAGE = 20

function format(num: number, digits = 0) {
  return num.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  })
}

export default function Player() {
  const { id } = useParams()
  const playerId = id ? parseInt(id) : NaN
  const [currentPage, setCurrentPage] = useState(1)
  const { openMatch } = useMatchModal()
  // Rating match events - resets are detected by season_id changes in matches
  const [ratingMatchEvents, setRatingMatchEvents] = useState<RatingEvent[]>([])

  const { players, matches: activeSeasonMatches, loading: playersLoading } = usePlayersAndMatches()
  const [allMatches, setAllMatches] = useState<Match[]>([])
  const [matchesLoading, setMatchesLoading] = useState(true)
  const [events, setEvents] = useState<Event[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  // null = All seasons, number = specific season id (default to All)
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null)

  useEffect(() => {
    let active = true
      ; (async () => {
        const ev = await fetchEvents()
        if (!active) return
        setEvents(ev)
      })()
    return () => { active = false }
  }, [])

  // Load seasons for filter (do not auto-select; keep default as All seasons)
  useEffect(() => {
    let active = true
      ; (async () => {
        const all = await getAllSeasons()
        if (!active) return
        setSeasons(all)
      })()
    return () => { active = false }
  }, [])

  // Load all completed matches (across all seasons) for the player page
  useEffect(() => {
    let active = true
      ; (async () => {
        setMatchesLoading(true)
        const allCompletedMatches = await fetchAllCompletedMatches()
        if (!active) return
        setAllMatches(allCompletedMatches)
        setMatchesLoading(false)
      })()
    return () => { active = false }
  }, [])

  // Fetch rating events: match events only (resets detected by season_id changes)
  useEffect(() => {
    if (isNaN(playerId)) return
    let active = true
      ; (async () => {
        const matchesRes = await supabase
          .from('rating_events')
          .select('*')
          .eq('player_id', playerId)
          .eq('event_type', 'match')
          .not('match_id', 'is', null)
          .order('id', { ascending: true })

        if (!active) return

        if (!matchesRes.error && matchesRes.data) {
          setRatingMatchEvents(matchesRes.data as RatingEvent[])
        }
      })()
    return () => { active = false }
  }, [playerId])

  const player = useMemo(() => !isNaN(playerId) ? players.find((p) => p.id === playerId) : undefined, [players, playerId])
  // Set title: show placeholder while loading or player not found
  useDocumentTitle(player ? `Player - ${player.name}` : 'Player')

  // Calculate player rank
  const playerRank = useMemo(() => {
    if (!player) return null
    const sorted = [...players].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    return sorted.findIndex(p => p.id === player.id) + 1
  }, [players, player])

  const myMatches = useMemo(() => {
    if (isNaN(playerId)) return []
    const filtered = allMatches.filter((m: Match) => m.player1_id === playerId || m.player2_id === playerId)
    // sort by most recent first
    return filtered.sort((a: Match, b: Match) => b.id - a.id)
  }, [allMatches, playerId])

  const seasonFilteredMatches = useMemo(() => {
    if (selectedSeason === null) return myMatches
    return myMatches.filter((m: Match) => m.season_id === selectedSeason)
  }, [myMatches, selectedSeason])

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

    // Use rating match events if available
    if (ratingMatchEvents.length > 0) {
      // Map all match events
      const allMatches = ratingMatchEvents
        .filter(e => e.match_id)
        .map((event) => {
          let opponentName = 'Unknown'
          if (event.opponent_id) {
            const opponent = players.find(p => p.id === event.opponent_id)
            opponentName = opponent?.name || `Player ${event.opponent_id}`
          }
          return {
            eventId: event.id,
            rating: event.rating,
            change: event.rating_change || 0,
            won: event.result === 1,
            matchId: event.match_id || 0,
            opponentName,
            eventTitle: null,
            isReset: false,
            seasonId: event.season_id,
          }
        })

      // Deduplicate by matchId keeping the highest eventId (latest)
      const latestByMatch = new Map<number, typeof allMatches[number]>()
      for (const m of allMatches) {
        const existing = m.matchId ? latestByMatch.get(m.matchId) : undefined
        if (!existing || (existing && m.eventId > (existing as any).eventId)) {
          if (m.matchId) latestByMatch.set(m.matchId, m)
        }
      }
      let uniqueMatches = Array.from(latestByMatch.values())

      // Sort chronologically
      uniqueMatches.sort((a, b) => a.eventId - b.eventId)

      // Apply count filter - always show all
      const count = uniqueMatches.length
      uniqueMatches = uniqueMatches.slice(-count)

      if (uniqueMatches.length === 0) return []

      // Insert reset markers when season changes
      const finalSeries: Array<{
        matchNum: number
        rating: number
        change: number
        won: boolean
        matchId: number
        opponentName: string
        eventTitle: string | null
        isReset: boolean
      }> = []

      for (let i = 0; i < uniqueMatches.length; i++) {
        const match = uniqueMatches[i]!
        const prevMatch = i > 0 ? uniqueMatches[i - 1] : null

        // Insert a reset marker when season changes
        if (prevMatch && prevMatch.seasonId !== match.seasonId) {
          finalSeries.push({
            matchNum: finalSeries.length + 1,
            rating: 1500,
            change: 0,
            won: false,
            matchId: 0,
            opponentName: 'Season Reset',
            eventTitle: null,
            isReset: true,
          })
        }

        finalSeries.push({
          matchNum: finalSeries.length + 1,
          rating: match.rating,
          change: match.change,
          won: match.won,
          matchId: match.matchId,
          opponentName: match.opponentName,
          eventTitle: match.eventTitle,
          isReset: false,
        })
      }

      return finalSeries
    }

    // Fallback: use matches from the myMatches data - always show all
    const count = myMatches.length
    let selectedMatches = [...myMatches].slice(0, count).reverse()

    if (selectedMatches.length === 0) return []

    // Calculate starting rating
    let startingRating = player.rating ?? 1500

    for (const m of selectedMatches) {
      if (!m.winner_id) continue
      const ratingChange = m.player1_id === playerId ? (m.rating_change_p1 || 0) : (m.rating_change_p2 || 0)
      startingRating -= ratingChange
    }

    // Build history
    const history: Array<{
      matchNum: number
      rating: number
      change: number
      won: boolean
      matchId: number
      opponentName: string
      eventTitle: string | null
      isReset: boolean
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
        eventTitle: event?.title || null,
        isReset: false,
      })
    })

    return history
  }, [myMatches, playerId, player, players, events, ratingMatchEvents])

  // Pagination calculations
  const totalPages = Math.ceil(seasonFilteredMatches.length / ITEMS_PER_PAGE)
  const paginatedMatches = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    const end = start + ITEMS_PER_PAGE
    return seasonFilteredMatches.slice(start, end)
  }, [seasonFilteredMatches, currentPage])

  // Reset pagination when season filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedSeason])

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Player</h2>
        <Link className="text-sm text-primary" to="/players">
          ← Back to Players
        </Link>
      </div>
      {playersLoading && <p className="text-muted-foreground">Loading...</p>}
      {!player && !playersLoading && <p className="text-muted-foreground">Player not found.</p>}
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
                <div className="font-medium text-lg">{format(player.rating ?? 0, 0)}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">RD</div>
                <div>{format(player.rd ?? 0, 0)}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">
                  <span className="sm:hidden">Vol</span>
                  <span className="hidden sm:inline">Volatility</span>
                </div>
                <div>{(player.volatility ?? 0).toFixed(3)}</div>
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
                        className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold ${result === 'W'
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
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp size={18} className="text-purple-500" />
                  Rating Progression
                </CardTitle>
                <CardDescription>All {ratingHistory.length} matches</CardDescription>
              </CardHeader>
              <CardContent>
                <RatingProgressionChart
                  data={ratingHistory}
                  onMatchClick={openMatch}
                />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <CardTitle>Recent Matches</CardTitle>
                <div className="w-full sm:w-64">
                  <Combobox
                    value={selectedSeason === null ? 'all' : String(selectedSeason)}
                    onValueChange={(val) => {
                      setSelectedSeason(val === 'all' ? null : parseInt(val, 10))
                    }}
                    placeholder="Select season..."
                    searchPlaceholder="Search seasons..."
                    options={[
                      { value: 'all', label: 'All seasons' },
                      ...seasons.filter(s => s.status === 'active').map(s => ({
                        value: String(s.id),
                        label: `${s.name} (Active)`
                      })),
                      ...seasons.filter(s => s.status === 'archived').sort((a, b) => a.id - b.id).map(s => ({
                        value: String(s.id),
                        label: `${s.name} (Archived)`
                      }))
                    ]}
                  />
                </div>
              </div>
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

          {seasonFilteredMatches.length > ITEMS_PER_PAGE && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={ITEMS_PER_PAGE}
              totalItems={seasonFilteredMatches.length}
            />
          )}
        </>
      )}
    </section>
  )
}
