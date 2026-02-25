-- Competitor Research
-- Stores competitor domains, AI-generated competitive analysis, and action plans per user/project
create table if not exists competitor_research (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users not null,
  project_id    text not null,
  competitors   jsonb not null default '[]',  -- array of {domain, analysis} objects
  action_plans  jsonb,                         -- generated action plans from competitive research
  summary       text,
  generated_at  timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, project_id)
);

alter table competitor_research enable row level security;

create policy "competitor_research_select" on competitor_research
  for select using (auth.uid() = user_id);

create policy "competitor_research_insert" on competitor_research
  for insert with check (auth.uid() = user_id);

create policy "competitor_research_update" on competitor_research
  for update using (auth.uid() = user_id);

create policy "competitor_research_delete" on competitor_research
  for delete using (auth.uid() = user_id);

create index if not exists competitor_research_user_project_idx
  on competitor_research (user_id, project_id);
