# SCElo (SC6 Glicko-2 Rankings)

React + TypeScript + Vite app using Tailwind and shadcn-style components. Supabase powers auth and data. The site is deployed to GitHub Pages and uses hash routing.

## Tech
- Vite + React + TypeScript
- Tailwind CSS + shadcn/ui (base components)
- Supabase (auth + database)
- React Router (HashRouter)

## Prerequisites
- Node 18+ and PNPM installed
- A Supabase project with GitHub OAuth enabled (if you plan to sign in)

## Setup
1) Install dependencies
```sh
pnpm install
```

2) Create a `.env` from the example and fill in Supabase values
```env
# .env
VITE_SUPABASE_URL=your-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

3) Run the dev server
```sh
pnpm dev
```

Notes
## Local Supabase (optional)
To run the app against a local Supabase stack on Windows:

Prereqs
- Docker Desktop running
- Supabase CLI installed: https://supabase.com/docs/guides/cli

Initialize once (creates `supabase/config.toml`):
```powershell
- Auth redirect: In Supabase Auth settings, add the redirect URL for GitHub Pages, for example:
```

Start the local stack:
```powershell
  - https://fottensc.github.io/SCElo/
```
If you see "Could not connect to local Supabase project. Make sure you've run 'supabase start'!", ensure Docker is running and that `supabase/config.toml` exists in the project root. If missing, run `supabase init` again in the repo root.

Set Vite env vars to point to local services:
```powershell
- The app uses `HashRouter`, so no extra path segments are required.

## Build
```

Apply schema and seed (from this repo):
```powershell
```sh
pnpm build
```
```

Open Studio: http://localhost:54323

Stop the stack when done:
```powershell
Outputs to `dist/`.
```


## Deploy to GitHub Pages
Two convenient options:

1) Local one-off deploy
- Ensure `vite.config.ts` uses `base: '/SCElo/'` (this repo name)
- Publish the built site to the `gh-pages` branch
```sh
pnpm deploy
```

2) CI deploy on push to main
- Add repository secrets in GitHub: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Push to `main`; the workflow in `.github/workflows/deploy.yml` builds and deploys to Pages

## Scripts
- `pnpm dev` – start dev server
- `pnpm build` – typecheck and build
- `pnpm preview` – preview production build
- `pnpm lint` – run ESLint
- `pnpm format` – run Prettier
- `pnpm deploy` – build and publish `dist/` to `gh-pages`

## Environment & security
- `.env`, `.env.local`, and `.env.*` files are git-ignored. Do not commit secrets.
- In CI, Vite env vars are provided via repository Secrets and injected at build time.