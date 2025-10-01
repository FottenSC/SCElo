import { Route, Routes, NavLink } from 'react-router-dom'
import Home from './Home'
import Rankings from './Rankings'
import Players from './Players'
import Matches from './Matches'
import Profile from './Profile'
import Player from './Player'
import Login from './Login'
import NotFound from './NotFound'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/supabase/AuthContext'
import { ThemeToggle } from '@/components/theme-toggle'
export default function App() {
  const { session, loading, signOut } = useAuth()
  const avatarUrl = (session?.user?.user_metadata as any)?.avatar_url as string | undefined
  const fullName = (session?.user?.user_metadata as any)?.full_name as string | undefined
  const email = session?.user?.email ?? undefined
  return (
      <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b">
        <div className="container flex items-center gap-6 py-4">
          <NavLink to="/" className="font-semibold">SC6 Elo</NavLink>
          <div className="flex gap-4 text-sm">
            <NavLink to="/rankings" className={({ isActive }) => isActive ? 'text-primary' : ''}>
              Rankings
            </NavLink>
            <NavLink to="/players" className={({ isActive }) => isActive ? 'text-primary' : ''}>
              Players
            </NavLink>
            <NavLink to="/matches" className={({ isActive }) => isActive ? 'text-primary' : ''}>
              Matches
            </NavLink>
            <NavLink to="/profile" className={({ isActive }) => isActive ? 'text-primary' : ''}>
              Profile
            </NavLink>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {loading ? (
              <div className="h-8 w-24 animate-pulse rounded-md bg-muted" aria-hidden />
            ) : session ? (
              <>
                <NavLink to="/profile" className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={avatarUrl} />
                    <AvatarFallback>
                      {fullName?.slice(0, 2).toUpperCase() || email?.slice(0, 2).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-sm font-medium max-w-[12ch] truncate">
                    {fullName || email || 'Profile'}
                  </span>
                </NavLink>
                <Button variant="ghost" size="sm" onClick={signOut}>Sign out</Button>
              </>
            ) : (
              <Button asChild variant="outline" size="sm">
                <NavLink to="/login">Login</NavLink>
              </Button>
            )}
            <ThemeToggle />
          </div>
        </div>
      </nav>
      <main className="container py-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/rankings" element={<Rankings />} />
          <Route path="/players" element={<Players />} />
          <Route path="/players/:id" element={<Player />} />
          <Route path="/matches" element={<Matches />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      </div>
  )
}
