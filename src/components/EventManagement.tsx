import { useState, useEffect } from 'react'
import { supabase } from '@/supabase/client'
import { Event } from '@/types/models'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Pencil, Trash2, Plus, Calendar } from 'lucide-react'

interface EventFormData {
  title: string
  event_date: string
  stream_url?: string
  vod_link?: string
  description?: string
}

export default function EventManagement() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
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
  }, [])

  const loadEvents = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('event_date', { ascending: false })

    if (error) {
      console.error('Error loading events:', error)
      setError(error.message)
    } else {
      setEvents(data || [])
    }
    setLoading(false)
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
    // Convert ISO timestamp to datetime-local format
    const eventDate = new Date(event.event_date)
    const localDate = new Date(eventDate.getTime() - eventDate.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16)
    
    setFormData({
      title: event.title,
      event_date: localDate,
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
      } else {
        const { error } = await supabase
          .from('events')
          .insert(eventData)

        if (error) throw error
      }

      setDialogOpen(false)
      loadEvents()
    } catch (err: any) {
      setError(err.message)
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
      alert(`Error deleting event: ${error.message}`)
    } else {
      loadEvents()
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
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Event Management</CardTitle>
            <CardDescription>Create, edit, and delete events</CardDescription>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            New Event
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No events found
                  </TableCell>
                </TableRow>
              ) : (
                events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {event.title}
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(event.event_date)}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {event.description || '-'}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(event)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(event)}
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
            <DialogTitle>{editingEvent ? 'Edit Event' : 'Create Event'}</DialogTitle>
            <DialogDescription>
              {editingEvent ? 'Update event information' : 'Add a new event to the system'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="Event title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event_date">Date & Time *</Label>
                <Input
                  id="event_date"
                  type="datetime-local"
                  value={formData.event_date}
                  onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stream_url">Stream URL</Label>
                <Input
                  id="stream_url"
                  type="url"
                  value={formData.stream_url}
                  onChange={(e) => setFormData({ ...formData, stream_url: e.target.value })}
                  placeholder="https://twitch.tv/..."
                />
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
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Event description"
                  rows={3}
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
                {submitting ? 'Saving...' : editingEvent ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
