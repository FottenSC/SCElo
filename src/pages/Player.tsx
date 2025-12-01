import { useMemo, useState, useEffect, useRef } from 'react'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { PlayerAvatar } from '@/components/PlayerAvatar'
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
  }, [playerId, allMatches])

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
    <section className="space-y-8">
      <div className="flex items-center justify-between border-b border-primary/30 pb-4">
        <div className="flex items-center gap-4">
          <Link className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 font-heading uppercase tracking-wider" to="/players">
            <span>←</span> Back to Roster
          </Link>
        </div>
      </div>

      {playersLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      )}

      {!player && !playersLoading && (
        <div className="text-center py-12 text-muted-foreground font-heading text-xl">
          Player not found.
        </div>
      )}

      {player && (
        <>
          {/* Hero / Player Card */}
          <div className="relative overflow-hidden rounded-lg border border-primary/50 bg-card/80 backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.5)]">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
              <Trophy size={200} />
            </div>
            <div className="absolute top-0 left-0 w-2 h-full bg-primary/60" />

            <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8 items-center md:items-start relative z-10">
              <div className="shrink-0 relative group">
                <div className="absolute inset-0 bg-primary/30 rounded-full blur-xl opacity-50 group-hover:opacity-80 transition-opacity" />
                <PlayerAvatar
                  name={player.name}
                  twitter={player.twitter}
                  size={128}
                  className="h-32 w-32 md:h-40 md:w-40 border-4 border-primary/50 shadow-2xl relative z-10"
                />
              </div>

              <div className="flex-1 text-center md:text-left space-y-4">
                <div>
                  <h1 className="text-4xl md:text-5xl font-heading font-black text-primary drop-shadow-[0_0_10px_rgba(234,179,8,0.5)] tracking-wide uppercase">
                    {player.name}
                  </h1>
                  {player.twitter && (
                    <a
                      href={`https://twitter.com/${player.twitter.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lg text-muted-foreground hover:text-primary transition-colors font-body inline-flex items-center gap-1"
                    >
                      @{player.twitter.replace('@', '')}
                    </a>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 pt-4 border-t border-border/30">
                  <div className="space-y-1">
                    <div className="text-xs font-heading uppercase tracking-widest text-muted-foreground">Rating</div>
                    <div className="text-3xl font-bold text-foreground">{format(player.rating ?? 0, 0)}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-heading uppercase tracking-widest text-muted-foreground">Rank</div>
                    <div className="text-3xl font-bold text-foreground">
                      #{playerRank}
                      {playerRank && playerRank <= 10 && (
                        <span className="ml-2 text-xs align-top bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 px-1.5 py-0.5 rounded font-heading">
                          Top 10
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-heading uppercase tracking-widest text-muted-foreground">Win Rate</div>
                    <div className="text-3xl font-bold text-foreground">
                      {stats.winRate.toFixed(1)}%
                      <span className="text-sm font-normal text-muted-foreground ml-1">
                        ({stats.w}W - {stats.l}L)
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-heading uppercase tracking-widest text-muted-foreground">Peak</div>
                    <div className="text-3xl font-bold text-foreground">
                      {format(player.peak_rating ?? 0, 0)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Form */}
            <div className="px-6 pb-6 md:px-8 md:pb-8 relative z-10">
              <div className="border-t border-border/30 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-xs font-heading uppercase tracking-widest text-muted-foreground">Recent Form</div>
                  <div className="text-xs text-muted-foreground">Last 10 matches</div>
                </div>

                {stats.recentForm.length === 0 ? (
                  <div className="flex items-center justify-center py-8 bg-background/40 rounded-lg border border-border/50">
                    <span className="text-sm text-muted-foreground italic">No recent matches recorded.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-5 md:grid-cols-10 gap-2 md:gap-3">
                    {stats.recentForm.map((result, i) => (
                      <div
                        key={i}
                        className={`aspect-square rounded-lg border-2 flex flex-col items-center justify-center font-bold shadow-lg transition-all hover:scale-105 hover:shadow-xl ${result === 'W'
                          ? 'bg-green-500/20 border-green-500/60 text-green-400'
                          : 'bg-red-500/20 border-red-500/60 text-red-400'
                          }`}
                      >
                        <div className="text-xl md:text-2xl">{result}</div>
                        <div className="text-[9px] md:text-[10px] text-muted-foreground mt-0.5 md:mt-1">#{stats.recentForm.length - i}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Rating Progression */}
          {ratingHistory.length > 0 && (
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-heading uppercase tracking-wider text-lg">
                  <TrendingUp size={20} className="text-primary" />
                  Rating History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RatingProgressionChart
                  data={ratingHistory}
                  onMatchClick={openMatch}
                />
              </CardContent>
            </Card>
          )}

          {/* Battle Log - Full Width */}
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="border-b border-border/30 pb-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <CardTitle className="font-heading uppercase tracking-wider text-lg flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full" />
                  Battle Log
                </CardTitle>
                <div className="w-full md:w-64">
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
            <CardContent className="p-0">
              <div className="divide-y divide-border/30">
                {paginatedMatches.map((m) => {
                  const oppId = m.player1_id === playerId ? m.player2_id : m.player1_id
                  const opp = players.find((p) => p.id === oppId)
                  const won = m.winner_id === playerId
                  const ratingDelta = m.player1_id === playerId ? m.rating_change_p1 : m.rating_change_p2
                  const event = m.event_id ? events.find(e => e.id === m.event_id) : null
                  const playerScore = m.player1_id === playerId ? (m.player1_score ?? '?') : (m.player2_score ?? '?')
                  const oppScore = m.player1_id === playerId ? (m.player2_score ?? '?') : (m.player1_score ?? '?')

                  return (
                    <div key={m.id} className="p-4 hover:bg-muted/20 transition-colors group">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-bold uppercase px-1.5 py-0.5 rounded border ${won ? 'bg-green-500/10 text-green-500 border-green-500/30' : 'bg-red-500/10 text-red-500 border-red-500/30'}`}>
                          {won ? 'Victory' : 'Defeat'}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {event ? event.title : 'Match #' + m.id}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          {opp ? (
                            <Link to={`/players/${oppId}`} className="shrink-0 relative">
                              <PlayerAvatar
                                name={opp.name}
                                twitter={opp.twitter}
                                size={40}
                                className="h-10 w-10 border border-border group-hover:border-primary transition-colors"
                              />
                            </Link>
                          ) : (
                            <div className="h-10 w-10 bg-muted rounded-full" />
                          )}
                          <div className="min-w-0">
                            <div className="text-xs text-muted-foreground uppercase tracking-wider">VS</div>
                            {opp ? (
                              <Link to={`/players/${oppId}`} className="font-heading font-bold text-sm truncate hover:text-primary block">
                                {opp.name}
                              </Link>
                            ) : (
                              <span className="text-sm text-muted-foreground">Unknown</span>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-heading font-black text-xl">
                            <span className={won ? 'text-green-500' : 'text-muted-foreground'}>{playerScore}</span>
                            <span className="text-muted-foreground mx-1">-</span>
                            <span className={!won ? 'text-green-500' : 'text-muted-foreground'}>{oppScore}</span>
                          </div>
                          <div className="text-xs font-bold">
                            {ratingDelta !== null && ratingDelta !== undefined ? (
                              <span className={ratingDelta >= 0 ? 'text-green-500' : 'text-red-500'}>
                                {ratingDelta > 0 ? '+' : ''}{ratingDelta.toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => openMatch(m.id)}
                        className="w-full mt-3 text-xs text-center py-1.5 border border-border/50 rounded hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-colors uppercase tracking-wider font-bold opacity-0 group-hover:opacity-100"
                      >
                        View Details
                      </button>
                    </div>
                  )
                })}
              </div>

              {seasonFilteredMatches.length > ITEMS_PER_PAGE && (
                <div className="p-4 border-t border-border/30">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    itemsPerPage={ITEMS_PER_PAGE}
                    totalItems={seasonFilteredMatches.length}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </section>
  )
}
