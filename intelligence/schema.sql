-- Optional schema for a dedicated Supabase research project only.
-- Never run this against MailMyPDF or another application database.
create table if not exists public.intelligence_runs (
 id text primary key,
 generated_at timestamptz not null,
 assessment jsonb not null,
 counts jsonb not null,
 source_status jsonb not null,
 agent_status jsonb not null
);
create table if not exists public.intelligence_observations (
 id text primary key,
 run_id text not null references public.intelligence_runs(id),
 domain text not null,
 source text not null,
 url text not null,
 title text not null,
 published_at timestamptz,
 verification text not null,
 payload jsonb not null
);
create index if not exists ix_intel_obs_date on public.intelligence_observations(published_at desc);
alter table public.intelligence_runs enable row level security;
alter table public.intelligence_observations enable row level security;
revoke all on public.intelligence_runs from anon, authenticated;
revoke all on public.intelligence_observations from anon, authenticated;
grant select, insert, update on public.intelligence_runs to service_role;
grant select, insert, update on public.intelligence_observations to service_role;
-- No anonymous or authenticated client policies; server-only writes.
