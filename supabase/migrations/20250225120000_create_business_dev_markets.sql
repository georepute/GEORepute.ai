-- Business Development Markets
-- Stores target market configurations and AI-generated strategies per user/project
create table if not exists business_dev_markets (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users not null,
  project_id    text,
  country       text not null,
  country_code  text not null,
  country_flag  text not null,
  region        text not null default '',
  language      text not null,
  language_name text not null,
  strategy      jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table business_dev_markets enable row level security;

create policy "business_dev_markets_select" on business_dev_markets
  for select using (auth.uid() = user_id);

create policy "business_dev_markets_insert" on business_dev_markets
  for insert with check (auth.uid() = user_id);

create policy "business_dev_markets_update" on business_dev_markets
  for update using (auth.uid() = user_id);

create policy "business_dev_markets_delete" on business_dev_markets
  for delete using (auth.uid() = user_id);

create index if not exists business_dev_markets_user_project_idx
  on business_dev_markets (user_id, project_id);
