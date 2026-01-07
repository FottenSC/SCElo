import { Link, Outlet } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/supabase/useAuth'
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
            <Link to="/" className="shrink-0 group">
              <div className="bg-red-800 px-4 py-2 rounded-md shadow-lg group-hover:shadow-xl transition-all group-hover:scale-105 border border-red-700">
                <span className="font-heading font-black text-xl tracking-widest text-white">
                  OFC
                </span>
              </div>
            </Link>
            <div className="hidden md:flex gap-6 text-sm font-heading font-bold tracking-wider uppercase">
              <Link
                to="/rankings"
                className="transition-colors hover:text-primary text-muted-foreground"
                activeProps={{ className: "transition-colors hover:text-primary text-primary drop-shadow-[0_0_8px_rgba(234,179,8,0.4)]" }}
              >
                Rankings
              </Link>
              <Link
                to="/matches"
                className="transition-colors hover:text-primary text-muted-foreground"
                activeProps={{ className: "transition-colors hover:text-primary text-primary drop-shadow-[0_0_8px_rgba(234,179,8,0.4)]" }}
              >
                Matches
              </Link>
              <Link
                to="/events"
                className="transition-colors hover:text-primary text-muted-foreground"
                activeProps={{ className: "transition-colors hover:text-primary text-primary drop-shadow-[0_0_8px_rgba(234,179,8,0.4)]" }}
              >
                Events
              </Link>
            </div>
            <div className="ml-auto flex items-center gap-2 md:gap-4 min-w-0">
              {loading ? (
                <div className="h-8 w-24 animate-pulse rounded-md bg-muted" aria-hidden />
              ) : session ? (
                <Button variant="ghost" size="sm" onClick={signOut} className="font-heading uppercase tracking-wider hover:text-primary hover:bg-primary/10">Sign out</Button>
              ) : (
                <Button asChild variant="outline" size="sm" className="font-heading uppercase tracking-wider border-primary/50 hover:border-primary hover:bg-primary/10 text-primary">
                  <Link to="/login">Login</Link>
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
                <Link
                  to="/rankings"
                  className="text-muted-foreground pl-2 border-l-2 border-transparent"
                  activeProps={{ className: "text-primary pl-2 border-l-2 border-primary" }}
                >
                  Rankings
                </Link>
                <Link
                  to="/matches"
                  className="text-muted-foreground pl-2 border-l-2 border-transparent"
                  activeProps={{ className: "text-primary pl-2 border-l-2 border-primary" }}
                >
                  Matches
                </Link>
                <Link
                  to="/events"
                  className="text-muted-foreground pl-2 border-l-2 border-transparent"
                  activeProps={{ className: "text-primary pl-2 border-l-2 border-primary" }}
                >
                  Events
                </Link>
              </div>
            </div>
          </div>
        </nav>
        <main className="container py-8 md:py-12">
          <Outlet />
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
