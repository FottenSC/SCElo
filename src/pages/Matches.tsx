import * as React from 'react'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useSearchParams } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { usePlayersAndMatches, fetchEvents } from '@/lib/data'
import { MatchCard } from '@/components/MatchCard'
import type { Event } from '@/types/models'

const ITEMS_PER_PAGE = 25

export default function Matches() {
  useDocumentTitle('Matches')
  const { players, matches, loading } = usePlayersAndMatches()
  const [searchParams, setSearchParams] = useSearchParams()
  const [events, setEvents] = React.useState<Event[]>([])
  
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
    setSearchParams(params, { replace: true })
  }, [currentPage, query, setSearchParams])
  
  React.useEffect(() => {
    let active = true
    ;(async () => {
      const e = await fetchEvents()
      if (!active) return
      setEvents(e)
    })()
    return () => {
      active = false
    }
  }, [])
  
  const byId = new Map(players.map((p) => [p.id, p]))
  const eventById = new Map(events.map((e) => [e.id, e]))
  const sorted = [...matches].sort((a, b) => b.id - a.id)
  const filtered = sorted.filter((m) => {
    const p1 = byId.get(m.player1_id)?.name ?? ''
    const p2 = byId.get(m.player2_id)?.name ?? ''
    const q = query.toLowerCase()
    return p1.toLowerCase().includes(q) || p2.toLowerCase().includes(q)
  })
  
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
  
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Matches</h2>
      {loading && <p className="text-muted-foreground">Loading...</p>}
      <div className="max-w-md">
        <Input
          placeholder="Filter by player name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      
      {paginatedMatches.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-muted-foreground text-center">
              {query ? `No matches found for "${query}"` : 'No matches found'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {paginatedMatches.map((m) => {
            const p1 = byId.get(m.player1_id)
            const p2 = byId.get(m.player2_id)
            const event = m.event_id ? eventById.get(m.event_id) : null
            
            if (!p1 || !p2) {
              return null
            }
            
            return (
              <MatchCard
                key={m.id}
                match={m}
                player1={p1}
                player2={p2}
                event={event}
                showEventLink={true}
                showLinksInHeader={true}
              />
            )
          })}
        </div>
      )}
      
      {filtered.length > ITEMS_PER_PAGE && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          itemsPerPage={ITEMS_PER_PAGE}
          totalItems={filtered.length}
        />
      )}
    </section>
  )
}
