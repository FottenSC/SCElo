import { useMemo, useState, useEffect } from 'react'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useSearch, useNavigate, Link } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { Pagination } from '@/components/ui/pagination'
import { usePlayersAndMatches } from '@/lib/data'
import { getPlayerAvatarUrl, getPlayerInitials } from '@/lib/avatar'
import { Input } from '@/components/ui/input'
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getActiveSeason, getAllSeasons, getActiveSeasonLeaderboard, getArchivedSeasonLeaderboard } from '@/lib/seasons'
import type { Season, SeasonPlayerSnapshot } from '@/types/models'
import { Skeleton } from '@/components/ui/skeleton'
import { PageTransition } from '@/components/PageTransition'
import { slugify } from '@/lib/utils'

const ITEMS_PER_PAGE = 25

function format(num: number, digits = 0) {
  return num.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits
  })
}

export default function Rankings() {
  useDocumentTitle('Leaderboard')
  const { players, matches, loading, error } = usePlayersAndMatches()

  const searchValues = useSearch({ strict: false })
  const navigate = useNavigate()

  const searchParams = useMemo(() => {
    const p = new URLSearchParams()
    Object.entries(searchValues || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null) p.set(k, String(v))
    })
    return p
  }, [searchValues])

  const setSearchParams = (newParams: URLSearchParams) => {
    const search = Object.fromEntries(newParams.entries())
    navigate({ search: search as any, replace: true })
  }

  type SortKey = 'rating' | 'rd' | 'matches' | 'name'

  // Season state
  const [seasons, setSeasons] = useState<Season[]>([])
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null)
  const [archivedLeaderboard, setArchivedLeaderboard] = useState<SeasonPlayerSnapshot[]>([])
  const [seasonLoading, setSeasonLoading] = useState(false)

  // Load seasons on mount
  useEffect(() => {
    ; (async () => {
      const allSeasons = await getAllSeasons()
      setSeasons(allSeasons)
      // Default to active season
      const activeSeason = allSeasons.find(s => s.status === 'active')
      if (activeSeason) {
        setSelectedSeason(activeSeason.id)
      }
    })()
  }, [])

  // Load archived season leaderboard when season changes
  useEffect(() => {
    // Find the active season to know its ID
    const activeSeason = seasons.find(s => s.status === 'active')
    const isActiveSeasonSelected = activeSeason && selectedSeason === activeSeason.id

    // Only load leaderboard data for archived seasons
    if (!selectedSeason || isActiveSeasonSelected) return

      ; (async () => {
        setSeasonLoading(true)
        const leaderboard = await getArchivedSeasonLeaderboard(selectedSeason)
        setArchivedLeaderboard(leaderboard)
        setSeasonLoading(false)
      })()
  }, [selectedSeason, seasons])

  // Initialize state from URL params
  const [currentPage, setCurrentPage] = useState(() => {
    const page = searchParams.get('page')
    return page ? parseInt(page, 10) : 1
  })
  const [search, setSearch] = useState(() => searchParams.get('search') || '')
  const [sortBy, setSortBy] = useState<SortKey>(() => {
    const sort = searchParams.get('sort') as SortKey | null
    return sort && ['rating', 'rd', 'matches', 'name'].includes(sort) ? sort : 'rating'
  })
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(() => {
    const dir = searchParams.get('dir') as 'asc' | 'desc' | null
    return dir === 'asc' || dir === 'desc' ? dir : 'desc'
  })

  // Update URL when state changes
  useEffect(() => {
    const params = new URLSearchParams()
    if (currentPage !== 1) params.set('page', currentPage.toString())
    if (search) params.set('search', search)
    if (sortBy !== 'rating') params.set('sort', sortBy)
    if (sortDir !== 'desc') params.set('dir', sortDir)

    // Only update if params actually changed
    const newParamString = params.toString()
    const currentParamString = searchParams.toString()
    if (newParamString !== currentParamString) {
      setSearchParams(params)
    }
  }, [currentPage, search, sortBy, sortDir, setSearchParams, searchParams])

  // For archived seasons, convert snapshots to player-like objects
  const displayData = useMemo(() => {
    // Find the active season to check its actual ID
    const activeSeason = seasons.find(s => s.status === 'active')
    const isActiveSeasonSelected = activeSeason && selectedSeason === activeSeason.id

    if (selectedSeason === null) {
      // All seasons - use all current live players
      return {
        players: players.filter(p => p.rating !== null && p.rd !== null && p.volatility !== null),
        isArchived: false,
        isAllSeasons: true
      }
    } else if (isActiveSeasonSelected) {
      // Active season - filter to only players with has_played_this_season flag
      return {
        players: players.filter(p =>
          p.has_played_this_season &&
          p.rating !== null && p.rd !== null && p.volatility !== null
        ),
        isArchived: false,
        isAllSeasons: false
      }
    } else {
      // Archived season - use snapshots (already filtered to players with matches)
      return {
        players: archivedLeaderboard.map(snap => ({
          id: snap.player_id,
          name: (snap as any).player?.name || `Player ${snap.player_id}`,
          rating: snap.final_rating,
          rd: snap.final_rd,
          volatility: snap.final_volatility,
          matches_played: snap.matches_played_count,
          peak_rating: snap.peak_rating,
          peak_rating_date: snap.peak_rating_date
        })),
        isArchived: true,
        isAllSeasons: false
      }
    }
  }, [selectedSeason, seasons, players, archivedLeaderboard, matches])

  // Players are already sorted by rating from the database query
  // Build match count per player and create a ranking map based on rating
  const { rankedPlayers, playerMatchCounts, playerRankings } = useMemo(() => {
    const displayPlayers = displayData.players as any[]
    const matchCounts = new Map<number, number>()

    // For active season, count completed matches per player
    if (!displayData.isArchived && matches) {
      for (const m of matches) {
        matchCounts.set(m.player1_id, (matchCounts.get(m.player1_id) ?? 0) + 1)
        matchCounts.set(m.player2_id, (matchCounts.get(m.player2_id) ?? 0) + 1)
      }
    } else if (displayData.isArchived) {
      // For archived season, use stored match count
      for (const player of displayPlayers) {
        matchCounts.set(player.id, player.matches_played || 0)
      }
    }

    // Create ranking map based on rating (original sort order)
    const rankings = new Map<number, number>()
    displayPlayers.forEach((player, index) => {
      rankings.set(player.id, index + 1)
    })

    return { rankedPlayers: displayPlayers, playerMatchCounts: matchCounts, playerRankings: rankings }
  }, [displayData, matches])

  // Apply filters
  const filteredPlayers = useMemo(() => {
    let list = rankedPlayers
      // Filter to only active players (those with a rating in the current season)
      .filter(p => p.rating !== null && p.rd !== null && p.volatility !== null)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(p => p.name.toLowerCase().includes(q))
    }
    // eventTitle filter is a placeholder; requires adding matches to hook to compute last-played-in-event.
    return list
  }, [rankedPlayers, search])

  // Sorting
  const sortedPlayers = useMemo(() => {
    const arr = [...filteredPlayers]
    arr.sort((a, b) => {
      const aMatches = playerMatchCounts.get(a.id) ?? 0
      const bMatches = playerMatchCounts.get(b.id) ?? 0
      let cmp = 0
      switch (sortBy) {
        case 'rating':
          cmp = (a.rating ?? 0) - (b.rating ?? 0)
          break
        case 'rd':
          cmp = (a.rd ?? 0) - (b.rd ?? 0)
          break
        case 'matches':
          cmp = aMatches - bMatches
          break
        case 'name':
          cmp = a.name.localeCompare(b.name)
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [filteredPlayers, sortBy, sortDir, playerMatchCounts])

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(key)
      setSortDir(key === 'name' ? 'asc' : 'desc')
    }
    setCurrentPage(1)
  }

  // Pagination calculations
  const totalPages = Math.ceil(sortedPlayers.length / ITEMS_PER_PAGE)
  const paginatedPlayers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    const end = start + ITEMS_PER_PAGE
    return sortedPlayers.slice(start, end)
  }, [sortedPlayers, currentPage])

  // Calculate display rank - always show true rating-based rank
  const getDisplayRank = (playerIndex: number) => {
    const player = paginatedPlayers[playerIndex]
    if (!player) return 0
    // Always return the player's true rating-based rank
    return playerRankings.get(player.id) ?? 0
  }

  // Reset to page 1 if current page is out of bounds
  if (currentPage > totalPages && totalPages > 0) {
    setCurrentPage(1)
  }

  return (
    <PageTransition>
      <section className="space-y-8">
        <div className="flex items-center justify-between border-b border-primary/30 pb-4">
          <h1 className="text-4xl font-heading font-bold text-primary drop-shadow-[0_0_10px_rgba(234,179,8,0.3)] uppercase tracking-widest">
            Leaderboard
          </h1>
          <div className="h-1 w-24 bg-primary/50 rounded-full" />
        </div>


        <div className="flex flex-col md:flex-row items-center gap-4 bg-card/50 p-4 rounded-lg border border-border/30 backdrop-blur-sm">
          <div className="w-full md:w-auto flex-1">
            <Select value={selectedSeason === null ? 'all' : selectedSeason?.toString()} onValueChange={(val) => setSelectedSeason(val === 'all' ? null : parseInt(val, 10))}>
              <SelectTrigger className="w-full bg-background/50 border-primary/30 focus:ring-primary/50">
                <SelectValue placeholder="Select a season" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  All seasons
                </SelectItem>
                {seasons.filter(s => s.status === 'active').map(season => (
                  <SelectItem key={season.id} value={season.id.toString()}>
                    {season.name}
                  </SelectItem>
                ))}
                {seasons.filter(s => s.status === 'archived').sort((a, b) => a.id - b.id).map(season => (
                  <SelectItem key={season.id} value={season.id.toString()}>
                    {season.name} (Archived)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full md:w-auto flex-1">
            <Input
              placeholder="Search for player…"
              value={search}
              onChange={(e) => { setCurrentPage(1); setSearch(e.target.value) }}
              className="w-full bg-background/50 border-primary/30 focus:ring-primary/50"
            />
          </div>
        </div>

        {loading || seasonLoading ? (
          <div className="space-y-4">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-muted/20">
                      <th className="p-4 w-16"><Skeleton className="h-4 w-8" /></th>
                      <th className="p-4"><Skeleton className="h-4 w-24" /></th>
                      <th className="p-4 text-right hidden sm:table-cell"><Skeleton className="h-4 w-16 ml-auto" /></th>
                      <th className="p-4 text-right"><Skeleton className="h-4 w-16 ml-auto" /></th>
                      <th className="p-4 text-right hidden md:table-cell"><Skeleton className="h-4 w-16 ml-auto" /></th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 15 }).map((_, i) => (
                      <tr key={i} className="border-b border-white/5 last:border-0">
                        <td className="p-4 font-heading font-bold text-muted-foreground/50">
                          <Skeleton className="h-6 w-8" />
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="space-y-1.5">
                              <Skeleton className="h-4 w-32" />
                              <Skeleton className="h-3 w-16 sm:hidden" />
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-right font-mono text-muted-foreground hidden sm:table-cell">
                          <Skeleton className="h-4 w-12 ml-auto" />
                        </td>
                        <td className="p-4 text-right">
                          <Skeleton className="h-6 w-16 ml-auto" />
                        </td>
                        <td className="p-4 text-right text-muted-foreground font-mono hidden md:table-cell">
                          <Skeleton className="h-4 w-12 ml-auto" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        ) : (

          <>

            <Card className="bg-card/80 backdrop-blur-md border-border/60 shadow-lg overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
              <CardHeader className="border-b border-border/30 bg-muted/20">
                <CardTitle className="font-heading uppercase tracking-widest text-lg flex items-center gap-2">
                  <span className="text-primary">⚔️</span> Current Standings
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-muted-foreground bg-muted/30 font-heading uppercase tracking-wider text-xs">
                      <tr>
                        {!displayData.isAllSeasons && (
                          <th className="py-3 px-4 w-20 text-center">Rank</th>
                        )}
                        <th className="py-3 px-4">
                          <button className="inline-flex items-center gap-1 hover:text-primary transition-colors" onClick={() => toggleSort('name')}>
                            <span className="hidden sm:inline">Warrior</span>
                            <span className="sm:hidden">Name</span>
                            {sortBy === 'name' ? (sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} className="opacity-50" />}
                          </button>
                        </th>
                        {!displayData.isAllSeasons && (
                          <th className="py-3 px-4 text-right">
                            <button className="inline-flex items-center gap-1 hover:text-primary transition-colors ml-auto" onClick={() => toggleSort('rating')}>
                              <span className="hidden sm:inline">Rating</span>
                              <span className="sm:hidden">Rtng</span>
                              {sortBy === 'rating' ? (sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} className="opacity-50" />}
                            </button>
                          </th>
                        )}
                        {!displayData.isAllSeasons && (
                          <th className="py-3 px-4 text-right hidden sm:table-cell">
                            <button
                              className="inline-flex items-center gap-1 hover:text-primary transition-colors ml-auto"
                              onClick={() => toggleSort('rd')}
                              title="Rating Deviation"
                            >
                              <span>Deviation</span>
                              {sortBy === 'rd' ? (sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} className="opacity-50" />}
                            </button>
                          </th>
                        )}
                        <th className="py-3 px-4 text-right hidden sm:table-cell">
                          <button className="inline-flex items-center gap-1 hover:text-primary transition-colors ml-auto" onClick={() => toggleSort('matches')}>
                            <span>Battles</span>
                            {sortBy === 'matches' ? (sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} className="opacity-50" />}
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {sortedPlayers.length === 0 ? (
                        <tr>
                          <td colSpan={displayData.isAllSeasons ? 2 : 5} className="py-12 text-center text-muted-foreground font-heading italic">
                            {search ? `No warriors found matching "${search}"` : 'No warriors found.'}
                          </td>
                        </tr>
                      ) : (
                        paginatedPlayers.map((player, i) => {
                          const displayRank = getDisplayRank(i)
                          const totalMatches = playerMatchCounts.get(player.id) ?? 0
                          const isTop3 = !displayData.isAllSeasons && displayRank <= 3

                          return (
                            <tr
                              className={`group transition-colors hover:bg-primary/5 ${isTop3 ? 'bg-primary/5' : ''}`}
                              key={player.id}
                            >
                              {!displayData.isAllSeasons && (
                                <td className="py-3 px-4 text-center">
                                  <div className={`font-heading font-bold text-base ${displayRank === 1 ? 'text-yellow-500 drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]' :
                                    displayRank === 2 ? 'text-gray-300 drop-shadow-[0_0_5px_rgba(209,213,219,0.5)]' :
                                      displayRank === 3 ? 'text-amber-700 drop-shadow-[0_0_5px_rgba(180,83,9,0.5)]' :
                                        'text-muted-foreground'
                                    }`}>
                                    #{displayRank}
                                  </div>
                                </td>
                              )}
                              <td className="py-3 px-4">
                                <Link
                                  className="flex items-center gap-3 group/link"
                                  to="/player/$id/$username" params={{ id: String(player.id), username: slugify(player.name) }}
                                >
                                  <div className="relative">
                                    <div className={`absolute inset-0 rounded-full blur-sm opacity-0 group-hover/link:opacity-100 transition-opacity ${!displayData.isAllSeasons && displayRank === 1 ? 'bg-yellow-500/50' : 'bg-primary/30'
                                      }`} />
                                    <PlayerAvatar
                                      name={player.name}
                                      twitter={player.twitter}
                                      size={40}
                                      className={`h-10 w-10 border-2 relative z-10 transition-colors ${displayData.isAllSeasons ? 'border-border group-hover/link:border-primary' :
                                        displayRank === 1 ? 'border-yellow-500' :
                                          displayRank === 2 ? 'border-gray-300' :
                                            displayRank === 3 ? 'border-amber-700' :
                                              'border-border group-hover/link:border-primary'
                                        }`}
                                    />
                                  </div>
                                  <span className={`font-heading font-bold text-base transition-colors ${!displayData.isAllSeasons && displayRank <= 3 ? 'text-foreground' : 'text-foreground/90 group-hover/link:text-primary'
                                    }`}>
                                    {player.name}
                                  </span>
                                </Link>
                              </td>
                              {!displayData.isAllSeasons && (
                                <td className="py-3 px-4 text-right font-mono font-bold text-lg text-primary">
                                  {format(player.rating ?? 0, 0)}
                                </td>
                              )}
                              {!displayData.isAllSeasons && (
                                <td className="py-3 px-4 text-right hidden sm:table-cell text-muted-foreground font-mono">
                                  {format(player.rd ?? 0, 0)}
                                </td>
                              )}
                              <td className="py-3 px-4 text-right hidden sm:table-cell text-foreground font-bold">
                                {totalMatches}
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {!loading && sortedPlayers.length > ITEMS_PER_PAGE && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={ITEMS_PER_PAGE}
            totalItems={sortedPlayers.length}
          />
        )}
      </section>
    </PageTransition>
  )
}
