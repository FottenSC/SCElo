import { useState, useEffect } from 'react'
import { supabase } from '@/supabase/client'
import { Match, Player, Event, Season } from '@/types/models'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Combobox } from '@/components/ui/combobox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Pencil, Trash2, Plus, RefreshCw, Undo2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { updateRatingsAfterMatch, updateRatingForMatch, canRollbackMatch, rollbackMatch } from '@/lib/ratings-events'
import { getAllSeasons } from '@/lib/seasons'

interface MatchFormData {
  player1_id: string
  player2_id: string
  winner_id: string
  player1_score: string
  player2_score: string
  event_id: string
  match_order: string
  vod_link: string
}

export default function MatchManagement() {
  const { toast } = useToast()
  const [matches, setMatches] = useState<Match[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingMatch, setEditingMatch] = useState<Match | null>(null)
  const [formData, setFormData] = useState<MatchFormData>({
    player1_id: '',
    player2_id: '',
    winner_id: '',
    player1_score: '',
    player2_score: '',
    event_id: '',
    match_order: '0',
    vod_link: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [eventFilter, setEventFilter] = useState<string>('all')
  const [rollbackEligibility, setRollbackEligibility] = useState<Map<number, boolean>>(new Map())
  const [checkingRollback, setCheckingRollback] = useState<Set<number>>(new Set())

  useEffect(() => {
    loadData()
    loadSeasons()
  }, [])

  const loadSeasons = async () => {
    const allSeasons = await getAllSeasons()
    setSeasons(allSeasons)
    const activeSeason = allSeasons.find(s => s.status === 'active')
    if (activeSeason) {
      setSelectedSeason(activeSeason.id)
    }
  }

  const loadData = async (isRefresh = false, seasonId = selectedSeason) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    // Build matches query with season filter
    let matchesQuery = supabase.from('matches').select('*').order('id', { ascending: false }).limit(100)
    if (seasonId !== null && seasonId !== undefined) {
      matchesQuery = matchesQuery.eq('season_id', seasonId)
    }

    const [matchesRes, playersRes, eventsRes] = await Promise.all([
      matchesQuery,
      supabase.from('players').select('*').order('name'),
      supabase.from('events').select('*').order('event_date', { ascending: false })
    ])

    if (matchesRes.error) {
      console.error('Error loading matches:', matchesRes.error)
      toast({
        variant: 'destructive',
        title: 'Error loading matches',
        description: matchesRes.error.message
      })
    } else {
      setMatches(matchesRes.data || [])
    }

    if (playersRes.error) {
      console.error('Error loading players:', playersRes.error)
    } else {
      setPlayers(playersRes.data || [])
    }

    if (eventsRes.error) {
      console.error('Error loading events:', eventsRes.error)
    } else {
      setEvents(eventsRes.data || [])
    }

    setLoading(false)
    setRefreshing(false)
  }

  // Reload matches when season changes
  useEffect(() => {
    if (selectedSeason !== null) {
      loadData(false, selectedSeason)
    }
  }, [selectedSeason])

  const getPlayerName = (playerId: number) => {
    return players.find(p => p.id === playerId)?.name || 'Unknown'
  }

  const getEventName = (eventId: number | null | undefined) => {
    if (!eventId) return '-'
    return events.find(e => e.id === eventId)?.title || 'Unknown'
  }

  const openCreateDialog = () => {
    setEditingMatch(null)
    setFormData({
      player1_id: '',
      player2_id: '',
      winner_id: 'none',
      player1_score: '',
      player2_score: '',
      event_id: 'none',
      match_order: '0',
      vod_link: ''
    })
    setError(null)
    setDialogOpen(true)
  }

  const openEditDialog = (match: Match) => {
    setEditingMatch(match)
    setFormData({
      player1_id: String(match.player1_id),
      player2_id: String(match.player2_id),
      winner_id: match.winner_id ? String(match.winner_id) : 'none',
      player1_score: match.player1_score !== undefined && match.player1_score !== null ? String(match.player1_score) : '',
      player2_score: match.player2_score !== undefined && match.player2_score !== null ? String(match.player2_score) : '',
      event_id: match.event_id ? String(match.event_id) : 'none',
      match_order: match.match_order ? String(match.match_order) : '0',
      vod_link: match.vod_link || ''
    })
    setError(null)
    setDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      // Validate players are different
      if (formData.player1_id === formData.player2_id) {
        throw new Error('Player 1 and Player 2 must be different')
      }

      // Validate winner is one of the players (if set)
      if (formData.winner_id &&
        formData.winner_id !== 'none' &&
        formData.winner_id !== formData.player1_id &&
        formData.winner_id !== formData.player2_id) {
        throw new Error('Winner must be one of the two players')
      }

      // Parse inputs
      const winnerId = formData.winner_id && formData.winner_id !== 'none' ? parseInt(formData.winner_id) : null
      const p1Score = formData.player1_score !== '' ? parseInt(formData.player1_score) : null
      const p2Score = formData.player2_score !== '' ? parseInt(formData.player2_score) : null

      // If completing, require both scores and winner
      const completing = winnerId !== null || p1Score !== null || p2Score !== null
      if (completing) {
        if (winnerId === null || p1Score === null || p2Score === null) {
          throw new Error('To complete a match, enter both scores and select a winner')
        }
      }

      const matchData = {
        player1_id: parseInt(formData.player1_id),
        player2_id: parseInt(formData.player2_id),
        winner_id: winnerId,
        player1_score: p1Score,
        player2_score: p2Score,
        event_id: formData.event_id && formData.event_id !== 'none' ? parseInt(formData.event_id) : null,
        match_order: formData.match_order ? parseInt(formData.match_order) : 0,
        vod_link: formData.vod_link || null,
        season_id: selectedSeason ?? 0
      }

      const hasResult = matchData.winner_id !== null

      // Check if we need to recalculate ratings:
      // 1. Creating a new match with a result
      // 2. Updating an existing match with a result (whether it changed or not)
      const wasCompleted = editingMatch?.winner_id !== null
      const resultChanged = editingMatch && wasCompleted && hasResult && (
        editingMatch.winner_id !== matchData.winner_id ||
        editingMatch.player1_score !== matchData.player1_score ||
        editingMatch.player2_score !== matchData.player2_score
      )
      const newMatchWithResult = !editingMatch && hasResult
      const shouldRecalculate = resultChanged || newMatchWithResult || (editingMatch && hasResult)

      let matchIdToUpdate: number | null = null

      if (editingMatch) {
        const { error } = await supabase
          .from('matches')
          .update(matchData)
          .eq('id', editingMatch.id)

        if (error) throw error

        // If match is transitioning from incomplete to complete, mark players as having played
        if (hasResult && !wasCompleted) {
          await supabase
            .from('players')
            .update({ has_played_this_season: true })
            .in('id', [matchData.player1_id, matchData.player2_id])
        }

        toast({
          title: 'Match updated',
          description: hasResult ? 'Match updated. Calculating ratings...' : 'Match has been updated successfully.'
        })

        if (shouldRecalculate) {
          matchIdToUpdate = editingMatch.id
        }
      } else {
        const { data: insertedMatch, error } = await supabase
          .from('matches')
          .insert(matchData)
          .select()

        if (error) throw error

        // If new match has a result, mark both players as having played this season
        if (newMatchWithResult) {
          await supabase
            .from('players')
            .update({ has_played_this_season: true })
            .in('id', [matchData.player1_id, matchData.player2_id])
        }

        toast({
          title: 'Match created',
          description: newMatchWithResult ? 'Match created. Calculating ratings...' : 'Match has been created successfully.'
        })

        // If new match has result, track the ID for rating calculation
        if (newMatchWithResult && insertedMatch && insertedMatch[0]) {
          matchIdToUpdate = insertedMatch[0].id
        }
      }

      setDialogOpen(false)
      loadData(true)

      // Recalculate ratings if we have a match to update
      // Uses efficient single-match update
      if (matchIdToUpdate) {
        const ratingResult = await updateRatingForMatch(matchIdToUpdate)

        if (ratingResult.success) {
          toast({
            variant: 'success',
            title: 'Ratings updated',
            description: 'Player ratings have been calculated.'
          })
          // Reload data to reflect the new ratings
          await loadData(true)
        } else {
          toast({
            variant: 'destructive',
            title: 'Rating update failed',
            description: ratingResult.error || 'Failed to update ratings.'
          })
        }
      }
    } catch (err: any) {
      setError(err.message)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (match: Match) => {
    if (!confirm(`Are you sure you want to delete this match?`)) {
      return
    }

    const { error } = await supabase
      .from('matches')
      .delete()
      .eq('id', match.id)

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error deleting match',
        description: error.message
      })
    } else {
      toast({
        variant: 'success',
        title: 'Match deleted',
        description: 'Match has been deleted.'
      })
      loadData(true)
    }
  }

  const checkRollbackEligibility = async (matchId: number) => {
    setCheckingRollback(prev => new Set(prev).add(matchId))

    const result = await canRollbackMatch(matchId)

    setRollbackEligibility(prev => new Map(prev).set(matchId, result.canRollback))
    setCheckingRollback(prev => {
      const next = new Set(prev)
      next.delete(matchId)
      return next
    })

    return result
  }

  const handleRollback = async (match: Match) => {
    // Check eligibility first
    const eligibility = await checkRollbackEligibility(match.id)

    if (!eligibility.canRollback) {
      toast({
        variant: 'destructive',
        title: 'Cannot rollback match',
        description: eligibility.reason || 'This match cannot be rolled back'
      })
      return
    }

    const player1Name = getPlayerName(match.player1_id)
    const player2Name = getPlayerName(match.player2_id)

    if (!confirm(`Rollback match "${player1Name} vs ${player2Name}"?\n\nThis will revert the match to an upcoming state and recalculate all ratings.`)) {
      return
    }

    setSubmitting(true)

    const result = await rollbackMatch(match.id)

    if (result.success) {
      toast({
        variant: 'success',
        title: 'Match rolled back',
        description: 'The match was reverted to upcoming and ratings have been recalculated.'
      })
      loadData(true)
    } else {
      toast({
        variant: 'destructive',
        title: 'Rollback failed',
        description: result.error || 'Failed to rollback match'
      })
    }

    setSubmitting(false)
  }

  const filteredMatches = eventFilter === 'all'
    ? matches
    : matches.filter(m => m.event_id === parseInt(eventFilter))

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Match Management</CardTitle>
            <CardDescription>Create, edit, and delete matches</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => loadData(true)}
              variant="outline"
              size="icon"
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              New Match
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Select value={selectedSeason?.toString() ?? ''} onValueChange={(val) => setSelectedSeason(val === '0' ? 0 : parseInt(val, 10))}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="Select a season" />
            </SelectTrigger>
            <SelectContent>
              {/* Show active season first */}
              {seasons.filter(s => s.status === 'active').map(season => (
                <SelectItem key={season.id} value={season.id.toString()}>
                  {season.name} (Active)
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

          <Combobox
            value={eventFilter}
            onValueChange={setEventFilter}
            options={[
              { value: "all", label: "All Events" },
              { value: "0", label: "No Event" },
              ...events.map(event => ({
                value: String(event.id),
                label: event.title
              }))
            ]}
            placeholder="Filter by event"
            searchPlaceholder="Search events..."
            className="w-[250px]"
          />
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Player 1</TableHead>
                <TableHead>Player 2</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Winner</TableHead>
                <TableHead>Event</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMatches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No matches found
                  </TableCell>
                </TableRow>
              ) : (
                filteredMatches.map((match) => (
                  <TableRow key={match.id}>
                    <TableCell className="font-medium">{getPlayerName(match.player1_id)}</TableCell>
                    <TableCell className="font-medium">{getPlayerName(match.player2_id)}</TableCell>
                    <TableCell>
                      {(match.player1_score ?? '?')} - {(match.player2_score ?? '?')}
                    </TableCell>
                    <TableCell>
                      {match.winner_id ? getPlayerName(match.winner_id) : <span className="text-muted-foreground">Upcoming</span>}
                    </TableCell>
                    <TableCell>{getEventName(match.event_id)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(match)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {match.winner_id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRollback(match)}
                          disabled={submitting}
                          title="Rollback match (only if both players have no matches afterwards)"
                        >
                          <Undo2 className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(match)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingMatch ? 'Edit Match' : 'Create Match'}</DialogTitle>
            <DialogDescription>
              {editingMatch ? 'Update match information' : 'Add a new match to the system'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="player1_id">Player 1 *</Label>
                  <Combobox
                    value={formData.player1_id}
                    onValueChange={(v) => setFormData({ ...formData, player1_id: v })}
                    options={players.map(player => ({
                      value: String(player.id),
                      label: player.name
                    }))}
                    placeholder="Select player 1"
                    searchPlaceholder="Search players..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="player2_id">Player 2 *</Label>
                  <Combobox
                    value={formData.player2_id}
                    onValueChange={(v) => setFormData({ ...formData, player2_id: v })}
                    options={players.map(player => ({
                      value: String(player.id),
                      label: player.name
                    }))}
                    placeholder="Select player 2"
                    searchPlaceholder="Search players..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="player1_score">Player 1 Score</Label>
                  <Input
                    id="player1_score"
                    type="number"
                    min="0"
                    value={formData.player1_score}
                    onChange={(e) => setFormData({ ...formData, player1_score: e.target.value })}
                    placeholder="Leave empty for upcoming"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="player2_score">Player 2 Score</Label>
                  <Input
                    id="player2_score"
                    type="number"
                    min="0"
                    value={formData.player2_score}
                    onChange={(e) => setFormData({ ...formData, player2_score: e.target.value })}
                    placeholder="Leave empty for upcoming"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="winner_id">Winner (leave empty for upcoming match)</Label>
                <Combobox
                  value={formData.winner_id}
                  onValueChange={(v) => setFormData({ ...formData, winner_id: v })}
                  options={[
                    { value: "none", label: "No winner (upcoming)" },
                    ...(formData.player1_id ? [{
                      value: formData.player1_id,
                      label: getPlayerName(parseInt(formData.player1_id))
                    }] : []),
                    ...(formData.player2_id ? [{
                      value: formData.player2_id,
                      label: getPlayerName(parseInt(formData.player2_id))
                    }] : [])
                  ]}
                  placeholder="Select winner"
                  searchPlaceholder="Search..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="event_id">Event</Label>
                  <Combobox
                    value={formData.event_id}
                    onValueChange={(v) => setFormData({ ...formData, event_id: v })}
                    options={[
                      { value: "none", label: "No event" },
                      ...events.map(event => ({
                        value: String(event.id),
                        label: event.title
                      }))
                    ]}
                    placeholder="Select event"
                    searchPlaceholder="Search events..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="match_order">Match Order</Label>
                  <Input
                    id="match_order"
                    type="number"
                    min="0"
                    value={formData.match_order}
                    onChange={(e) => setFormData({ ...formData, match_order: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vod_link">VOD Link</Label>
                <Input
                  id="vod_link"
                  type="url"
                  value={formData.vod_link}
                  onChange={(e) => setFormData({ ...formData, vod_link: e.target.value })}
                  placeholder="https://youtube.com/..."
                />
              </div>

              {error && (
                <div className="text-sm text-destructive">{error}</div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : editingMatch ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
