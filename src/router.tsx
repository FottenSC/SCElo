import { createRouter, createRoute, createRootRoute } from '@tanstack/react-router'
import App from './pages/App'
import Rankings from './pages/Rankings'
import Matches from './pages/Matches'
import Events from './pages/Events'
import SingleEvent from './pages/SingleEvent'
import Profile from './pages/Profile'
import Player from './pages/Player'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import Admin from './pages/Admin'
import { UpcomingMatches } from './pages/UpcomingMatches'

// Define the root route
const rootRoute = createRootRoute({
  component: App,
  notFoundComponent: NotFound,
})

// Define children routes
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: UpcomingMatches,
})

const upcomingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/upcoming',
  component: UpcomingMatches,
})

const rankingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/rankings',
  component: Rankings,
})

const playersRedirectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/players',
  component: () => <div />, // Will redirect in beforeLoad or just be a shell, but using redirect in beforeLoad is better
  beforeLoad: () => {
    throw { redirect: { to: '/rankings', replace: true } } // Tanstack router redirect
  }
})

const playerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/players/$id',
  component: Player,
})

const matchesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/matches',
  component: Matches,
})

const eventsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/events',
  component: Events,
})

const eventRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/events/$id',
  component: SingleEvent,
})

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  component: Profile,
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: Login,
})

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  component: Admin,
})

// Create the route tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  upcomingRoute,
  rankingsRoute,
  playersRedirectRoute,
  playerRoute,
  matchesRoute,
  eventsRoute,
  eventRoute,
  profileRoute,
  loginRoute,
  adminRoute,
])

// Create the router
export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
})

// Register the router for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
