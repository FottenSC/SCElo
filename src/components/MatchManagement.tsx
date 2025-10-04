import { useState, useEffect } from 'react'
import { supabase } from '@/supabase/client'
import { Match, Player, Event } from '@/types/models'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Pencil, Trash2, Plus } from 'lucide-react'

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
  const [matches, setMatches] = useState<Match[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
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

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    const [matchesRes, playersRes, eventsRes] = await Promise.all([
      supabase.from('matches').select('*').order('id', { ascending: false }).limit(100),
      supabase.from('players').select('*').order('name'),
      supabase.from('events').select('*').order('event_date', { ascending: false })
    ])

    if (matchesRes.error) console.error('Error loading matches:', matchesRes.error)
    else setMatches(matchesRes.data || [])

    if (playersRes.error) console.error('Error loading players:', playersRes.error)
    else setPlayers(playersRes.data || [])

    if (eventsRes.error) console.error('Error loading events:', eventsRes.error)
    else setEvents(eventsRes.data || [])

    setLoading(false)
  }

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
      winner_id: '',
      player1_score: '',
      player2_score: '',
      event_id: '',
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
      winner_id: match.winner_id ? String(match.winner_id) : '',
      player1_score: String(match.player1_score),
      player2_score: match.player2_score ? String(match.player2_score) : '',
      event_id: match.event_id ? String(match.event_id) : '',
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
          formData.winner_id !== formData.player1_id && 
          formData.winner_id !== formData.player2_id) {
        throw new Error('Winner must be one of the two players')
      }

      const matchData = {
        player1_id: parseInt(formData.player1_id),
        player2_id: parseInt(formData.player2_id),
        winner_id: formData.winner_id ? parseInt(formData.winner_id) : null,
        player1_score: parseInt(formData.player1_score),
        player2_score: formData.player2_score ? parseInt(formData.player2_score) : null,
        event_id: formData.event_id ? parseInt(formData.event_id) : null,
        match_order: formData.match_order ? parseInt(formData.match_order) : 0,
        vod_link: formData.vod_link || null
      }

      if (editingMatch) {
        const { error } = await supabase
          .from('matches')
          .update(matchData)
          .eq('id', editingMatch.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('matches')
          .insert(matchData)

        if (error) throw error
      }

      setDialogOpen(false)
      loadData()
    } catch (err: any) {
      setError(err.message)
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
      alert(`Error deleting match: ${error.message}`)
    } else {
      loadData()
    }
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
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            New Match
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Select value={eventFilter} onValueChange={setEventFilter}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Filter by event" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              <SelectItem value="0">No Event</SelectItem>
              {events.map(event => (
                <SelectItem key={event.id} value={String(event.id)}>
                  {event.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                      {match.player1_score} - {match.player2_score ?? '?'}
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
                  <Select value={formData.player1_id} onValueChange={(v) => setFormData({ ...formData, player1_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select player 1" />
                    </SelectTrigger>
                    <SelectContent>
                      {players.map(player => (
                        <SelectItem key={player.id} value={String(player.id)}>
                          {player.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="player2_id">Player 2 *</Label>
                  <Select value={formData.player2_id} onValueChange={(v) => setFormData({ ...formData, player2_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select player 2" />
                    </SelectTrigger>
                    <SelectContent>
                      {players.map(player => (
                        <SelectItem key={player.id} value={String(player.id)}>
                          {player.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="player1_score">Player 1 Score *</Label>
                  <Input
                    id="player1_score"
                    type="number"
                    min="0"
                    value={formData.player1_score}
                    onChange={(e) => setFormData({ ...formData, player1_score: e.target.value })}
                    required
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
                <Select value={formData.winner_id} onValueChange={(v) => setFormData({ ...formData, winner_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select winner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No winner (upcoming)</SelectItem>
                    {formData.player1_id && (
                      <SelectItem value={formData.player1_id}>
                        {getPlayerName(parseInt(formData.player1_id))}
                      </SelectItem>
                    )}
                    {formData.player2_id && (
                      <SelectItem value={formData.player2_id}>
                        {getPlayerName(parseInt(formData.player2_id))}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="event_id">Event</Label>
                  <Select value={formData.event_id} onValueChange={(v) => setFormData({ ...formData, event_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select event" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No event</SelectItem>
                      {events.map(event => (
                        <SelectItem key={event.id} value={String(event.id)}>
                          {event.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
