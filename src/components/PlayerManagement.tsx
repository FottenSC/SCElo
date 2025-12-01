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
    <Card className="bg-card/50 border-border/50">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="font-heading text-2xl text-primary">Player Management</CardTitle>
            <CardDescription>Create, edit, and delete players</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => loadPlayers(true)}
              variant="outline"
              size="icon"
              disabled={refreshing}
              className="bg-background/50 border-primary/30 hover:bg-primary/20"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={openCreateDialog} className="font-heading font-bold uppercase tracking-wider">
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
          className="max-w-sm bg-background/50 border-primary/30 focus:ring-primary/50 font-heading font-bold"
        />

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            Loading...
          </div>
        ) : (
          <div className="rounded-md border border-border/40 overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="hover:bg-transparent border-border/40">
                  <TableHead className="font-heading font-bold text-primary">Name</TableHead>
                  <TableHead className="font-heading font-bold text-primary">Twitter</TableHead>
                  <TableHead className="font-heading font-bold text-primary">Rating</TableHead>
                  <TableHead className="font-heading font-bold text-primary">Matches</TableHead>
                  <TableHead className="text-right font-heading font-bold text-primary">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlayers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No players found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPlayers.map((player) => (
                    <TableRow key={player.id} className="hover:bg-primary/5 border-border/40 transition-colors">
                      <TableCell className="font-heading font-bold text-lg">{player.name}</TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">{player.twitter || '-'}</TableCell>
                      <TableCell className="font-mono font-bold text-primary">{Math.round(player.rating ?? 0)}</TableCell>
                      <TableCell className="font-mono text-muted-foreground">{player.matches_played || 0}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(player)}
                          className="hover:bg-primary/20 hover:text-primary"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(player)}
                          className="hover:bg-destructive/20 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card/90 backdrop-blur-xl border-primary/20">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl text-primary">{editingPlayer ? 'Edit Player' : 'Create Player'}</DialogTitle>
            <DialogDescription>
              {editingPlayer ? 'Update player information' : 'Add a new player to the system'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="font-bold uppercase tracking-wider text-xs">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Player name"
                  className="bg-background/50 border-primary/30 focus:ring-primary/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="twitter" className="font-bold uppercase tracking-wider text-xs">Twitter Handle</Label>
                <Input
                  id="twitter"
                  value={formData.twitter}
                  onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                  placeholder="@username"
                  className="bg-background/50 border-primary/30 focus:ring-primary/50"
                />
              </div>
              {error && (
                <div className="text-sm text-destructive font-bold bg-destructive/10 p-2 rounded border border-destructive/20">{error}</div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="font-bold uppercase tracking-wider">
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="font-heading font-bold uppercase tracking-wider">
                {submitting ? 'Saving...' : editingPlayer ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
