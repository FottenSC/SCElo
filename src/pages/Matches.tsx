import * as React from 'react'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { Combobox } from '@/components/ui/combobox'
import { usePlayersAndMatches, fetchEvents } from '@/lib/data'
import { getAllSeasons } from '@/lib/seasons'
import type { Season } from '@/types/models'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { useMatchModal } from '@/components/MatchModalContext'
import type { Event } from '@/types/models'

const ITEMS_PER_PAGE = 25

export default function Matches() {
  useDocumentTitle('Matches')
  const { players, matches, loading } = usePlayersAndMatches()
  const [searchParams, setSearchParams] = useSearchParams()
  const [events, setEvents] = React.useState<Event[]>([])
  const [seasons, setSeasons] = React.useState<Season[]>([])
  const { openMatch } = useMatchModal()
  const navigate = useNavigate()
  // null = All seasons, number = specific season id
  const [selectedSeason, setSelectedSeason] = React.useState<number | null>(() => {
    const sp = searchParams.get('season')
    if (sp === null || sp === 'all') return null
    const num = parseInt(sp, 10)
    return Number.isFinite(num) ? num : null
  })

  // Initialize state from URL params
  const [query, setQuery] = React.useState(() => searchParams.get('search') || '')
  const [currentPage, setCurrentPage] = React.useState(() => {
    const page = searchParams.get('page')
    return page ? parseInt(page, 10) : 1
  })

  // Update URL when state changes
  React.useEffect(() => {
    const params = new URLSearchParams()
    if (currentPage !== 1) params.set('page', currentPage.toString())
    if (query) params.set('search', query)
    if (selectedSeason !== null) params.set('season', String(selectedSeason))
    else params.set('season', 'all')

    // Only update if params actually changed
    const newParamString = params.toString()
    const currentParamString = searchParams.toString()
    if (newParamString !== currentParamString) {
      setSearchParams(params)
    }
  }, [currentPage, query, selectedSeason, setSearchParams, searchParams])

  React.useEffect(() => {
    let active = true
      ; (async () => {
        const e = await fetchEvents()
        if (!active) return
        setEvents(e)
      })()
    return () => {
      active = false
    }
  }, [])

  // Load seasons
  React.useEffect(() => {
    let active = true
      ; (async () => {
        const all = await getAllSeasons()
        if (!active) return
        setSeasons(all)
        // If no selection yet, default to active season (id 0)
        if (selectedSeason === null) {
          // keep null meaning All; don't override user's URL param
        }
      })()
    return () => { active = false }
  }, [])

  const byId = new Map(players.map((p) => [p.id, p]))
  const eventById = new Map(events.map((e) => [e.id, e]))
  const sorted = [...matches].sort((a, b) => b.id - a.id)
  const nameFiltered = sorted.filter((m) => {
    const p1 = byId.get(m.player1_id)?.name ?? ''
    const p2 = byId.get(m.player2_id)?.name ?? ''
    const q = query.toLowerCase()
    return p1.toLowerCase().includes(q) || p2.toLowerCase().includes(q)
  })
  const filtered = selectedSeason === null
    ? nameFiltered
    : nameFiltered.filter(m => m.season_id === selectedSeason)

  // Pagination calculations
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginatedMatches = React.useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    const end = start + ITEMS_PER_PAGE
    return filtered.slice(start, end)
  }, [filtered, currentPage])

  // Reset to page 1 when search query changes
  React.useEffect(() => {
    setCurrentPage(1)
  }, [query])

  // Reset to page 1 when season filter changes
  React.useEffect(() => {
    setCurrentPage(1)
  }, [selectedSeason])

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-4xl md:text-5xl font-heading font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary/80 to-primary/50 drop-shadow-sm">
          Matches
        </h2>
        <p className="text-muted-foreground font-body text-lg">
          Battle history and upcoming bouts.
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 sm:items-center bg-card/30 p-4 rounded-lg border border-border/40 backdrop-blur-sm">
        <div className="max-w-md w-full">
          <Input
            placeholder="Filter by player name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="bg-background/50 border-primary/30 focus:ring-primary/50 font-body"
          />
        </div>
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
            className="w-full"
          />
        </div>
      </div>

      {paginatedMatches.length === 0 ? (
        <Card className="bg-card/40 backdrop-blur-sm border-border/40">
          <CardContent className="py-12 flex flex-col items-center justify-center text-center">
            <div className="text-4xl mb-4">🔍</div>
            <p className="text-muted-foreground font-heading uppercase tracking-wider text-lg">
              {query ? `No matches found for "${query}"` : 'No matches found'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card/50 backdrop-blur-sm border-border/50 overflow-hidden">
          <div className="divide-y divide-border/30">
            {paginatedMatches.map((m) => {
              const p1 = byId.get(m.player1_id)
              const p2 = byId.get(m.player2_id)
              const event = m.event_id ? eventById.get(m.event_id) : null
              const isCompleted = m.winner_id !== null
              const isP1Winner = m.winner_id === m.player1_id

              if (!p1 || !p2) {
                return null
              }

              return (
                <button
                  key={m.id}
                  onClick={() => openMatch(m.id)}
                  className="w-full text-left hover:bg-muted/30 transition-colors cursor-pointer focus:outline-none focus:bg-muted/30 px-4 py-3"
                >
                  <div className="flex items-center justify-center gap-3 md:gap-6">
                    {/* Player 1 - right aligned */}
                    <div
                      onClick={(e) => { e.stopPropagation(); navigate(`/players/${p1.id}`); }}
                      className="flex items-center gap-2 md:gap-3 flex-1 min-w-0 justify-end cursor-pointer group/p1"
                    >
                      <span className={`font-heading font-bold text-sm md:text-base truncate transition-colors group-hover/p1:text-primary ${isCompleted && isP1Winner ? 'text-yellow-500' : ''}`}>
                        {p1.name}
                      </span>
                      <PlayerAvatar
                        name={p1.name}
                        twitter={p1.twitter}
                        size={40}
                        className={`h-10 w-10 shrink-0 border-2 transition-colors group-hover/p1:border-primary ${isCompleted && isP1Winner ? 'border-yellow-500' : 'border-border'}`}
                      />
                    </div>

                    {/* Score - centered */}
                    <div className="flex items-center justify-center shrink-0 min-w-[70px] md:min-w-[90px]">
                      {isCompleted ? (
                        <div className="flex items-center gap-1.5 md:gap-2">
                          <span className={`font-heading font-black text-lg md:text-2xl ${isP1Winner ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                            {m.player1_score ?? '?'}
                          </span>
                          <span className="text-muted-foreground text-sm md:text-base">-</span>
                          <span className={`font-heading font-black text-lg md:text-2xl ${!isP1Winner ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                            {m.player2_score ?? '?'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground font-heading font-bold text-sm md:text-lg uppercase">vs</span>
                      )}
                    </div>

                    {/* Player 2 - left aligned */}
                    <div
                      onClick={(e) => { e.stopPropagation(); navigate(`/players/${p2.id}`); }}
                      className="flex items-center gap-2 md:gap-3 flex-1 min-w-0 justify-start cursor-pointer group/p2"
                    >
                      <PlayerAvatar
                        name={p2.name}
                        twitter={p2.twitter}
                        size={40}
                        className={`h-10 w-10 shrink-0 border-2 transition-colors group-hover/p2:border-primary ${isCompleted && !isP1Winner ? 'border-yellow-500' : 'border-border'}`}
                      />
                      <span className={`font-heading font-bold text-sm md:text-base truncate transition-colors group-hover/p2:text-primary ${isCompleted && !isP1Winner ? 'text-yellow-500' : ''}`}>
                        {p2.name}
                      </span>
                    </div>
                  </div>

                  {/* Event - always reserve space for consistent row height */}
                  <div className="text-xs text-muted-foreground text-center mt-1.5 truncate h-4">
                    {event ? event.title : 'No event'}
                  </div>
                </button>
              )
            })}
          </div>
        </Card>
      )}

      {filtered.length > ITEMS_PER_PAGE && (
        <div className="flex justify-center pt-8">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={ITEMS_PER_PAGE}
            totalItems={filtered.length}
          />
        </div>
      )}
    </section>
  )
}
