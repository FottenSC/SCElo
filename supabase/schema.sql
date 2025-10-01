-- Supabase schema for SCElo app
-- Creates players and matches tables with RLS policies

-- Extensions (uuid generation)
create extension if not exists "pgcrypto";

-- Players table
create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

-- Matches table
-- Note: "at" is stored as milliseconds since epoch (bigint) to match the app's TypeScript type
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  "aId" uuid not null references public.players(id) on delete cascade,
  "bId" uuid not null references public.players(id) on delete cascade,
  "winnerId" uuid not null references public.players(id) on delete cascade,
  at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  constraint winner_must_be_participant check ("winnerId" = "aId" or "winnerId" = "bId"),
  constraint a_b_distinct check ("aId" <> "bId")
);

-- Indexes
create index if not exists idx_matches_at_desc on public.matches (at desc);
create index if not exists idx_matches_a_id on public.matches ("aId");
create index if not exists idx_matches_b_id on public.matches ("bId");

-- Row Level Security (RLS)
alter table public.players enable row level security;
alter table public.matches enable row level security;

-- Policies: public read, authenticated write
do $$
begin
  create policy "Public read players" on public.players
    for select using (true);
exception when duplicate_object then null; end $$;

do $$
begin
  create policy "Auth manage players" on public.players
    for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;

do $$
begin
  create policy "Public read matches" on public.matches
    for select using (true);
exception when duplicate_object then null; end $$;

do $$
begin
  create policy "Auth manage matches" on public.matches
    for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
