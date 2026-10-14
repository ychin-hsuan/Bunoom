-- Run this in Supabase SQL Editor before using cloud progress sync.
create table if not exists public.passage_progress (
  user_id uuid references auth.users(id) on delete cascade not null,
  passage_id text not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, passage_id)
);

create table if not exists public.daily_completions (
  user_id uuid references auth.users(id) on delete cascade not null,
  completion_date date not null,
  passages_completed integer not null default 0,
  primary key (user_id, completion_date)
);

alter table public.passage_progress enable row level security;
alter table public.daily_completions enable row level security;

create policy "Users can read their passage progress" on public.passage_progress for select using (auth.uid() = user_id);
create policy "Users can create their passage progress" on public.passage_progress for insert with check (auth.uid() = user_id);
create policy "Users can update their passage progress" on public.passage_progress for update using (auth.uid() = user_id);
create policy "Users can read their daily completions" on public.daily_completions for select using (auth.uid() = user_id);
create policy "Users can create their daily completions" on public.daily_completions for insert with check (auth.uid() = user_id);
create policy "Users can update their daily completions" on public.daily_completions for update using (auth.uid() = user_id);
