import { Route, Routes, NavLink, Navigate } from 'react-router-dom'
import { useState } from 'react'
import Rankings from './Rankings'
import Matches from './Matches'
import Events from './Events'
import SingleEvent from './SingleEvent'
import Profile from './Profile'
import Player from './Player'
import Login from './Login'
import NotFound from './NotFound'
import Admin from './Admin'
import { UpcomingMatches } from './UpcomingMatches'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/supabase/AuthContext'
import { ThemeToggle } from '@/components/theme-toggle'
import { MatchModalProvider, useMatchModal } from '@/components/MatchModalContext'
import { MatchDetailModal } from '@/components/MatchDetailModal'
import { Menu, X } from 'lucide-react'

function AppContent() {
  const { session, loading, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const { matchId, closeMatch } = useMatchModal()
  
  return (
      <>
      <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b">
        <div className="container flex items-center gap-4 md:gap-6 py-3 md:py-4 flex-wrap">
          <NavLink to="/" className="shrink-0">
            <span className="bg-red-600 text-white font-bold px-3 py-1.5 rounded-md text-sm">OFC</span>
          </NavLink>
          {/* Desktop nav */}
          <div className="hidden md:flex gap-4 text-sm">
            <NavLink to="/rankings" className={({ isActive }) => isActive ? 'text-primary' : ''}>
              Rankings
            </NavLink>
            <NavLink to="/matches" className={({ isActive }) => isActive ? 'text-primary' : ''}>
              Matches
            </NavLink>
            <NavLink to="/events" className={({ isActive }) => isActive ? 'text-primary' : ''}>
              Events
            </NavLink>
          </div>
          {/* Right controls */}
          <div className="ml-auto flex items-center gap-2 md:gap-3 min-w-0">
            {loading ? (
              <div className="h-8 w-24 animate-pulse rounded-md bg-muted" aria-hidden />
            ) : session ? (
              <Button variant="ghost" size="sm" onClick={signOut}>Sign out</Button>
            ) : (
              <Button asChild variant="outline" size="sm">
                <NavLink to="/login">Login</NavLink>
              </Button>
            )}
            <ThemeToggle />
            {/* Mobile menu button */}
            <button
              type="button"
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
          {/* Mobile menu panel */}
          <div className={`${menuOpen ? 'block' : 'hidden'} w-full md:hidden`}
               onClick={() => setMenuOpen(false)}>
            <div className="flex flex-col gap-2 pt-2 pb-3 text-sm">
              <NavLink to="/rankings" className={({ isActive }) => isActive ? 'text-primary' : ''}>Rankings</NavLink>
              <NavLink to="/matches" className={({ isActive }) => isActive ? 'text-primary' : ''}>Matches</NavLink>
              <NavLink to="/events" className={({ isActive }) => isActive ? 'text-primary' : ''}>Events</NavLink>
            </div>
          </div>
        </div>
      </nav>
      <main className="container py-6">
        <Routes>
          <Route path="/" element={<UpcomingMatches />} />
          <Route path="/rankings" element={<Rankings />} />
          <Route path="/players" element={<Navigate to="/rankings" replace />} />
          <Route path="/players/:id" element={<Player />} />
          <Route path="/matches" element={<Matches />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/:id" element={<SingleEvent />} />
          <Route path="/upcoming" element={<UpcomingMatches />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      </div>
      
      {/* Match Detail Modal */}
      <MatchDetailModal 
        matchId={matchId} 
        open={matchId !== null} 
        onOpenChange={(open) => !open && closeMatch()} 
      />
      </>
  )
}

export default function App() {
  return (
    <MatchModalProvider>
      <AppContent />
    </MatchModalProvider>
  )
}
