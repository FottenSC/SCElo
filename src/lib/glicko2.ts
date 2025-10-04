// Minimal Glicko-2 implementation for rating updates
// Based on Glickman's paper with common defaults

export type Rating = {
  rating: number // mu in rating points (default 1500)
  rd: number // rating deviation (default 350)
  vol: number // volatility (default 0.06)
}

const DEFAULT: Rating = { rating: 1500, rd: 350, vol: 0.06 }

const TAU = 0.5
const SCALE = 173.7178 // to convert between rating scale and Glicko scale

function g(phi: number) {
  return 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI))
}

function E(mu: number, mu_j: number, g_phi: number) {
  return 1 / (1 + Math.exp(-g_phi * (mu - mu_j)))
}

// Convert to Glicko scale
function toG(r: Rating) {
  return { mu: (r.rating - 1500) / SCALE, phi: r.rd / SCALE, sigma: r.vol }
}
// Convert back to rating scale
function fromG(mu: number, phi: number, sigma: number): Rating {
  return { rating: mu * SCALE + 1500, rd: phi * SCALE, vol: sigma }
}

export function update(player: Rating, results: Array<{ opponent: Rating; score: 0 | 0.5 | 1 }>): Rating {
  if (results.length === 0) return player

  const { mu, phi, sigma } = toG(player)
  const v_inv = results.reduce((sum, r) => {
    const opp = toG(r.opponent)
    const gphi = g(opp.phi)
    const e = E(mu, opp.mu, gphi)
    return sum + gphi * gphi * e * (1 - e)
  }, 0)
  const v = 1 / v_inv

  const delta = v * results.reduce((sum, r) => {
    const opp = toG(r.opponent)
    const gphi = g(opp.phi)
    const e = E(mu, opp.mu, gphi)
    return sum + gphi * (r.score - e)
  }, 0)

  // Volatility update via iterative algorithm (Newton–Raphson)
  const a = Math.log(sigma * sigma)
  const eps = 1e-6
  let A = a
  let B: number
  if (delta * delta > phi * phi + v) {
    B = Math.log(Math.max(delta * delta - phi * phi - v, eps))
  } else {
    let k = 1
    const MAX_K = 1000
    while (f(a - k * TAU, delta, phi, v, a) < 0 && k < MAX_K) k++
    if (k >= MAX_K) {
      // Fail safe: return unchanged rating to avoid infinite loop
      return player
    }
    B = a - k * TAU
  }
  let fA = f(A, delta, phi, v, a)
  let fB = f(B, delta, phi, v, a)
  let iterations = 0
  const MAX_ITERATIONS = 100
  while (Math.abs(B - A) > eps && iterations < MAX_ITERATIONS) {
    const C = A + ((A - B) * fA) / (fB - fA)
    const fC = f(C, delta, phi, v, a)
    if (fC * fB < 0) {
      A = B
      fA = fB
    } else {
      // Illinois method safeguard
      fA /= 2
    }
    B = C
    fB = fC
    iterations++
  }
  if (iterations >= MAX_ITERATIONS || !isFinite(A)) {
    return player
  }
  const newSigma = Math.exp(A / 2)

  const phiStar = Math.sqrt(phi * phi + newSigma * newSigma)
  const phiNew = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v)
  const muNew = mu + phiNew * phiNew * results.reduce((sum, r) => {
    const opp = toG(r.opponent)
    const gphi = g(opp.phi)
    const e = E(mu, opp.mu, gphi)
    return sum + gphi * (r.score - e)
  }, 0)

  const next = fromG(muNew, phiNew, newSigma)
  if (!isFinite(next.rating) || !isFinite(next.rd) || !isFinite(next.vol)) {
    return player
  }
  return next
}

function f(x: number, delta: number, phi: number, v: number, a: number) {
  const ex = Math.exp(x)
  const num = ex * (delta * delta - phi * phi - v - ex)
  const den = 2 * (phi * phi + v + ex) * (phi * phi + v + ex)
  return (num / den) - (x - a) / (TAU * TAU)
}

export function defaultRating(): Rating {
  return { ...DEFAULT }
}
