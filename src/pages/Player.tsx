import { useMemo, useState, useEffect, useRef } from 'react'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useParams, Link, useNavigate } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { Pagination } from '@/components/ui/pagination'
import { usePlayersAndMatches, fetchEvents, fetchAllCompletedMatches } from '@/lib/data'
import { getPlayerAvatarUrl, getPlayerInitials } from '@/lib/avatar'
import { formatRatingChange } from '@/lib/predictions'
import { useMatchModal } from '@/components/MatchModalContext'
import { RatingProgressionChart } from '@/components/RatingProgressionChart'
import { Link as LinkIcon, ArrowUp, ArrowDown, Trophy, TrendingUp, Search, X } from 'lucide-react'
import { supabase } from '@/supabase/client'
import type { Event, RatingEvent, Season, Match } from '@/types/models'
import { getAllSeasons } from '@/lib/seasons'
import { Combobox } from '@/components/ui/combobox'
import { Skeleton } from '@/components/ui/skeleton'
import { PageTransition } from '@/components/PageTransition'

const ITEMS_PER_PAGE = 20

function format(num: number, digits = 0) {
  return num.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  })
}

export default function Player() {
  const { id } = useParams({ strict: false })
  const playerId = id ? parseInt(id) : NaN
  const [currentPage, setCurrentPage] = useState(1)
  const { openMatch } = useMatchModal()
  const [ratingMatchEvents, setRatingMatchEvents] = useState<RatingEvent[]>([])

  const { players, matches: activeSeasonMatches, loading: playersLoading } = usePlayersAndMatches()
  const [allMatches, setAllMatches] = useState<Match[]>([])
  const [matchesLoading, setMatchesLoading] = useState(true)
  const [events, setEvents] = useState<Event[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null)
  const [opponentSearch, setOpponentSearch] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    let active = true
      ; (async () => {
        const ev = await fetchEvents()
        if (!active) return
        setEvents(ev)
      })()
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
      ; (async () => {
        const all = await getAllSeasons()
        if (!active) return
        setSeasons(all)
        // Default to active season
        const activeSeason = all.find(s => s.status === 'active')
        if (activeSeason) {
          setSelectedSeason(activeSeason.id)
        }
      })()
    return () => { active = false }
  }, [])

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
  useDocumentTitle(player ? `Player - ${player.name}` : 'Player')

  const playerRank = useMemo(() => {
    if (!player) return null
    const activePlayers = players.filter(p => p.has_played_this_season)
    const sorted = [...activePlayers].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    const rank = sorted.findIndex(p => p.id === player.id)
    return rank >= 0 ? rank + 1 : null
  }, [players, player])

  const myMatches = useMemo(() => {
    if (isNaN(playerId)) return []
    const filtered = allMatches.filter((m: Match) => m.player1_id === playerId || m.player2_id === playerId)
    return filtered.sort((a: Match, b: Match) => b.id - a.id)
  }, [allMatches, playerId])

  const seasonFilteredMatches = useMemo(() => {
    let filtered = myMatches
    if (selectedSeason !== null) {
      filtered = filtered.filter((m: Match) => m.season_id === selectedSeason)
    }
    if (opponentSearch.trim()) {
      const searchLower = opponentSearch.toLowerCase().trim()
      filtered = filtered.filter((m: Match) => {
        const oppId = m.player1_id === playerId ? m.player2_id : m.player1_id
        const opp = players.find(p => p.id === oppId)
        return opp?.name.toLowerCase().includes(searchLower)
      })
    }
    return filtered
  }, [myMatches, selectedSeason, opponentSearch, playerId, players])

  const stats = useMemo(() => {
    let w = 0, l = 0
    const recentForm: {
      result: 'W' | 'L'
      matchId: number
      opponentName: string
      score: string
      ratingChange: number | null
    }[] = []

    for (const m of myMatches) {
      if (!m.winner_id) continue
      const won = m.winner_id === playerId
      const isPlayer1 = m.player1_id === playerId
      const opponentId = isPlayer1 ? m.player2_id : m.player1_id
      const opponent = players.find(p => p.id === opponentId)
      const myScore = isPlayer1 ? m.player1_score : m.player2_score
      const oppScore = isPlayer1 ? m.player2_score : m.player1_score
      const ratingChange = isPlayer1 ? m.rating_change_p1 : m.rating_change_p2

      if (won) {
        w++
        if (recentForm.length < 10) {
          recentForm.push({
            result: 'W',
            matchId: m.id,
            opponentName: opponent?.name || 'Unknown',
            score: `${myScore ?? '?'}-${oppScore ?? '?'}`,
            ratingChange: ratingChange ?? null
          })
        }
      } else {
        l++
        if (recentForm.length < 10) {
          recentForm.push({
            result: 'L',
            matchId: m.id,
            opponentName: opponent?.name || 'Unknown',
            score: `${myScore ?? '?'}-${oppScore ?? '?'}`,
            ratingChange: ratingChange ?? null
          })
        }
      }
    }

    const winRate = w + l > 0 ? (w / (w + l)) * 100 : 0

    return { w, l, winRate, recentForm }
  }, [myMatches, playerId, players])

  const ratingHistory = useMemo(() => {
    if (!player) return []

    if (ratingMatchEvents.length > 0) {
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

      const latestByMatch = new Map<number, typeof allMatches[number]>()
      for (const m of allMatches) {
        const existing = m.matchId ? latestByMatch.get(m.matchId) : undefined
        if (!existing || (existing && m.eventId > (existing as any).eventId)) {
          if (m.matchId) latestByMatch.set(m.matchId, m)
        }
      }
      let uniqueMatches = Array.from(latestByMatch.values())
      uniqueMatches.sort((a, b) => a.eventId - b.eventId)

      if (uniqueMatches.length === 0) return []

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

    let selectedMatches = [...myMatches].reverse()
    if (selectedMatches.length === 0) return []

    let startingRating = player.rating ?? 1500

    for (const m of selectedMatches) {
      if (!m.winner_id) continue
      const ratingChange = m.player1_id === playerId ? (m.rating_change_p1 || 0) : (m.rating_change_p2 || 0)
      startingRating -= ratingChange
    }

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

  const totalPages = Math.ceil(seasonFilteredMatches.length / ITEMS_PER_PAGE)
  const paginatedMatches = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    const end = start + ITEMS_PER_PAGE
    return seasonFilteredMatches.slice(start, end)
  }, [seasonFilteredMatches, currentPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [selectedSeason, opponentSearch])

  return (
    <PageTransition>
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
                      #{playerRank ?? '?'}
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

            <div className="px-6 pb-6 md:px-8 md:pb-8 relative z-10">
              <div className="border-t border-border/30 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-xs font-heading uppercase tracking-widest text-muted-foreground">Badges</div>
                    </div>
                    <div className="flex items-center justify-center py-8 bg-background/40 rounded-lg border border-border/50">
                      <span className="text-sm text-muted-foreground italic">No badges earned yet.</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-xs font-heading uppercase tracking-widest text-muted-foreground">Recent Form</div>
                      <div className="text-xs text-muted-foreground">Last 10 matches</div>
                    </div>

                    {stats.recentForm.length === 0 ? (
                      <div className="flex items-center justify-center py-8 bg-background/40 rounded-lg border border-border/50">
                        <span className="text-sm text-muted-foreground italic">No recent matches recorded.</span>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {stats.recentForm.map((form, i) => (
                          <div key={i} className="relative group">
                            <button
                              onClick={() => openMatch(form.matchId)}
                              className={`w-14 h-14 rounded border-2 flex items-center justify-center font-bold shadow-md transition-all hover:scale-110 hover:shadow-lg cursor-pointer ${form.result === 'W'
                                ? 'bg-green-500/20 border-green-500/60 text-green-400 hover:bg-green-500/30'
                                : 'bg-red-500/20 border-red-500/60 text-red-400 hover:bg-red-500/30'
                                }`}
                            >
                              <div className="text-lg font-bold">{form.result}</div>
                            </button>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-popover border border-border rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap">
                              <div className="text-xs font-heading font-bold text-foreground">{form.opponentName}</div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                Score: <span className="font-bold text-foreground">{form.score}</span>
                              </div>
                              {form.ratingChange !== null && (
                                <div className={`text-xs font-bold mt-0.5 ${form.ratingChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {form.ratingChange >= 0 ? '+' : ''}{Math.round(form.ratingChange)}
                                </div>
                              )}
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-border"></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {ratingHistory.length > 0 && (
            <div className="relative overflow-hidden rounded-lg border border-primary/30 bg-card/80 backdrop-blur-md shadow-lg">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary/60" />
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
                    <TrendingUp size={20} className="text-primary" />
                  </div>
                  <h3 className="font-heading uppercase tracking-wider text-lg text-foreground">Rating History</h3>
                </div>
                <RatingProgressionChart
                  key={playerId}
                  data={ratingHistory}
                  onMatchClick={openMatch}
                />
              </div>
            </div>
          )}

          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="border-b border-border/30 pb-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <CardTitle className="font-heading uppercase tracking-wider text-lg flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    Battle Log
                  </CardTitle>
                  <span className="text-sm text-muted-foreground">
                    {seasonFilteredMatches.length} match{seasonFilteredMatches.length !== 1 ? 'es' : ''}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                  <div className="relative w-full sm:w-48">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search opponent..."
                      value={opponentSearch}
                      onChange={(e) => setOpponentSearch(e.target.value)}
                      className="pl-8 pr-8 h-9"
                    />
                    {opponentSearch && (
                      <button
                        onClick={() => setOpponentSearch('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="w-full sm:w-48">
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
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {/* Table Header - Hidden on mobile */}
              <div className="hidden md:grid md:grid-cols-[auto_1fr_100px_80px_100px] gap-4 px-4 py-2 bg-muted/30 border-b border-border/30 text-xs font-heading uppercase tracking-wider text-muted-foreground">
                <div className="w-6"></div>
                <div>Opponent</div>
                <div className="text-center">Score</div>
                <div className="text-right">Rating</div>
                <div className="text-right">Event</div>
              </div>

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
                    <button
                      key={m.id}
                      onClick={() => openMatch(m.id)}
                      className="w-full text-left hover:bg-muted/30 transition-colors cursor-pointer focus:outline-none focus:bg-muted/30"
                    >
                      {/* Desktop Layout */}
                      <div className="hidden md:grid md:grid-cols-[auto_1fr_100px_80px_100px] gap-4 px-4 py-3 items-center">
                        {/* Win/Loss Indicator */}
                        <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${won ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                          {won ? 'W' : 'L'}
                        </div>

                        {/* Opponent */}
                        <div className="flex items-center gap-3 min-w-0">
                          {opp ? (
                            <div
                              onClick={(e) => { e.stopPropagation(); navigate({ to: '/players/$id', params: { id: String(oppId) } }); }}
                              className="flex items-center gap-3 min-w-0 cursor-pointer hover:text-primary transition-colors"
                            >
                              <PlayerAvatar
                                name={opp.name}
                                twitter={opp.twitter}
                                size={32}
                                className="h-8 w-8 border border-border shrink-0 hover:border-primary transition-colors"
                              />
                              <span className="font-medium text-sm truncate">
                                {opp.name}
                              </span>
                            </div>
                          ) : (
                            <>
                              <div className="h-8 w-8 bg-muted rounded-full shrink-0" />
                              <span className="font-medium text-sm truncate text-muted-foreground">Unknown</span>
                            </>
                          )}
                        </div>

                        {/* Score */}
                        <div className="text-center font-heading font-bold">
                          <span className={won ? 'text-green-500' : 'text-muted-foreground'}>{playerScore}</span>
                          <span className="text-muted-foreground mx-1">-</span>
                          <span className={!won ? 'text-green-500' : 'text-muted-foreground'}>{oppScore}</span>
                        </div>

                        {/* Rating Change */}
                        <div className="text-right text-sm font-bold">
                          {ratingDelta !== null && ratingDelta !== undefined ? (
                            <span className={ratingDelta >= 0 ? 'text-green-500' : 'text-red-500'}>
                              {ratingDelta > 0 ? '+' : ''}{Math.round(ratingDelta)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </div>

                        {/* Event */}
                        <div className="text-right text-xs text-muted-foreground truncate" title={event?.title || `Match #${m.id}`}>
                          {event?.title || `#${m.id}`}
                        </div>
                      </div>

                      {/* Mobile Layout */}
                      <div className="md:hidden px-4 py-3">
                        <div className="flex items-center gap-3">
                          {/* Win/Loss Indicator */}
                          <div className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold shrink-0 ${won ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                            {won ? 'W' : 'L'}
                          </div>

                          {/* Opponent Avatar & Name */}
                          {opp ? (
                            <div
                              onClick={(e) => { e.stopPropagation(); navigate({ to: '/players/$id', params: { id: String(oppId) } }); }}
                              className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                            >
                              <PlayerAvatar
                                name={opp.name}
                                twitter={opp.twitter}
                                size={32}
                                className="h-8 w-8 border border-border shrink-0 hover:border-primary transition-colors"
                              />
                              <div className="min-w-0">
                                <div className="font-medium text-sm truncate hover:text-primary transition-colors">{opp.name}</div>
                                <div className="text-xs text-muted-foreground truncate">{event?.title || `Match #${m.id}`}</div>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="h-8 w-8 bg-muted rounded-full shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate text-muted-foreground">Unknown</div>
                                <div className="text-xs text-muted-foreground truncate">{event?.title || `Match #${m.id}`}</div>
                              </div>
                            </>
                          )}

                          {/* Score & Rating */}
                          <div className="text-right shrink-0">
                            <div className="font-heading font-bold text-sm">
                              <span className={won ? 'text-green-500' : 'text-muted-foreground'}>{playerScore}</span>
                              <span className="text-muted-foreground">-</span>
                              <span className={!won ? 'text-green-500' : 'text-muted-foreground'}>{oppScore}</span>
                            </div>
                            <div className="text-xs font-bold">
                              {ratingDelta !== null && ratingDelta !== undefined ? (
                                <span className={ratingDelta >= 0 ? 'text-green-500' : 'text-red-500'}>
                                  {ratingDelta > 0 ? '+' : ''}{Math.round(ratingDelta)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}

                {paginatedMatches.length === 0 && (
                  <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                    No matches found for this season.
                  </div>
                )}
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
    </PageTransition>
  )
}
