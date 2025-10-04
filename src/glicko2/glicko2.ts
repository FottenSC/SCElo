// Minimal Glicko-2 implementation for player updates
// Based on Glickman (2012). This is a pragmatic implementation suitable for client use.

export type Rating = {
  rating: number // mu scaled to 1500 mean / 173.7178 scale
  rd: number // rating deviation
  vol: number // volatility
}

export type Match = {
  opponent: Rating
  score: 0 | 0.5 | 1
}

const TAU = 0.5
const SCALE = 173.7178
const MU0 = 1500

function toMu(r: number) {
  return (r - MU0) / SCALE
}
function toR(mu: number) {
  return mu * SCALE + MU0
}

function g(phi: number) {
  return 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI))
}

function E(mu: number, mu_j: number, phi_j: number) {
  return 1 / (1 + Math.exp(-g(phi_j) * (mu - mu_j)))
}

export function rate(current: Rating, matches: Match[]): Rating {
  if (matches.length === 0) return current

  // Convert to Glicko-2 scale
  const mu = toMu(current.rating)
  const phi = current.rd / SCALE
  let sigma = current.vol

  let vInv = 0
  let deltaSum = 0

  for (const m of matches) {
    const mu_j = toMu(m.opponent.rating)
    const phi_j = m.opponent.rd / SCALE
    const E_ = E(mu, mu_j, phi_j)
    const g_ = g(phi_j)
    vInv += g_ * g_ * E_ * (1 - E_)
    deltaSum += g_ * (m.score - E_)
  }

  const v = 1 / vInv
  const delta = v * deltaSum

  // Iterative solve for new volatility sigma'
  const a = Math.log(sigma * sigma)
  let A = a
  let B: number
  if (delta * delta > phi * phi + v) {
    B = Math.log(delta * delta - phi * phi - v)
  } else {
    let k = 1
    const MAX_K = 1000 // Prevent infinite loop when searching for B
    while (f(a - k * TAU, delta, phi, v, a) < 0 && k < MAX_K) k++
    if (k >= MAX_K) {
      console.error(`❌ Glicko-2 convergence failure: Could not find initial B value`, {
        currentRating: current.rating,
        currentRd: current.rd,
        currentVol: current.vol,
        matchCount: matches.length,
        delta,
        phi,
        v
      })
      throw new Error(`Glicko-2 failed to converge: couldn't find initial B value for rating ${current.rating}`)
    }
    B = a - k * TAU
  }

  let fA = f(A, delta, phi, v, a)
  let fB = f(B, delta, phi, v, a)

  // Add iteration limit to prevent infinite loops
  let iterations = 0
  const MAX_ITERATIONS = 100

  while (Math.abs(B - A) > 1e-6 && iterations < MAX_ITERATIONS) {
    const C = A + ((A - B) * fA) / (fB - fA)
    const fC = f(C, delta, phi, v, a)
    if (fC * fB < 0) {
      A = B
      fA = fB
    } else {
      fA /= 2
    }
    B = C
    fB = fC
    iterations++
  }

  if (iterations >= MAX_ITERATIONS) {
    console.error(`❌ Glicko-2 convergence failure: Reached max iterations`, {
      currentRating: current.rating,
      currentRd: current.rd,
      currentVol: current.vol,
      matchCount: matches.length,
      opponentRatings: matches.map(m => m.opponent.rating),
      finalConvergenceGap: Math.abs(B - A),
      iterations,
      A,
      B
    })
    throw new Error(`Glicko-2 failed to converge after ${MAX_ITERATIONS} iterations for rating ${current.rating}`)
  }

  const sigmaPrime = Math.exp(A / 2)

  // New rating deviation
  const phiStar = Math.sqrt(phi * phi + sigmaPrime * sigmaPrime)
  const phiPrime = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v)

  // New rating
  const muPrime = mu + phiPrime * phiPrime * deltaSum

  const result = {
    rating: toR(muPrime),
    rd: phiPrime * SCALE,
    vol: sigmaPrime,
  }

  // Validate results
  if (!isFinite(result.rating) || !isFinite(result.rd) || !isFinite(result.vol)) {
    console.error('❌ Invalid Glicko-2 result: NaN or Infinity detected', {
      result,
      current,
      matchCount: matches.length,
      matches: matches.map(m => ({ opponent: m.opponent.rating, score: m.score })),
      intermediateValues: { mu, phi, sigma, v, delta, sigmaPrime, phiStar, phiPrime, muPrime }
    })
    throw new Error(`Glicko-2 produced invalid result: rating=${result.rating}, rd=${result.rd}, vol=${result.vol}`)
  }

  return result
}

function f(x: number, delta: number, phi: number, v: number, a: number) {
  const ex = Math.exp(x)
  const num = ex * (delta * delta - phi * phi - v - ex)
  const den = 2 * (phi * phi + v + ex) * (phi * phi + v + ex)
  return num / den - (x - a) / (TAU * TAU)
}
