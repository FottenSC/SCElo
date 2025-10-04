import { useState, useEffect } from 'react'
import { supabase } from '@/supabase/client'
import { Match, Player, Event } from '@/types/models'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Trophy, Clock, CheckCircle2 } from 'lucide-react'

interface ScoreFormData {
  player1_score: string
  player2_score: string
  winner_id: string
}

export default function EventDashboard() {
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [matches, setMatches] = useState<Match[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(false)
  const [scoreDialogOpen, setScoreDialogOpen] = useState(false)
  const [editingMatch, setEditingMatch] = useState<Match | null>(null)
  const [scoreForm, setScoreForm] = useState<ScoreFormData>({
    player1_score: '',
    player2_score: '',
    winner_id: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadEvents()
    loadPlayers()
  }, [])

  useEffect(() => {
    if (selectedEventId) {
      loadMatches()
    }
  }, [selectedEventId])

  const loadEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('event_date', { ascending: false })

    if (error) {
      console.error('Error loading events:', error)
    } else {
      setEvents(data || [])
      // Auto-select the most recent event
      if (data && data.length > 0 && !selectedEventId) {
        setSelectedEventId(String(data[0].id))
      }
    }
  }

  const loadPlayers = async () => {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('name')

    if (error) {
      console.error('Error loading players:', error)
    } else {
      setPlayers(data || [])
    }
  }

  const loadMatches = async () => {
    if (!selectedEventId) return

    setLoading(true)
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('event_id', parseInt(selectedEventId))
      .order('match_order')

    if (error) {
      console.error('Error loading matches:', error)
    } else {
      setMatches(data || [])
    }
    setLoading(false)
  }

  const getPlayerName = (playerId: number) => {
    return players.find(p => p.id === playerId)?.name || 'Unknown'
  }

  const openScoreDialog = (match: Match) => {
    setEditingMatch(match)
    setScoreForm({
      player1_score: match.winner_id ? String(match.player1_score) : '',
      player2_score: match.player2_score ? String(match.player2_score) : '',
      winner_id: match.winner_id ? String(match.winner_id) : ''
    })
    setError(null)
    setScoreDialogOpen(true)
  }

  const handleSubmitScore = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingMatch) return

    setSubmitting(true)
    setError(null)

    try {
      const p1Score = parseInt(scoreForm.player1_score)
      const p2Score = parseInt(scoreForm.player2_score)
      const winnerId = parseInt(scoreForm.winner_id)

      // Validate
      if (!winnerId || (winnerId !== editingMatch.player1_id && winnerId !== editingMatch.player2_id)) {
        throw new Error('Winner must be one of the two players')
      }

      const { error } = await supabase
        .from('matches')
        .update({
          player1_score: p1Score,
          player2_score: p2Score,
          winner_id: winnerId
        })
        .eq('id', editingMatch.id)

      if (error) throw error

      setScoreDialogOpen(false)
      loadMatches()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const selectedEvent = events.find(e => e.id === parseInt(selectedEventId))
  const completedMatches = matches.filter(m => m.winner_id !== null)
  const upcomingMatches = matches.filter(m => m.winner_id === null)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Event Dashboard</CardTitle>
          <CardDescription>Register scores for matches within an event</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Select Event</Label>
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an event" />
              </SelectTrigger>
              <SelectContent>
                {events.map(event => (
                  <SelectItem key={event.id} value={String(event.id)}>
                    {event.title} - {new Date(event.event_date).toLocaleDateString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedEvent && (
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">{selectedEvent.title}</h3>
              <p className="text-sm text-muted-foreground">
                {new Date(selectedEvent.event_date).toLocaleString()}
              </p>
              {selectedEvent.description && (
                <p className="text-sm mt-2">{selectedEvent.description}</p>
              )}
              <div className="flex gap-4 mt-3 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>{completedMatches.length} completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-500" />
                  <span>{upcomingMatches.length} upcoming</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedEventId && !loading && (
        <>
          {/* Upcoming Matches */}
          {upcomingMatches.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-500" />
                  Upcoming Matches
                </CardTitle>
                <CardDescription>Click to register scores</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {upcomingMatches.map((match) => (
                    <div
                      key={match.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => openScoreDialog(match)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-sm text-muted-foreground">
                          #{match.match_order || 0}
                        </div>
                        <div className="font-medium">
                          {getPlayerName(match.player1_id)} vs {getPlayerName(match.player2_id)}
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        Register Score
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Completed Matches */}
          {completedMatches.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Completed Matches
                </CardTitle>
                <CardDescription>Click to edit scores</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {completedMatches.map((match) => (
                    <div
                      key={match.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => openScoreDialog(match)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-sm text-muted-foreground">
                          #{match.match_order || 0}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={match.winner_id === match.player1_id ? 'font-bold' : ''}>
                            {getPlayerName(match.player1_id)}
                          </span>
                          <span className="text-muted-foreground">
                            {match.player1_score} - {match.player2_score}
                          </span>
                          <span className={match.winner_id === match.player2_id ? 'font-bold' : ''}>
                            {getPlayerName(match.player2_id)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-yellow-500" />
                        <span className="font-medium">{getPlayerName(match.winner_id!)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {matches.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No matches found for this event. Create matches in the Match Management section.
              </CardContent>
            </Card>
          )}
        </>
      )}

      {loading && (
        <div className="text-center py-8 text-muted-foreground">Loading matches...</div>
      )}

      {/* Score Registration Dialog */}
      <Dialog open={scoreDialogOpen} onOpenChange={setScoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register Match Score</DialogTitle>
            <DialogDescription>
              {editingMatch && (
                <>
                  {getPlayerName(editingMatch.player1_id)} vs {getPlayerName(editingMatch.player2_id)}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {editingMatch && (
            <form onSubmit={handleSubmitScore}>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{getPlayerName(editingMatch.player1_id)} Score *</Label>
                    <Input
                      type="number"
                      min="0"
                      value={scoreForm.player1_score}
                      onChange={(e) => setScoreForm({ ...scoreForm, player1_score: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{getPlayerName(editingMatch.player2_id)} Score *</Label>
                    <Input
                      type="number"
                      min="0"
                      value={scoreForm.player2_score}
                      onChange={(e) => setScoreForm({ ...scoreForm, player2_score: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Winner *</Label>
                  <Select value={scoreForm.winner_id} onValueChange={(v) => setScoreForm({ ...scoreForm, winner_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select winner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={String(editingMatch.player1_id)}>
                        {getPlayerName(editingMatch.player1_id)}
                      </SelectItem>
                      <SelectItem value={String(editingMatch.player2_id)}>
                        {getPlayerName(editingMatch.player2_id)}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {error && (
                  <div className="text-sm text-destructive">{error}</div>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setScoreDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Score'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
