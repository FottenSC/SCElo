-- Seed sample data (optional)
insert into public.players (name)
values ('Alice'), ('Bob'), ('Charlie')
on conflict (name) do nothing;

-- Create a couple of matches between existing players
with p as (
  select
    (select id from public.players where name = 'Alice') as alice,
    (select id from public.players where name = 'Bob') as bob,
    (select id from public.players where name = 'Charlie') as charlie
)
insert into public.matches ("aId", "bId", "winnerId", at)
select p.alice, p.bob, p.alice, (extract(epoch from now()) * 1000)::bigint from p
union all
select p.bob, p.charlie, p.charlie, (extract(epoch from now()) * 1000)::bigint from p
on conflict do nothing;
