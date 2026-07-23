-- TPL Studio AI: base desacoplada del proveedor de inteligencia artificial.
create table if not exists public.marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  project_id uuid,
  partner_id uuid,
  name text not null,
  project_type text not null default 'parcela_casa',
  source_data jsonb not null default '{}'::jsonb,
  tone text,
  audience text,
  status text not null default 'draft' check (status in ('draft','prepared','queued','processing','completed','failed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.marketing_storyboards (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.marketing_campaigns(id) on delete cascade,
  version integer not null default 1,
  scenes jsonb not null default '[]'::jsonb,
  narration text,
  music_direction text,
  duration_seconds integer not null default 30,
  created_at timestamptz not null default now(),
  unique(campaign_id,version)
);

create table if not exists public.marketing_assets (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.marketing_campaigns(id) on delete cascade,
  asset_type text not null,
  format text,
  status text not null default 'prepared',
  provider text,
  provider_job_id text,
  source_url text,
  output_url text,
  prompt jsonb not null default '{}'::jsonb,
  estimated_cost numeric(12,2),
  actual_cost numeric(12,2),
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.marketing_render_queue (
  id bigint generated always as identity primary key,
  asset_id uuid not null references public.marketing_assets(id) on delete cascade,
  priority smallint not null default 5,
  status text not null default 'pending' check (status in ('pending','reserved','processing','completed','failed','cancelled')),
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  created_at timestamptz not null default now()
);

create index if not exists idx_marketing_campaigns_status on public.marketing_campaigns(status,created_at desc);
create index if not exists idx_marketing_assets_campaign on public.marketing_assets(campaign_id,status);
create index if not exists idx_marketing_render_queue_ready on public.marketing_render_queue(status,priority,available_at);

alter table public.marketing_campaigns enable row level security;
alter table public.marketing_storyboards enable row level security;
alter table public.marketing_assets enable row level security;
alter table public.marketing_render_queue enable row level security;

create policy "owners read campaigns" on public.marketing_campaigns for select using (owner_id = auth.uid() or public.es_admin());
create policy "owners create campaigns" on public.marketing_campaigns for insert with check (owner_id = auth.uid() or public.es_admin());
create policy "owners update campaigns" on public.marketing_campaigns for update using (owner_id = auth.uid() or public.es_admin());
create policy "campaign members read storyboards" on public.marketing_storyboards for select using (exists(select 1 from public.marketing_campaigns c where c.id=campaign_id and (c.owner_id=auth.uid() or public.es_admin())));
create policy "campaign members manage storyboards" on public.marketing_storyboards for all using (exists(select 1 from public.marketing_campaigns c where c.id=campaign_id and (c.owner_id=auth.uid() or public.es_admin()))) with check (exists(select 1 from public.marketing_campaigns c where c.id=campaign_id and (c.owner_id=auth.uid() or public.es_admin())));
create policy "campaign members read assets" on public.marketing_assets for select using (exists(select 1 from public.marketing_campaigns c where c.id=campaign_id and (c.owner_id=auth.uid() or public.es_admin())));
create policy "campaign members manage assets" on public.marketing_assets for all using (exists(select 1 from public.marketing_campaigns c where c.id=campaign_id and (c.owner_id=auth.uid() or public.es_admin()))) with check (exists(select 1 from public.marketing_campaigns c where c.id=campaign_id and (c.owner_id=auth.uid() or public.es_admin())));
create policy "admins manage render queue" on public.marketing_render_queue for all using (public.es_admin()) with check (public.es_admin());
