import { useMemo, useState, useEffect } from 'react'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { Pagination } from '@/components/ui/pagination'
import { Link } from 'react-router-dom'
import { usePlayersAndMatches } from '@/lib/data'
import { getPlayerAvatarUrl, getPlayerInitials } from '@/lib/avatar'
import { Input } from '@/components/ui/input'
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getActiveSeason, getAllSeasons, getActiveSeasonLeaderboard, getArchivedSeasonLeaderboard } from '@/lib/seasons'
import type { Season, SeasonPlayerSnapshot } from '@/types/models'

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
  const [searchParams, setSearchParams] = useSearchParams()

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

  // Calculate display rank based on current sort (for display purposes)
  const getDisplayRank = (playerIndex: number) => {
    // If sorted by rating in desc order (default), show the player's true ranking
    if (sortBy === 'rating' && sortDir === 'desc') {
      const player = paginatedPlayers[playerIndex]
      if (!player) return 0
      return playerRankings.get(player.id) ?? 0
    }
    // Otherwise, show sequential numbers based on current sort
    return (currentPage - 1) * ITEMS_PER_PAGE + playerIndex + 1
  }

  // Reset to page 1 if current page is out of bounds
  if (currentPage > totalPages && totalPages > 0) {
    setCurrentPage(1)
  }

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Rankings</h2>

      {loading && <p className="text-muted-foreground">Loading rankings...</p>}

      {error && (
        <div className="text-red-500 text-sm">
          Error loading data: {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedSeason === null ? 'all' : selectedSeason.toString()} onValueChange={(val) => setSelectedSeason(val === 'all' ? null : parseInt(val, 10))}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Select a season" />
              </SelectTrigger>
              <SelectContent>
                {/* All seasons option */}
                <SelectItem value="all">
                  All seasons
                </SelectItem>
                {/* Show active season */}
                {seasons.filter(s => s.status === 'active').map(season => (
                  <SelectItem key={season.id} value={season.id.toString()}>
                    {season.name}
                  </SelectItem>
                ))}
                {/* Then show archived seasons from oldest to newest */}
                {seasons.filter(s => s.status === 'archived').sort((a, b) => a.id - b.id).map(season => (
                  <SelectItem key={season.id} value={season.id.toString()}>
                    {season.name} (Archived)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              placeholder="Search player…"
              value={search}
              onChange={(e) => { setCurrentPage(1); setSearch(e.target.value) }}
              className="w-full sm:w-56"
            />
          </div>

          {seasonLoading && <p className="text-muted-foreground">Loading season data...</p>}

          <Card>
            <CardHeader>
              <CardTitle>Current Ratings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground">
                    <tr className="border-b">
                      <th className="py-2 pr-4"><span className="sm:hidden">#</span><span className="hidden sm:inline">#</span></th>
                      <th className="py-2 pr-4">
                        <button className="inline-flex items-center gap-1 hover:text-primary" onClick={() => toggleSort('name')}>
                          <span className="sm:hidden">Name</span>
                          <span className="hidden sm:inline">Player</span>
                          {sortBy === 'name' ? (sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} />}
                        </button>
                      </th>
                      <th className="py-2 pr-4">
                        <button className="inline-flex items-center gap-1 hover:text-primary" onClick={() => toggleSort('rating')}>
                          <span className="sm:hidden">Rtng</span>
                          <span className="hidden sm:inline">Rating</span>
                          {sortBy === 'rating' ? (sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} />}
                        </button>
                      </th>
                      <th className="py-2 pr-4 hidden sm:table-cell">
                        <button
                          className="inline-flex items-center gap-1 hover:text-primary"
                          onClick={() => toggleSort('rd')}
                          title="Rating Deviation: measures the uncertainty in a player's rating. Lower = more certain; it decreases with play and increases with inactivity."
                        >
                          <span>Rating Deviation</span>
                          {sortBy === 'rd' ? (sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} />}
                        </button>
                      </th>
                      <th className="py-2 pr-4 hidden sm:table-cell">
                        <button className="inline-flex items-center gap-1 hover:text-primary" onClick={() => toggleSort('matches')}>
                          <span>Total matches</span>
                          {sortBy === 'matches' ? (sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} />}
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPlayers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-muted-foreground">
                          {search ? `No players found matching "${search}"` : 'No players found.'}
                        </td>
                      </tr>
                    ) : (
                      paginatedPlayers.map((player, i) => {
                        const displayRank = getDisplayRank(i)
                        const totalMatches = playerMatchCounts.get(player.id) ?? 0
                        return (
                          <tr className="border-b last:border-0" key={player.id}>
                            <td className="py-2 pr-4 w-10">{displayRank}</td>
                            <td className="py-2 pr-4">
                              <Link
                                className="flex items-center gap-2 text-primary hover:underline"
                                to={`/players/${player.id}`}
                              >
                                <PlayerAvatar
                                  name={player.name}
                                  twitter={player.twitter}
                                  size={32}
                                  className="h-8 w-8"
                                />
                                <span>{player.name}</span>
                              </Link>
                            </td>
                            <td className="py-2 pr-4 font-medium">{format(player.rating ?? 0, 0)}</td>
                            <td className="py-2 pr-4 hidden sm:table-cell" title="Rating Deviation: measures the uncertainty in a player's rating. Lower = more certain; it decreases with play and increases with inactivity.">{format(player.rd ?? 0, 0)}</td>
                            <td className="py-2 pr-4 hidden sm:table-cell">{totalMatches}</td>
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
  )
}
