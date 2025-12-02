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
      <div className="min-h-screen bg-background text-foreground font-body selection:bg-primary selection:text-primary-foreground">
        <nav className="border-b border-border/60 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="container flex items-center gap-4 md:gap-8 py-3 md:py-4 flex-wrap">
            <NavLink to="/" className="shrink-0 group">
              <div className="bg-red-800 px-4 py-2 rounded-md shadow-lg group-hover:shadow-xl transition-all group-hover:scale-105 border border-red-700">
                <span className="font-heading font-black text-xl tracking-widest text-white">
                  OFC
                </span>
              </div>
            </NavLink>
            <div className="hidden md:flex gap-6 text-sm font-heading font-bold tracking-wider uppercase">
              <NavLink to="/rankings" className={({ isActive }) =>
                `transition-colors hover:text-primary ${isActive ? 'text-primary drop-shadow-[0_0_8px_rgba(234,179,8,0.4)]' : 'text-muted-foreground'}`
              }>
                Rankings
              </NavLink>
              <NavLink to="/matches" className={({ isActive }) =>
                `transition-colors hover:text-primary ${isActive ? 'text-primary drop-shadow-[0_0_8px_rgba(234,179,8,0.4)]' : 'text-muted-foreground'}`
              }>
                Matches
              </NavLink>
              <NavLink to="/events" className={({ isActive }) =>
                `transition-colors hover:text-primary ${isActive ? 'text-primary drop-shadow-[0_0_8px_rgba(234,179,8,0.4)]' : 'text-muted-foreground'}`
              }>
                Events
              </NavLink>
            </div>
            <div className="ml-auto flex items-center gap-2 md:gap-4 min-w-0">
              {loading ? (
                <div className="h-8 w-24 animate-pulse rounded-md bg-muted" aria-hidden />
              ) : session ? (
                <Button variant="ghost" size="sm" onClick={signOut} className="font-heading uppercase tracking-wider hover:text-primary hover:bg-primary/10">Sign out</Button>
              ) : (
                <Button asChild variant="outline" size="sm" className="font-heading uppercase tracking-wider border-primary/50 hover:border-primary hover:bg-primary/10 text-primary">
                  <NavLink to="/login">Login</NavLink>
                </Button>
              )}
              <ThemeToggle />
              <button
                type="button"
                aria-label="Toggle menu"
                aria-expanded={menuOpen}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden text-primary"
                onClick={() => setMenuOpen((v) => !v)}
              >
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
            <div className={`${menuOpen ? 'block' : 'hidden'} w-full md:hidden border-t border-border/50 mt-2`}
              onClick={() => setMenuOpen(false)}>
              <div className="flex flex-col gap-2 pt-4 pb-3 text-sm font-heading font-bold tracking-wider uppercase">
                <NavLink to="/rankings" className={({ isActive }) => isActive ? 'text-primary pl-2 border-l-2 border-primary' : 'text-muted-foreground pl-2 border-l-2 border-transparent'}>Rankings</NavLink>
                <NavLink to="/matches" className={({ isActive }) => isActive ? 'text-primary pl-2 border-l-2 border-primary' : 'text-muted-foreground pl-2 border-l-2 border-transparent'}>Matches</NavLink>
                <NavLink to="/events" className={({ isActive }) => isActive ? 'text-primary pl-2 border-l-2 border-primary' : 'text-muted-foreground pl-2 border-l-2 border-transparent'}>Events</NavLink>
              </div>
            </div>
          </div>
        </nav>
        <main className="container py-8 md:py-12">
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
