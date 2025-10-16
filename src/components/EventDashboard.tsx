import { useState, useEffect } from 'react'
import { supabase } from '@/supabase/client'
import { Match, Player, Event } from '@/types/models'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Combobox } from '@/components/ui/combobox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Trophy, Clock, CheckCircle2, RefreshCw, Undo2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { updateRatingForMatch, canRollbackMatch, rollbackMatch } from '@/lib/ratings-events'

interface ScoreFormData {
  player1_score: string
  player2_score: string
  winner_id: string
}

export default function EventDashboard() {
  const { toast } = useToast()
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [matches, setMatches] = useState<Match[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
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
      toast({
        variant: 'destructive',
        title: 'Error loading events',
        description: error.message
      })
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

  const loadMatches = async (isRefresh = false) => {
    if (!selectedEventId) return

    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('event_id', parseInt(selectedEventId))
      .order('match_order')

    if (error) {
      console.error('Error loading matches:', error)
      toast({
        variant: 'destructive',
        title: 'Error loading matches',
        description: error.message
      })
    } else {
      setMatches(data || [])
    }
    
    setLoading(false)
    setRefreshing(false)
  }

  const getPlayerName = (playerId: number) => {
    return players.find(p => p.id === playerId)?.name || 'Unknown'
  }

  const openScoreDialog = (match: Match) => {
    setEditingMatch(match)
    setScoreForm({
      player1_score: match.player1_score !== undefined && match.player1_score !== null ? String(match.player1_score) : '',
      player2_score: match.player2_score !== undefined && match.player2_score !== null ? String(match.player2_score) : '',
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
      const p1Score = scoreForm.player1_score !== '' ? parseInt(scoreForm.player1_score) : null
      const p2Score = scoreForm.player2_score !== '' ? parseInt(scoreForm.player2_score) : null
      const winnerId = scoreForm.winner_id ? parseInt(scoreForm.winner_id) : null

      // Validate: either set all three (completing match) or none (keep upcoming)
      const completing = p1Score !== null || p2Score !== null || winnerId !== null
      if (completing) {
        if (p1Score === null || p2Score === null || winnerId === null) {
          throw new Error('To complete a match, enter both scores and select a winner')
        }
        if (winnerId !== editingMatch.player1_id && winnerId !== editingMatch.player2_id) {
          throw new Error('Winner must be one of the two players')
        }
      }

      // Check if the match previously had a result (changing existing result requires recalc)
      const wasCompleted = editingMatch.winner_id !== null
      const resultChanged = wasCompleted && completing && (
        editingMatch.winner_id !== winnerId ||
        editingMatch.player1_score !== p1Score ||
        editingMatch.player2_score !== p2Score
      )

      const { error } = await supabase
        .from('matches')
        .update({
          player1_score: p1Score,
          player2_score: p2Score,
          winner_id: winnerId
        })
        .eq('id', editingMatch.id)

      if (error) throw error

      toast({
        title: 'Score updated',
        description: completing ? 'Match updated. Calculating ratings...' : 'Match kept as upcoming.'
      })
      
      setScoreDialogOpen(false)
      loadMatches(true)

      // Only recalculate ratings if result was changed or newly set
      if (resultChanged || (completing && !wasCompleted)) {
        const ratingResult = await updateRatingForMatch(editingMatch.id, (message: string) => {
          console.log('Rating update:', message)
        })

        if (ratingResult.success) {
          toast({
            variant: 'success',
            title: 'Ratings updated',
            description: 'Player ratings have been calculated.'
          })
          // Reload matches to reflect new ratings
          await loadMatches(true)
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

  const handleRollback = async (match: Match) => {
    // Check eligibility first
    const eligibility = await canRollbackMatch(match.id)
    
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
    
    const result = await rollbackMatch(match.id, (message) => {
      console.log('Rollback progress:', message)
    })

    if (result.success) {
      toast({
        variant: 'success',
        title: 'Match rolled back',
        description: 'The match was reverted to upcoming and ratings have been recalculated.'
      })
      loadMatches(true)
    } else {
      toast({
        variant: 'destructive',
        title: 'Rollback failed',
        description: result.error || 'Failed to rollback match'
      })
    }
    
    setSubmitting(false)
  }

  const selectedEvent = events.find(e => e.id === parseInt(selectedEventId))
  const completedMatches = matches.filter(m => m.winner_id !== null)
  const upcomingMatches = matches.filter(m => m.winner_id === null)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Event Dashboard</CardTitle>
              <CardDescription>Register scores for matches within an event</CardDescription>
            </div>
            {selectedEventId && (
              <Button 
                onClick={() => loadMatches(true)} 
                variant="outline" 
                size="icon"
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Select Event</Label>
            <Combobox
              value={selectedEventId}
              onValueChange={setSelectedEventId}
              options={events.map(event => ({
                value: String(event.id),
                label: `${event.title} - ${new Date(event.event_date).toLocaleDateString()}`
              }))}
              placeholder="Choose an event"
              searchPlaceholder="Search events..."
            />
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
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1 cursor-pointer" onClick={() => openScoreDialog(match)}>
                        <div className="text-sm text-muted-foreground">
                          #{match.match_order || 0}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={match.winner_id === match.player1_id ? 'font-bold' : ''}>
                            {getPlayerName(match.player1_id)}
                          </span>
                          <span className="text-muted-foreground">
                            {(match.player1_score ?? '?')} - {(match.player2_score ?? '?')}
                          </span>
                          <span className={match.winner_id === match.player2_id ? 'font-bold' : ''}>
                            {getPlayerName(match.player2_id)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Trophy className="h-4 w-4 text-yellow-500" />
                          <span className="font-medium">{getPlayerName(match.winner_id!)}</span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRollback(match)
                          }}
                          disabled={submitting}
                          title="Rollback match (only if both players have no matches afterwards)"
                        >
                          <Undo2 className="h-4 w-4" />
                        </Button>
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
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{getPlayerName(editingMatch.player2_id)} Score *</Label>
                    <Input
                      type="number"
                      min="0"
                      value={scoreForm.player2_score}
                      onChange={(e) => setScoreForm({ ...scoreForm, player2_score: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Winner *</Label>
                  <Combobox
                    value={scoreForm.winner_id}
                    onValueChange={(v) => setScoreForm({ ...scoreForm, winner_id: v })}
                    options={[
                      { value: String(editingMatch.player1_id), label: getPlayerName(editingMatch.player1_id) },
                      { value: String(editingMatch.player2_id), label: getPlayerName(editingMatch.player2_id) }
                    ]}
                    placeholder="Select winner"
                    searchPlaceholder="Search players..."
                  />
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
