-- Run this in Supabase → SQL Editor → New Query → Run

-- User profiles (one per user)
create table profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  name text not null,
  goal text not null,
  diet text not null,
  sleep text not null,
  activity text not null,
  conditions text,
  start_date date not null default current_date,
  created_at timestamptz default now()
);

-- Habits (3 per user, generated from their goal)
create table habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  badge text not null default 'start', -- start | reduce | continue
  streak int not null default 0,
  created_at timestamptz default now()
);

-- Daily habit completions
create table habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid references habits(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  completed_date date not null default current_date,
  unique(habit_id, completed_date)
);

-- Daily metrics (one row per user per day)
create table daily_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null default current_date,
  steps int not null default 0,
  water int not null default 0,
  sleep_hours numeric(4,1) not null default 0,
  breakfast boolean not null default false,
  lunch boolean not null default false,
  dinner boolean not null default false,
  unique(user_id, date)
);

-- Chat history (rolling last 40 messages per user)
create table chat_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null, -- user | assistant
  content text not null,
  created_at timestamptz default now()
);

-- Row Level Security: users can only see their own data
alter table profiles enable row level security;
alter table habits enable row level security;
alter table habit_logs enable row level security;
alter table daily_metrics enable row level security;
alter table chat_history enable row level security;

create policy "own profiles" on profiles for all using (auth.uid() = user_id);
create policy "own habits" on habits for all using (auth.uid() = user_id);
create policy "own habit_logs" on habit_logs for all using (auth.uid() = user_id);
create policy "own daily_metrics" on daily_metrics for all using (auth.uid() = user_id);
create policy "own chat_history" on chat_history for all using (auth.uid() = user_id);
