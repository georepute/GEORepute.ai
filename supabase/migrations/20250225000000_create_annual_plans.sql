-- Annual Strategic Plans storage
-- One plan per (user, project) — upsert on regenerate
create table if not exists annual_plans (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users not null,
  project_id    text not null,
  plan_data     jsonb not null,
  generated_at  timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, project_id)
);

alter table annual_plans enable row level security;

create policy "annual_plans_select" on annual_plans
  for select using (auth.uid() = user_id);

create policy "annual_plans_insert" on annual_plans
  for insert with check (auth.uid() = user_id);

create policy "annual_plans_update" on annual_plans
  for update using (auth.uid() = user_id);

create policy "annual_plans_delete" on annual_plans
  for delete using (auth.uid() = user_id);

create index if not exists annual_plans_user_project_idx
  on annual_plans (user_id, project_id);
