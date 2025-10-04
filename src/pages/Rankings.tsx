import { useMemo, useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Pagination } from '@/components/ui/pagination'
import { Link } from 'react-router-dom'
import { usePlayersAndMatches } from '@/lib/data'
import { getPlayerAvatarUrl, getPlayerInitials } from '@/lib/avatar'
import { Input } from '@/components/ui/input'
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'

const ITEMS_PER_PAGE = 25

function format(num: number, digits = 0) {
  return num.toLocaleString(undefined, { 
    maximumFractionDigits: digits, 
    minimumFractionDigits: digits 
  })
}

export default function Rankings() {
  const { players, matches, loading, error } = usePlayersAndMatches()
  const [searchParams, setSearchParams] = useSearchParams()
  
  type SortKey = 'rating' | 'rd' | 'matches' | 'name'
  
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
    setSearchParams(params, { replace: true })
  }, [currentPage, search, sortBy, sortDir, setSearchParams])
  
  // Players are already sorted by rating from the database query
  // Build match count per player and create a ranking map based on rating
  const { rankedPlayers, playerMatchCounts, playerRankings } = useMemo(() => {
    // players are already sorted by rating desc in fetch
    const matchCounts = new Map<number, number>()
    // count completed matches per player
    for (const m of matches ?? []) {
      matchCounts.set(m.player1_id, (matchCounts.get(m.player1_id) ?? 0) + 1)
      matchCounts.set(m.player2_id, (matchCounts.get(m.player2_id) ?? 0) + 1)
    }
    
    // Create ranking map based on rating (original sort order)
    const rankings = new Map<number, number>()
    players.forEach((player, index) => {
      rankings.set(player.id, index + 1)
    })
    
    return { rankedPlayers: players, playerMatchCounts: matchCounts, playerRankings: rankings }
  }, [players, matches])

  // Apply filters
  const filteredPlayers = useMemo(() => {
    let list = rankedPlayers
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
          cmp = a.rating - b.rating
          break
        case 'rd':
          cmp = a.rd - b.rd
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
            <Input
              placeholder="Search player…"
              value={search}
              onChange={(e) => { setCurrentPage(1); setSearch(e.target.value) }}
              className="w-full sm:w-56"
            />
          </div>
          
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
                            <td className="py-2 pr-4 hidden sm:table-cell" title="Rating Deviation: measures the uncertainty in a player's rating. Lower = more certain; it decreases with play and increases with inactivity.">{format(player.rd, 0)}</td>
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
