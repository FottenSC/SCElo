import { useState, useEffect } from 'react'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { recalculateAllRatingsAsEvents, resetAllPlayerRatings, calculateSeasonRatings, type RecalculationProgress } from '@/lib/ratings-events'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/supabase/AuthContext'
import { Navigate } from 'react-router-dom'
import { supabase } from '@/supabase/client'
import PlayerManagement from '@/components/PlayerManagement'
import EventManagement from '@/components/EventManagement'
import MatchManagement from '@/components/MatchManagement'
import EventDashboard from '@/components/EventDashboard'
import { AlertCircle } from 'lucide-react'
import { 
  getActiveSeason, 
  getAllSeasons, 
  archiveSeasonAndStartNew,
  activateArchivedSeason
} from '@/lib/seasons'
import type { Season } from '@/types/models'

export default function Admin() {
  useDocumentTitle('Admin')
  const { session, isAdmin, loading } = useAuth()
  const [progress, setProgress] = useState<RecalculationProgress>({
    totalMatches: 0,
    processedMatches: 0,
    currentMatch: 0,
    status: 'idle'
  })
  const [result, setResult] = useState<{ success: boolean; error?: string; eventsCreated: number } | null>(null)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [resetResult, setResetResult] = useState<{ success: boolean; error?: string; playersReset: number } | null>(null)
  const [resetting, setResetting] = useState(false)
  
  // Season management state
  const [activeSeason, setActiveSeason] = useState<Season | null>(null)
  const [allSeasons, setAllSeasons] = useState<Season[]>([])
  const [loadingSeasons, setLoadingSeasons] = useState(true)
  const [archivingReason, setArchivingReason] = useState('Season Complete')
  const [archivingInProgress, setArchivingInProgress] = useState(false)
  const [archiveResult, setArchiveResult] = useState<{ success: boolean; error?: string } | null>(null)
  
  // Activate season state
  const [activatingSeasonId, setActivatingSeasonId] = useState<number | null>(null)
  const [activatingInProgress, setActivatingInProgress] = useState(false)
  const [activateResult, setActivateResult] = useState<{ success: boolean; error?: string } | null>(null)
  
  // Season rating calculation state
  const [selectedSeasonForCalc, setSelectedSeasonForCalc] = useState<number | null>(null)
  const [calcProgress, setCalcProgress] = useState<RecalculationProgress>({
    totalMatches: 0,
    processedMatches: 0,
    currentMatch: 0,
    status: 'idle'
  })
  const [calcResult, setCalcResult] = useState<{ success: boolean; error?: string; eventsCreated: number } | null>(null)
  
  // Load seasons on mount
  useEffect(() => {
    loadSeasons()
  }, [])
  
  const loadSeasons = async () => {
    setLoadingSeasons(true)
    try {
      const active = await getActiveSeason()
      const all = await getAllSeasons()
      setActiveSeason(active)
      setAllSeasons(all)
    } catch (error) {
      console.error('Failed to load seasons:', error)
    } finally {
      setLoadingSeasons(false)
    }
  }

  const handleTestPermissions = async () => {
    setTestResult(null)
    
    try {
      // Try to find Fotten player
      const { data: player, error: findError } = await supabase
        .from('players')
        .select('id, name, rating')
        .ilike('name', '%fotten%')
        .single()
      
      if (findError || !player) {
        setTestResult({
          success: false,
          message: `Could not find player with name containing "fotten". Error: ${findError?.message || 'Not found'}`
        })
        return
      }
      
      const oldRating = player.rating
      
      // Try to update rating to 1500
      const { error: updateError } = await supabase
        .from('players')
        .update({ rating: 1500 })
        .eq('id', player.id)
      
      if (updateError) {
        setTestResult({
          success: false,
          message: `Permission denied! Could not update ${player.name}'s rating. Error: ${updateError.message}`
        })
        return
      }
      
      setTestResult({
        success: true,
        message: `✅ Success! Updated ${player.name}'s rating from ${oldRating} to 1500. Admin permissions are working!`
      })
    } catch (error) {
      setTestResult({
        success: false,
        message: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
      })
    }
  }

  const handleRecalculate = async () => {
    setResult(null)
    setProgress({
      totalMatches: 0,
      processedMatches: 0,
      currentMatch: 0,
      status: 'running'
    })

    const result = await recalculateAllRatingsAsEvents((progress) => {
      setProgress(progress)
    })

    setResult(result)
  }

  const handleResetRatings = async () => {
    if (!confirm('⚠️ This will reset ALL player ratings to default values (1500, RD 350, Vol 0.06).\n\nThis action is irreversible and will affect all players. Continue?')) {
      return
    }

    setResetting(true)
    setResetResult(null)

    const result = await resetAllPlayerRatings((message) => {
      console.log('Reset progress:', message)
    })

    setResetResult(result)
    setResetting(false)
  }

  const handleArchiveSeason = async () => {
    if (!activeSeason) {
      alert('No active season found')
      return
    }

    const nextSeasonName = `Season ${(allSeasons.filter(s => s.status === 'archived').length + 1)}`
    
    const message = `🎯 Archive "${activeSeason.name}" and start "${nextSeasonName}"?\n\nThis will:\n• Create snapshots of all current player standings\n• Mark current season as archived\n• Reset all players' ratings\n• Create a new active season\n\nThis action cannot be undone!`
    
    if (!confirm(message)) {
      return
    }

    setArchivingInProgress(true)
    setArchiveResult(null)

    const result = await archiveSeasonAndStartNew(nextSeasonName, (msg) => {
      console.log('Archive progress:', msg)
    })

    setArchiveResult(result)
    setArchivingInProgress(false)
    
    if (result.success) {
      // Reload seasons
      await loadSeasons()
    }
  }

  const handleActivateSeason = async (seasonId: number) => {
    const seasonToActivate = allSeasons.find(s => s.id === seasonId)
    if (!seasonToActivate) {
      alert('Season not found')
      return
    }

    const message = `🔄 Restore "${seasonToActivate.name}" as the active season?\n\nThis will:\n• Archive the current active season with all its matches\n• Restore player ratings from ${seasonToActivate.name}'s snapshots\n• Make ${seasonToActivate.name} the current active season for new matches\n\nThis action cannot be undone!`
    
    if (!confirm(message)) {
      return
    }

    setActivatingSeasonId(seasonId)
    setActivatingInProgress(true)
    setActivateResult(null)

    const result = await activateArchivedSeason(seasonId, (msg) => {
      console.log('Activate progress:', msg)
    })

    setActivateResult(result)
    setActivatingInProgress(false)
    
    if (result.success) {
      // Reload seasons
      await loadSeasons()
    }
  }

  const handleCalculateSeasonRatings = async (seasonId: number) => {
    const season = allSeasons.find(s => s.id === seasonId)
    if (!season) {
      alert('Season not found')
      return
    }

    const message = `🧮 Calculate ratings for "${season.name}"?\n\nThis will:\n• Create rating events from scratch for all matches in this season\n• Calculate final player ratings and standings\n• Create snapshots of the final leaderboard\n• Recalculate all rating changes for matches\n\nExisting rating data will be recalculated. Continue?`
    
    if (!confirm(message)) {
      return
    }

    setSelectedSeasonForCalc(seasonId)
    setCalcProgress({
      totalMatches: 0,
      processedMatches: 0,
      currentMatch: 0,
      status: 'running'
    })
    setCalcResult(null)

    const result = await calculateSeasonRatings(seasonId, (progress) => {
      setCalcProgress(progress)
    })

    setCalcResult(result)
  }

  const getProgressPercentage = () => {
    if (progress.totalMatches === 0) return 0
    return Math.round((progress.processedMatches / progress.totalMatches) * 100)
  }

  const getCalcProgressPercentage = () => {
    if (calcProgress.totalMatches === 0) return 0
    return Math.round((calcProgress.processedMatches / calcProgress.totalMatches) * 100)
  }

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="container py-8">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  // Redirect if not logged in
  if (!session) {
    return <Navigate to="/login" replace />
  }

  // Show access denied if not admin
  if (!isAdmin) {
    return (
      <div className="container py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Access Denied</CardTitle>
              <CardDescription>
                You don't have admin privileges. Please contact an administrator.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Your user ID: <code className="bg-muted px-1 py-0.5 rounded">{session.user.id}</code>
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                To grant yourself admin access, run this SQL in Supabase Studio:
              </p>
              <pre className="bg-muted p-3 rounded mt-2 text-xs overflow-x-auto">
{`UPDATE auth.users
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'admin')
WHERE id = '${session.user.id}';`}
              </pre>
              <p className="text-sm text-muted-foreground mt-2">
                Then refresh this page.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-4xl font-bold">Admin Dashboard</h1>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList>
            <TabsTrigger value="dashboard">Event Dashboard</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="matches">Matches</TabsTrigger>
            <TabsTrigger value="players">Players</TabsTrigger>
            <TabsTrigger value="seasons">Seasons</TabsTrigger>
            <TabsTrigger value="tools">Tools</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <EventDashboard />
          </TabsContent>

          <TabsContent value="events">
            <EventManagement />
          </TabsContent>

          <TabsContent value="matches">
            <MatchManagement />
          </TabsContent>

          <TabsContent value="players">
            <PlayerManagement />
          </TabsContent>

          <TabsContent value="seasons" className="space-y-6">
            {/* Active Season Card */}
            <Card>
              <CardHeader>
                <CardTitle>Active Season</CardTitle>
                <CardDescription>
                  Current season where matches are being recorded
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingSeasons ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : activeSeason ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-secondary rounded-lg">
                      <p className="text-sm font-semibold">{activeSeason.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Started: {new Date(activeSeason.start_date).toLocaleDateString()}
                      </p>
                      {activeSeason.description && (
                        <p className="text-xs text-muted-foreground mt-1">{activeSeason.description}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-destructive">No active season found!</p>
                )}
              </CardContent>
            </Card>

            {/* Archive Season Card */}
            <Card className="border-amber-500/50 bg-amber-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  Archive Season & Start New
                </CardTitle>
                <CardDescription>
                  End the current season, create snapshots, and reset for a new season
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <p className="text-sm text-amber-600 dark:text-amber-400 font-semibold">⚠️ This will:</p>
                  <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                    <li>Create final standings snapshots for all active players</li>
                    <li>Archive the current season permanently</li>
                    <li>Reset all player ratings to NULL (inactive)</li>
                    <li>Create a new active season for fresh matches</li>
                  </ul>
                </div>

                <Button 
                  onClick={handleArchiveSeason}
                  disabled={archivingInProgress || !activeSeason}
                  size="lg"
                  className="w-full"
                >
                  {archivingInProgress ? 'Archiving Season...' : 'Archive Season & Start New'}
                </Button>

                {archiveResult && !archiveResult.success && (
                  <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
                    <p className="text-destructive font-semibold">Error</p>
                    <p className="text-sm text-muted-foreground">{archiveResult.error}</p>
                  </div>
                )}

                {archiveResult && archiveResult.success && (
                  <div className="p-4 bg-green-500/10 border border-green-500 rounded-lg">
                    <p className="text-green-600 dark:text-green-400 font-semibold">✅ Season Archived!</p>
                    <p className="text-sm text-muted-foreground">
                      Season has been archived and a new active season created.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Archive History Card */}
            <Card>
              <CardHeader>
                <CardTitle>Season History</CardTitle>
                <CardDescription>
                  Previously archived seasons. Click "Activate" to restore a season as the current active season.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingSeasons ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : allSeasons.filter(s => s.status === 'archived').length > 0 ? (
                  <div className="space-y-3">
                    {allSeasons
                      .filter(s => s.status === 'archived')
                      .sort((a, b) => b.id - a.id)
                      .map(season => (
                        <div key={season.id} className="p-3 bg-secondary rounded-lg">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <p className="font-medium">{season.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(season.start_date).toLocaleDateString()} 
                                {season.end_date && ` - ${new Date(season.end_date).toLocaleDateString()}`}
                              </p>
                              {season.description && (
                                <p className="text-xs text-muted-foreground">{season.description}</p>
                              )}
                            </div>
                            <Button
                              onClick={() => handleActivateSeason(season.id)}
                              disabled={activatingInProgress && activatingSeasonId === season.id}
                              size="sm"
                              variant="outline"
                            >
                              {activatingInProgress && activatingSeasonId === season.id ? 'Activating...' : 'Activate'}
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No archived seasons yet</p>
                )}
                
                {activateResult && !activateResult.success && (
                  <div className="mt-4 p-4 bg-destructive/10 border border-destructive rounded-lg">
                    <p className="text-destructive font-semibold">Error</p>
                    <p className="text-sm text-muted-foreground">{activateResult.error}</p>
                  </div>
                )}

                {activateResult && activateResult.success && (
                  <div className="mt-4 p-4 bg-green-500/10 border border-green-500 rounded-lg">
                    <p className="text-green-600 dark:text-green-400 font-semibold">✅ Season Activated!</p>
                    <p className="text-sm text-muted-foreground">
                      Season has been restored as the active season and player ratings have been restored.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tools" className="space-y-6">
            {/* Test Permissions Card */}
            <Card>
          <CardHeader>
            <CardTitle>Test Admin Permissions</CardTitle>
            <CardDescription>
              Verify that admin write permissions are working by resetting Fotten's rating to 1500.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleTestPermissions}
              variant="outline"
              size="lg"
              className="w-full"
            >
              Test Permissions (Reset Fotten to 1500)
            </Button>

            {testResult && (
              <div className={`p-4 border rounded-lg ${
                testResult.success 
                  ? 'bg-green-500/10 border-green-500' 
                  : 'bg-destructive/10 border-destructive'
              }`}>
                <p className={`text-sm ${
                  testResult.success 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-destructive'
                }`}>
                  {testResult.message}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rating Recalculation Card */}
        <Card>
          <CardHeader>
            <CardTitle>Rating Recalculation</CardTitle>
            <CardDescription>
              Recalculate all player ratings from scratch and update rating changes on matches.
              This will process all matches in chronological order and update player statistics.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleRecalculate}
              disabled={progress.status === 'running'}
              size="lg"
              className="w-full"
            >
              {progress.status === 'running' ? 'Recalculating...' : 'Recalculate All Ratings'}
            </Button>

            {progress.status === 'running' && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Processing match {progress.currentMatch}</span>
                  <span>{progress.processedMatches} / {progress.totalMatches}</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2.5">
                  <div 
                    className="bg-primary h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${getProgressPercentage()}%` }}
                  />
                </div>
                <div className="text-center text-sm font-medium">
                  {getProgressPercentage()}%
                </div>
              </div>
            )}

            {result && !result.success && (
              <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
                <p className="text-destructive font-semibold">Error</p>
                <p className="text-sm text-muted-foreground">{result.error}</p>
              </div>
            )}

            {result && result.success && progress.status === 'complete' && (
              <div className="p-4 bg-green-500/10 border border-green-500 rounded-lg">
                <p className="text-green-600 dark:text-green-400 font-semibold">✅ Success!</p>
                <p className="text-sm text-muted-foreground">
                  Created {result.eventsCreated} rating events (reset + match events) across {progress.totalMatches} matches.
                </p>
              </div>
            )}

            <div className="pt-4 border-t">
              <h3 className="font-semibold mb-2">Event-Sourced Recalculation:</h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Creates reset events for all players (1500/350/0.06)</li>
                <li>Processes all completed matches in chronological order</li>
                <li>Creates a rating event for each player after each match</li>
                <li>Preserves full rating history in rating_events table</li>
                <li>Syncs latest ratings back to players table</li>
                <li>Updates matches with rating changes (backwards compatibility)</li>
              </ul>
              <p className="text-xs text-muted-foreground mt-2">
                ℹ️ This approach allows future rating resets while keeping history, 
                and enables features like decay or manual adjustments.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Rating Reset Card */}
        <Card className="border-orange-500/50 bg-orange-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Reset All Player Ratings
            </CardTitle>
            <CardDescription>
              Reset all player ratings to default values. This is useful for season resets or fresh starts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
              <p className="text-sm text-orange-600 dark:text-orange-400 font-semibold">⚠️ Warning</p>
              <p className="text-sm text-muted-foreground mt-1">
                This will set all players' ratings to <strong>1500</strong>, RD to <strong>350</strong>, and volatility to <strong>0.06</strong>.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                The reset event will be recorded in the rating history and visible in player profiles.
              </p>
            </div>

            <Button 
              onClick={handleResetRatings}
              disabled={resetting}
              variant="destructive"
              size="lg"
              className="w-full"
            >
              {resetting ? 'Resetting Ratings...' : 'Reset All Player Ratings'}
            </Button>

            {resetResult && !resetResult.success && (
              <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
                <p className="text-destructive font-semibold">Error</p>
                <p className="text-sm text-muted-foreground">{resetResult.error}</p>
              </div>
            )}

            {resetResult && resetResult.success && (
              <div className="p-4 bg-green-500/10 border border-green-500 rounded-lg">
                <p className="text-green-600 dark:text-green-400 font-semibold">✅ Success!</p>
                <p className="text-sm text-muted-foreground">
                  Reset ratings for {resetResult.playersReset} players. The reset has been recorded in player rating history.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Calculate Season Ratings Card */}
        <Card>
          <CardHeader>
            <CardTitle>Calculate Season Ratings</CardTitle>
            <CardDescription>
              Retroactively calculate ratings for archived seasons. This creates rating events and snapshots for historical seasons.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {allSeasons.filter(s => s.status === 'archived').length > 0 ? (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Season</label>
                  <Select value={selectedSeasonForCalc?.toString() ?? ''} onValueChange={(val) => setSelectedSeasonForCalc(val ? parseInt(val) : null)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a season..." />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Show archived seasons from oldest to newest */}
                      {allSeasons
                        .filter(s => s.status === 'archived')
                        .sort((a, b) => a.id - b.id)
                        .map(season => (
                          <SelectItem key={season.id} value={season.id.toString()}>
                            {season.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={() => selectedSeasonForCalc && handleCalculateSeasonRatings(selectedSeasonForCalc)}
                  disabled={!selectedSeasonForCalc || calcProgress.status === 'running'}
                  size="lg"
                  className="w-full"
                >
                  {calcProgress.status === 'running' ? 'Calculating...' : 'Calculate Season Ratings'}
                </Button>

                {calcProgress.status === 'running' && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Processing match {calcProgress.currentMatch}</span>
                      <span>{calcProgress.processedMatches} / {calcProgress.totalMatches}</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2.5">
                      <div 
                        className="bg-primary h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${getCalcProgressPercentage()}%` }}
                      />
                    </div>
                    <div className="text-center text-sm font-medium">
                      {getCalcProgressPercentage()}%
                    </div>
                  </div>
                )}

                {calcResult && !calcResult.success && (
                  <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
                    <p className="text-destructive font-semibold">Error</p>
                    <p className="text-sm text-muted-foreground">{calcResult.error}</p>
                  </div>
                )}

                {calcResult && calcResult.success && (
                  <div className="p-4 bg-green-500/10 border border-green-500 rounded-lg">
                    <p className="text-green-600 dark:text-green-400 font-semibold">✅ Success!</p>
                    <p className="text-sm text-muted-foreground">
                      Created {calcResult.eventsCreated} rating events and snapshots for this season.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No archived seasons available. Archive the current season first.</p>
            )}
          </CardContent>
        </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
