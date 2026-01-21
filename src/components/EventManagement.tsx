import { useState, useEffect } from 'react'
import { supabase } from '@/supabase/client'
import { Event, Season } from '@/types/models'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Pencil, Trash2, Plus, Calendar, RefreshCw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getAllSeasons } from '@/lib/seasons'

interface EventFormData {
  title: string
  event_date: string
  stream_url?: string
  vod_link?: string
  description?: string
}

export default function EventManagement() {
  const { toast } = useToast()
  const [events, setEvents] = useState<Event[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    event_date: '',
    stream_url: '',
    vod_link: '',
    description: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadEvents()
    loadSeasons()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadSeasons = async () => {
    const allSeasons = await getAllSeasons()
    setSeasons(allSeasons)
    const activeSeason = allSeasons.find(s => s.status === 'active')
    if (activeSeason) {
      setSelectedSeason(activeSeason.id)
    }
  }

  const loadEvents = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    // Force fresh data by adding a timestamp to bypass cache
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('event_date', { ascending: false })

    if (error) {
      console.error('Error loading events:', error)
      setError(error.message)
      toast({
        variant: 'destructive',
        title: 'Error loading events',
        description: error.message
      })
    } else {
      setEvents(data || [])
    }

    setLoading(false)
    setRefreshing(false)
  }

  const openCreateDialog = () => {
    setEditingEvent(null)
    setFormData({
      title: '',
      event_date: '',
      stream_url: '',
      vod_link: '',
      description: ''
    })
    setError(null)
    setDialogOpen(true)
  }

  const openEditDialog = (event: Event) => {
    setEditingEvent(event)
    // Convert ISO string to local datetime format for the input
    const localDateTime = new Date(event.event_date).toISOString().slice(0, 16)
    setFormData({
      title: event.title,
      event_date: localDateTime,
      stream_url: event.stream_url || '',
      vod_link: event.vod_link || '',
      description: event.description || ''
    })
    setError(null)
    setDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      if (!formData.event_date) {
        throw new Error('Event date and time are required.')
      }

      const eventData = {
        title: formData.title,
        event_date: new Date(formData.event_date).toISOString(),
        stream_url: formData.stream_url || null,
        vod_link: formData.vod_link || null,
        description: formData.description || null
      }

      if (editingEvent) {
        const { error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', editingEvent.id)

        if (error) throw error

        toast({
          variant: 'success',
          title: 'Event updated',
          description: `${formData.title} has been updated successfully.`
        })
      } else {
        const { error } = await supabase
          .from('events')
          .insert(eventData)

        if (error) throw error

        toast({
          variant: 'success',
          title: 'Event created',
          description: `${formData.title} has been created successfully.`
        })
      }

      setDialogOpen(false)
      loadEvents(true)
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

  const handleDelete = async (event: Event) => {
    if (!confirm(`Are you sure you want to delete "${event.title}"? Matches will be kept but unlinked from this event.`)) {
      return
    }

    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', event.id)

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error deleting event',
        description: error.message
      })
    } else {
      toast({
        variant: 'success',
        title: 'Event deleted',
        description: `${event.title} has been deleted.`
      })
      loadEvents(true)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="font-heading text-2xl text-primary">Event Management</CardTitle>
            <CardDescription>Create, edit, and delete events</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => loadEvents(true)}
              variant="outline"
              size="icon"
              disabled={refreshing}
              className="bg-background/50 border-primary/30 hover:bg-primary/20"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={openCreateDialog} className="font-heading font-bold uppercase tracking-wider">
              <Plus className="h-4 w-4 mr-2" />
              New Event
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 bg-background/30 p-2 rounded-lg border border-border/30 w-fit">
          <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground px-2">Season:</label>
          <Select value={selectedSeason?.toString() ?? ''} onValueChange={(value) => setSelectedSeason(parseInt(value))}>
            <SelectTrigger className="w-48 bg-transparent border-none focus:ring-0 font-heading font-bold text-primary">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {seasons.filter(s => s.status === 'active').map(season => (
                <SelectItem key={season.id} value={season.id.toString()}>
                  {season.name} (Active)
                </SelectItem>
              ))}
              {seasons.filter(s => s.status === 'archived').sort((a, b) => a.id - b.id).map(season => (
                <SelectItem key={season.id} value={season.id.toString()}>
                  {season.name} (Archived)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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
                  <TableHead className="font-heading font-bold text-primary">Title</TableHead>
                  <TableHead className="font-heading font-bold text-primary">Date</TableHead>
                  <TableHead className="font-heading font-bold text-primary">Description</TableHead>
                  <TableHead className="text-right font-heading font-bold text-primary">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No events found
                    </TableCell>
                  </TableRow>
                ) : (
                  events.map((event) => (
                    <TableRow key={event.id} className="hover:bg-primary/5 border-border/40 transition-colors">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-primary" />
                          <span className="font-heading font-bold">{event.title}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">{formatDate(event.event_date)}</TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground italic">
                        {event.description || '-'}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(event)}
                          className="hover:bg-primary/20 hover:text-primary"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(event)}
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
        <DialogContent className="max-w-2xl bg-card/90 backdrop-blur-xl border-primary/20">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl text-primary">{editingEvent ? 'Edit Event' : 'Create Event'}</DialogTitle>
            <DialogDescription>
              {editingEvent ? 'Update event information' : 'Add a new event to the system'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="font-bold uppercase tracking-wider text-xs">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="Event title"
                  className="bg-background/50 border-primary/30 focus:ring-primary/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event_date" className="font-bold uppercase tracking-wider text-xs">Date & Time *</Label>
                <input
                  id="event_date"
                  type="datetime-local"
                  className="flex h-9 w-full rounded-md border border-primary/30 bg-background/50 px-3 py-1 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50 [color-scheme:dark]"
                  value={formData.event_date}
                  onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stream_url" className="font-bold uppercase tracking-wider text-xs">Stream URL</Label>
                <Input
                  id="stream_url"
                  type="url"
                  value={formData.stream_url}
                  onChange={(e) => setFormData({ ...formData, stream_url: e.target.value })}
                  placeholder="https://twitch.tv/..."
                  className="bg-background/50 border-primary/30 focus:ring-primary/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vod_link" className="font-bold uppercase tracking-wider text-xs">VOD Link</Label>
                <Input
                  id="vod_link"
                  type="url"
                  value={formData.vod_link}
                  onChange={(e) => setFormData({ ...formData, vod_link: e.target.value })}
                  placeholder="https://youtube.com/..."
                  className="bg-background/50 border-primary/30 focus:ring-primary/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="font-bold uppercase tracking-wider text-xs">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Event description"
                  rows={3}
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
                {submitting ? 'Saving...' : editingEvent ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
