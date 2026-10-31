-- profiles (note: the original prompt had a "full_text" typo; this is full_name)
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  created_at timestamptz default now()
);

create table if not exists phase_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  phase_id int not null,
  status text not null default 'locked' check (status in ('locked','in_progress','completed')),
  test_score numeric,
  attempts int default 0,
  completed_at timestamptz,
  unique (user_id, phase_id)
);

create table if not exists test_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  phase_id int not null,
  answers jsonb,
  score numeric,
  passed boolean,
  attempted_at timestamptz default now()
);

-- Row Level Security: each user sees and writes only their own rows
alter table profiles enable row level security;
alter table phase_progress enable row level security;
alter table test_attempts enable row level security;

create policy "own profile" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own progress" on phase_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own attempts" on test_attempts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Auto-create a profile on sign-up
create or replace function handle_new_user() returns trigger as $$
begin
  insert into profiles (id, full_name) values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end; $$ language plpgsql security definer;
create or replace trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();
