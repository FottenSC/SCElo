import { useState, useEffect } from 'react'
import { supabase } from '@/supabase/client'
import { Player } from '@/types/models'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Pencil, Trash2, Plus, RefreshCw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface PlayerFormData {
  name: string
  twitter?: string
}

export default function PlayerManagement() {
  const { toast } = useToast()
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)
  const [formData, setFormData] = useState<PlayerFormData>({ name: '', twitter: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadPlayers()
  }, [])

  const loadPlayers = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('name')

    if (error) {
      console.error('Error loading players:', error)
      setError(error.message)
      toast({
        variant: 'destructive',
        title: 'Error loading players',
        description: error.message
      })
    } else {
      setPlayers(data || [])
    }
    
    setLoading(false)
    setRefreshing(false)
  }

  const openCreateDialog = () => {
    setEditingPlayer(null)
    setFormData({ name: '', twitter: '' })
    setError(null)
    setDialogOpen(true)
  }

  const openEditDialog = (player: Player) => {
    setEditingPlayer(player)
    setFormData({
      name: player.name,
      twitter: player.twitter || ''
    })
    setError(null)
    setDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      if (editingPlayer) {
        // Update existing player
        const { error } = await supabase
          .from('players')
          .update({
            name: formData.name,
            twitter: formData.twitter || null
          })
          .eq('id', editingPlayer.id)

        if (error) throw error
        
        toast({
          variant: 'success',
          title: 'Player updated',
          description: `${formData.name} has been updated successfully.`
        })
      } else {
        // Create new player with default Glicko-2 values
        const { error } = await supabase
          .from('players')
          .insert({
            name: formData.name,
            twitter: formData.twitter || null,
            rating: 1500,
            rd: 350,
            volatility: 0.06
          })

        if (error) throw error
        
        toast({
          variant: 'success',
          title: 'Player created',
          description: `${formData.name} has been created successfully.`
        })
      }

      setDialogOpen(false)
      loadPlayers(true)
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

  const handleDelete = async (player: Player) => {
    if (!confirm(`Are you sure you want to delete ${player.name}? This will also delete all their matches.`)) {
      return
    }

    const { error } = await supabase
      .from('players')
      .delete()
      .eq('id', player.id)

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error deleting player',
        description: error.message
      })
    } else {
      toast({
        variant: 'success',
        title: 'Player deleted',
        description: `${player.name} has been deleted.`
      })
      loadPlayers(true)
    }
  }

  const filteredPlayers = players.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.twitter?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Player Management</CardTitle>
            <CardDescription>Create, edit, and delete players</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => loadPlayers(true)} 
              variant="outline" 
              size="icon"
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              New Player
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="Search players..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Twitter</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Matches</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPlayers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No players found
                  </TableCell>
                </TableRow>
              ) : (
                filteredPlayers.map((player) => (
                  <TableRow key={player.id}>
                    <TableCell className="font-medium">{player.name}</TableCell>
                    <TableCell>{player.twitter || '-'}</TableCell>
                    <TableCell>{Math.round(player.rating)}</TableCell>
                    <TableCell>{player.matches_played || 0}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(player)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(player)}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPlayer ? 'Edit Player' : 'Create Player'}</DialogTitle>
            <DialogDescription>
              {editingPlayer ? 'Update player information' : 'Add a new player to the system'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Player name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="twitter">Twitter Handle</Label>
                <Input
                  id="twitter"
                  value={formData.twitter}
                  onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                  placeholder="@username"
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
                {submitting ? 'Saving...' : editingPlayer ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
