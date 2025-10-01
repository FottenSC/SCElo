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
export default function App() {
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
            <NavLink to="/login" className={({ isActive }) => isActive ? 'text-primary' : ''}>Login</NavLink>
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
